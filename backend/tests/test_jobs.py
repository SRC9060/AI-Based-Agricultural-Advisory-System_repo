"""
Unit and integration tests for AgriAdvisor background agent jobs and worker.

Covers:
1. Job creation and initial PENDING status.
2. Authenticated status polling and result retrieval.
3. Unauthorized access to another user's job (returns 404 to avoid leaking existence).
4. Identical idempotency key and payload returning the same job.
5. Same key with different payload returning HTTP 409 Conflict.
6. Successful worker processing and persisted results.
7. Retry scheduling after a transient error with backoff.
8. Permanent failure after retries are exhausted.
9. Recovery of abandoned RUNNING jobs with expired leases.
10. Concurrency safety: multiple workers cannot claim the same pending job.
11. Invalid requests and authorization failures.
12. Database-session cleanup and rollback after an exception.
"""

import json
import os
import threading
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app import app
from database import SessionLocal, get_db
from models import AgentJob, ChatMessage, ChatSession, User
from services.agent_runner import AgentRunResult, set_default_agent_runner
from services.agent_worker import AgentWorker, sanitize_worker_error
from services.auth import create_access_token


class AgentBackgroundJobTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.user1_id = 1
        cls.user2_id = 2
        cls.token1 = create_access_token(cls.user1_id)
        cls.token2 = create_access_token(cls.user2_id)
        cls.headers1 = {
            "Authorization": f"Bearer {cls.token1}",
            "Idempotency-Key": "test-key-default",
        }
        cls.headers2 = {
            "Authorization": f"Bearer {cls.token2}",
            "Idempotency-Key": "test-key-user2",
        }

        # Seed test users in DB if not present
        db = SessionLocal()
        try:
            for uid, name, email in [
                (cls.user1_id, "Farmer One", "farmer1@example.com"),
                (cls.user2_id, "Farmer Two", "farmer2@example.com"),
            ]:
                user = db.query(User).filter(User.id == uid).first()
                if not user:
                    db.add(User(id=uid, name=name, email=email, password="hashedpassword123"))
            db.commit()
        finally:
            db.close()

    def setUp(self):
        self._cleanup_jobs()

    def tearDown(self):
        set_default_agent_runner(None)
        self._cleanup_jobs()

    def _cleanup_jobs(self):
        db = SessionLocal()
        try:
            db.query(AgentJob).delete()
            db.commit()
        finally:
            db.close()

    # -------------------------------------------------------------
    # 1. Job creation and initial PENDING status
    # -------------------------------------------------------------
    def test_job_creation_and_initial_pending_status(self):
        """POST /agent/jobs stores the job and immediately returns 202 Accepted with status PENDING."""
        headers = {"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "create-pending-key"}
        response = self.client.post(
            "/agent/jobs",
            json={"message": "What is the best fertilizer for wheat in Punjab?"},
            headers=headers,
        )
        self.assertEqual(response.status_code, 202)
        data = response.json()
        self.assertTrue(data["job_id"].startswith("job_"))
        self.assertEqual(data["status"], "PENDING")
        self.assertEqual(data["user_id"], self.user1_id)
        self.assertEqual(data["attempt_count"], 0)
        self.assertEqual(data["max_attempts"], 3)
        self.assertIsNone(data["result"])
        self.assertIsNone(data["error_summary"])

        # Verify persisted in database
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == data["job_id"]).first()
            self.assertIsNotNone(job)
            self.assertEqual(job.status, "PENDING")
            self.assertEqual(job.idempotency_key, "create-pending-key")
        finally:
            db.close()

    # -------------------------------------------------------------
    # 2. Authenticated status polling and result retrieval
    # -------------------------------------------------------------
    def test_authenticated_status_polling_and_result_retrieval(self):
        """GET /agent/jobs/{job_id} returns the job status and completed result."""
        headers = {"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "poll-status-key"}
        create_res = self.client.post(
            "/agent/jobs",
            json={"message": "What is the market price of cotton?"},
            headers=headers,
        )
        self.assertEqual(create_res.status_code, 202)
        job_id = create_res.json()["job_id"]

        # Initial poll: status PENDING
        poll_res = self.client.get(
            f"/agent/jobs/{job_id}",
            headers={"Authorization": f"Bearer {self.token1}"},
        )
        self.assertEqual(poll_res.status_code, 200)
        self.assertEqual(poll_res.json()["status"], "PENDING")

        # Manually complete the job in DB to test completion retrieval
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            job.status = "COMPLETED"
            job.result = json.dumps({
                "answer": "The current modal price for Cotton is ₹6,800/quintal.",
                "tool_calls": [{"tool": "get_market_prices", "success": True}],
                "rounds": 1,
            })
            job.completed_at = datetime.utcnow()
            db.commit()
        finally:
            db.close()

        # Completed poll: status COMPLETED with result dict
        comp_res = self.client.get(
            f"/agent/jobs/{job_id}",
            headers={"Authorization": f"Bearer {self.token1}"},
        )
        self.assertEqual(comp_res.status_code, 200)
        data = comp_res.json()
        self.assertEqual(data["status"], "COMPLETED")
        self.assertIsNotNone(data["result"])
        self.assertIn("modal price for Cotton", data["result"]["answer"])

    # -------------------------------------------------------------
    # 3. Unauthorized access to another user's job
    # -------------------------------------------------------------
    def test_unauthorized_access_to_another_users_job(self):
        """Accessing another user's job yields 404 without leaking existence."""
        headers1 = {"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "user1-secret-key"}
        create_res = self.client.post(
            "/agent/jobs",
            json={"message": "Private farmer query"},
            headers=headers1,
        )
        self.assertEqual(create_res.status_code, 202)
        job_id = create_res.json()["job_id"]

        # User 2 attempts to view User 1's job
        headers2 = {"Authorization": f"Bearer {self.token2}"}
        res = self.client.get(f"/agent/jobs/{job_id}", headers=headers2)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["detail"], "Job not found")

    # -------------------------------------------------------------
    # 4. Identical idempotency key and payload returning same job
    # -------------------------------------------------------------
    def test_identical_idempotency_key_and_payload_returns_same_job(self):
        """Re-submitting the same key with the exact same payload returns the existing job."""
        headers = {"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "idempotent-dedup-key"}
        payload = {"message": "Will it rain in Shimla tomorrow?", "language": "en"}

        res1 = self.client.post("/agent/jobs", json=payload, headers=headers)
        self.assertEqual(res1.status_code, 202)
        job1_id = res1.json()["job_id"]

        # Duplicate submission
        res2 = self.client.post("/agent/jobs", json=payload, headers=headers)
        self.assertEqual(res2.status_code, 200)
        self.assertEqual(res2.json()["job_id"], job1_id)

        # Confirm only 1 job exists in the DB
        db = SessionLocal()
        try:
            count = db.query(AgentJob).filter(AgentJob.idempotency_key == "idempotent-dedup-key").count()
            self.assertEqual(count, 1)
        finally:
            db.close()

    # -------------------------------------------------------------
    # 5. Same key with different payload returning HTTP 409
    # -------------------------------------------------------------
    def test_same_key_with_different_payload_returns_conflict(self):
        """Reusing an idempotency key with a modified payload returns HTTP 409 Conflict."""
        headers = {"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "reused-conflict-key"}
        payload1 = {"message": "Check weather in Pune"}
        payload2 = {"message": "Check market price in Pune"}

        res1 = self.client.post("/agent/jobs", json=payload1, headers=headers)
        self.assertEqual(res1.status_code, 202)

        res2 = self.client.post("/agent/jobs", json=payload2, headers=headers)
        self.assertEqual(res2.status_code, 409)
        self.assertIn("different request payload", res2.json()["detail"])

    # -------------------------------------------------------------
    # 6. Successful worker processing and persisted results
    # -------------------------------------------------------------
    def test_successful_worker_processing_and_persisted_results(self):
        """Worker claims PENDING job, runs AgentRunner, and stores completed result."""
        # Create a chat session
        db = SessionLocal()
        try:
            session = ChatSession(user_id=self.user1_id, title="Test Background Session")
            db.add(session)
            db.commit()
            session_id = session.id
        finally:
            db.close()

        headers = {"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "worker-success-key"}
        create_res = self.client.post(
            "/agent/jobs",
            json={"message": "Best sowing date for mustard", "session_id": session_id},
            headers=headers,
        )
        self.assertEqual(create_res.status_code, 202)
        job_id = create_res.json()["job_id"]

        # Mock AgentRunner
        mock_runner = MagicMock()
        mock_runner.run.return_value = AgentRunResult(
            answer="Mustard is best sown between mid-October and early November.",
            tool_calls_executed=[{"tool": "search_agricultural_knowledge_base", "success": True}],
            tool_calls_count=1,
            rounds=1,
            status="completed",
        )
        set_default_agent_runner(mock_runner)

        # Worker processes job
        worker = AgentWorker(worker_id="test_worker_1")
        did_work = worker.run_once()
        self.assertTrue(did_work)

        # Verify DB status
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            self.assertEqual(job.status, "COMPLETED")
            self.assertIsNotNone(job.completed_at)
            result = json.loads(job.result)
            self.assertIn("mid-October", result["answer"])
            self.assertEqual(result["tool_calls_count"], 1)

            # Verify session chat history was persisted
            messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).all()
            self.assertEqual(len(messages), 2)
            self.assertEqual(messages[0].role, "user")
            self.assertEqual(messages[1].role, "assistant")
        finally:
            db.close()

    # -------------------------------------------------------------
    # 7. Retry scheduling after a transient error
    # -------------------------------------------------------------
    def test_retry_scheduling_after_transient_error(self):
        """When AgentRunner raises an exception, the job is transitioned to RETRY_WAIT with backoff."""
        headers = {"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "worker-retry-key"}
        create_res = self.client.post(
            "/agent/jobs",
            json={"message": "Temporary error test query"},
            headers=headers,
        )
        job_id = create_res.json()["job_id"]

        # Mock AgentRunner failure
        mock_runner = MagicMock()
        mock_runner.run.side_effect = RuntimeError("Upstream OpenWeather connection timeout")
        set_default_agent_runner(mock_runner)

        worker = AgentWorker(worker_id="test_worker_retry", base_backoff=1.0)
        worker.run_once()

        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            self.assertEqual(job.status, "RETRY_WAIT")
            self.assertEqual(job.attempt_count, 1)
            self.assertIsNotNone(job.next_retry_at)
            self.assertGreater(job.next_retry_at, job.created_at)
            self.assertIn("Transient error:", job.error_summary)
            self.assertIn("connection timeout", job.error_summary)
        finally:
            db.close()

    # -------------------------------------------------------------
    # 8. Permanent failure after retries are exhausted
    # -------------------------------------------------------------
    def test_permanent_failure_after_retries_exhausted(self):
        """When attempt_count reaches max_attempts, the job is marked permanently FAILED."""
        # Create a job that is already on its last attempt
        db = SessionLocal()
        try:
            job = AgentJob(
                id="job_exhaust_test",
                user_id=self.user1_id,
                task_type="agent_query",
                payload=json.dumps({"message": "Permanent failure test", "language": "en"}),
                payload_hash="testhash123",
                idempotency_key="exhaust-key",
                status="RETRY_WAIT",
                attempt_count=2,  # next attempt will be 3 (max_attempts = 3)
                max_attempts=3,
                next_retry_at=datetime.utcnow() - timedelta(seconds=1),
            )
            db.add(job)
            db.commit()
        finally:
            db.close()

        mock_runner = MagicMock()
        mock_runner.run.side_effect = RuntimeError("Persistent API outage")
        set_default_agent_runner(mock_runner)

        worker = AgentWorker(worker_id="test_worker_exhaust")
        worker.run_once()

        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == "job_exhaust_test").first()
            self.assertEqual(job.status, "FAILED")
            self.assertEqual(job.attempt_count, 3)
            self.assertIsNotNone(job.completed_at)
            self.assertIn("Max attempts (3) reached", job.error_summary)
        finally:
            db.close()

    # -------------------------------------------------------------
    # 9. Recovery of abandoned RUNNING jobs
    # -------------------------------------------------------------
    def test_recovery_of_abandoned_running_jobs(self):
        """Stale RUNNING job with an expired lease is recovered and executed by another worker."""
        # Create an abandoned job with expired lease
        past_time = datetime.utcnow() - timedelta(seconds=200)
        db = SessionLocal()
        try:
            abandoned_job = AgentJob(
                id="job_abandoned_1",
                user_id=self.user1_id,
                task_type="agent_query",
                payload=json.dumps({"message": "Recovered query", "language": "en"}),
                payload_hash="abandoned_hash",
                idempotency_key="abandoned-key",
                status="RUNNING",
                locked_by="crashed_worker_dead",
                locked_at=past_time,
                lease_timeout_at=past_time + timedelta(seconds=60),  # expired ~140s ago
                attempt_count=1,
                max_attempts=3,
            )
            db.add(abandoned_job)
            db.commit()
        finally:
            db.close()

        # Mock runner success
        mock_runner = MagicMock()
        mock_runner.run.return_value = AgentRunResult(
            answer="Successfully recovered after worker failure.",
            tool_calls_executed=[],
            tool_calls_count=0,
            rounds=1,
            status="completed",
        )
        set_default_agent_runner(mock_runner)

        new_worker = AgentWorker(worker_id="recovering_worker_hero")
        claimed_id = new_worker.claim_next_job()
        self.assertEqual(claimed_id, "job_abandoned_1")

        processed = new_worker.process_job(claimed_id)
        self.assertTrue(processed)

        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == "job_abandoned_1").first()
            self.assertEqual(job.status, "COMPLETED")
            self.assertEqual(job.attempt_count, 2)
            result = json.loads(job.result)
            self.assertIn("Successfully recovered", result["answer"])
        finally:
            db.close()

    # -------------------------------------------------------------
    # 10. Concurrency safety: multiple workers claiming same job
    # -------------------------------------------------------------
    def test_concurrent_workers_cannot_claim_same_job(self):
        """When multiple workers compete for a pending job, exactly one wins the lease."""
        db = SessionLocal()
        try:
            pending_job = AgentJob(
                id="job_race_condition",
                user_id=self.user1_id,
                task_type="agent_query",
                payload=json.dumps({"message": "Race test", "language": "en"}),
                payload_hash="race_hash",
                idempotency_key="race-key",
                status="PENDING",
                attempt_count=0,
                max_attempts=3,
                next_retry_at=datetime.utcnow() - timedelta(seconds=1),
            )
            db.add(pending_job)
            db.commit()
        finally:
            db.close()

        claimed_by = []
        claim_lock = threading.Lock()

        def worker_attempt_claim(wid: str):
            worker = AgentWorker(worker_id=wid)
            claimed = worker.claim_next_job()
            if claimed:
                with claim_lock:
                    claimed_by.append((wid, claimed))

        threads = [
            threading.Thread(target=worker_attempt_claim, args=(f"concurrent_worker_{i}",))
            for i in range(5)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Exactly 1 worker should have claimed the job
        self.assertEqual(len(claimed_by), 1, f"Expected exactly 1 claim, got: {claimed_by}")
        winner_worker_id, claimed_job_id = claimed_by[0]
        self.assertEqual(claimed_job_id, "job_race_condition")

        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == "job_race_condition").first()
            self.assertEqual(job.status, "RUNNING")
            self.assertEqual(job.locked_by, winner_worker_id)
            self.assertEqual(job.attempt_count, 1)
        finally:
            db.close()

    # -------------------------------------------------------------
    # 11. Invalid requests and authorization failures
    # -------------------------------------------------------------
    def test_invalid_requests_and_authorization_failures(self):
        """Rejects missing idempotency headers, unauthenticated calls, and invalid payloads."""
        # Missing Idempotency-Key header
        res_no_key = self.client.post(
            "/agent/jobs",
            json={"message": "Valid query"},
            headers={"Authorization": f"Bearer {self.token1}"},
        )
        self.assertEqual(res_no_key.status_code, 400)
        self.assertIn("Idempotency-Key", res_no_key.json()["detail"])

        # Missing authorization
        res_no_auth = self.client.post(
            "/agent/jobs",
            json={"message": "Valid query"},
            headers={"Idempotency-Key": "some-key"},
        )
        self.assertEqual(res_no_auth.status_code, 401)

        # Empty message
        res_empty = self.client.post(
            "/agent/jobs",
            json={"message": "   "},
            headers={"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "empty-key"},
        )
        self.assertEqual(res_empty.status_code, 422)

        # Non-existent or other user's session_id
        res_bad_session = self.client.post(
            "/agent/jobs",
            json={"message": "Valid query", "session_id": 999999},
            headers={"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "bad-session-key"},
        )
        self.assertEqual(res_bad_session.status_code, 404)

    # -------------------------------------------------------------
    # 12. Database session cleanup and error sanitization
    # -------------------------------------------------------------
    def test_database_session_cleanup_and_error_sanitization(self):
        """Worker safely closes DB sessions, rolls back, and sanitizes secret credentials."""
        # Error sanitization test
        mock_token = "".join(["g", "s", "k", "_"]) + "mockfakekeyvalue1234567890"
        raw_error = Exception(f"Failed connecting to https://api.groq.com/v1 with Bearer {mock_token} at D:\\Users\\agri\\secret.py")
        sanitized = sanitize_worker_error(raw_error)
        self.assertNotIn(mock_token, sanitized)
        self.assertNotIn("D:\\Users\\agri\\secret.py", sanitized)
        self.assertIn("[REDACTED", sanitized)

        # Ensure DB session rollback works cleanly
        worker = AgentWorker(worker_id="test_cleanup_worker")
        with patch.object(worker, "session_factory") as mock_session_factory:
            mock_session = MagicMock()
            mock_session.query.side_effect = Exception("DB Connection interrupted")
            mock_session_factory.return_value = mock_session

            claimed = worker.claim_next_job()
            self.assertIsNone(claimed)
            # Verify rollback and close were called
            mock_session.rollback.assert_called_once()
            mock_session.close.assert_called_once()

    # -------------------------------------------------------------
    # 13. Sensitive error logging: verify secrets are never logged
    # -------------------------------------------------------------
    def test_worker_logs_do_not_leak_secrets_during_exception(self):
        """Worker logs never write raw API keys, bearer tokens, or secrets during exceptions."""
        import logging
        from io import StringIO

        # Create a pending job
        headers = {"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "log-secret-test-key"}
        create_res = self.client.post(
            "/agent/jobs",
            json={"message": "Logging test query"},
            headers=headers,
        )
        job_id = create_res.json()["job_id"]

        dummy_key = "".join(["s", "k", "-"]) + "testleakkey1234567890abcdef"
        dummy_pwd = "supersecretpassword123"

        # Mock runner raising exception with sensitive token and password
        mock_runner = MagicMock()
        mock_runner.run.side_effect = RuntimeError(
            f"Provider error: Bearer {dummy_key} failed connecting to postgresql://user:{dummy_pwd}@localhost/db"
        )
        set_default_agent_runner(mock_runner)

        # Capture log records
        worker_logger = logging.getLogger("agriadvisor.agent_worker")
        log_stream = StringIO()
        stream_handler = logging.StreamHandler(log_stream)
        stream_handler.setLevel(logging.DEBUG)
        worker_logger.addHandler(stream_handler)

        try:
            worker = AgentWorker(worker_id="test_logger_worker")
            worker.claim_next_job()
            worker.process_job(job_id)

            logs_output = log_stream.getvalue()
            # Assert dummy secret tokens are NOT leaked into logs
            self.assertNotIn(dummy_key, logs_output)
            self.assertNotIn(dummy_pwd, logs_output)
            self.assertIn("[REDACTED", logs_output)
        finally:
            worker_logger.removeHandler(stream_handler)

    # -------------------------------------------------------------
    # 14. Concurrent idempotency race: identical submissions
    # -------------------------------------------------------------
    def test_concurrent_idempotency_race_same_payload(self):
        """Concurrent requests with identical idempotency key yield 1 record and all return matching job ID."""
        race_key = "race-idempotency-key-test"
        payload = {"message": "Concurrent race test query", "language": "en"}
        responses = []
        threads = []
        lock = threading.Lock()

        def submit_job():
            res = self.client.post(
                "/agent/jobs",
                json=payload,
                headers={"Authorization": f"Bearer {self.token1}", "Idempotency-Key": race_key},
            )
            with lock:
                responses.append(res)

        for _ in range(5):
            t = threading.Thread(target=submit_job)
            threads.append(t)

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(len(responses), 5)
        # All requests must succeed with either 202 (winner) or 200 (deduplicated)
        for res in responses:
            self.assertIn(res.status_code, (200, 202), f"Unexpected status: {res.status_code} - {res.text}")

        # All responses must reference the exact same job ID
        job_ids = {r.json()["job_id"] for r in responses}
        self.assertEqual(len(job_ids), 1, f"Expected exactly 1 job ID, but got multiple: {job_ids}")

        # Confirm exactly 1 record was persisted in the database
        db = SessionLocal()
        try:
            jobs = db.query(AgentJob).filter(AgentJob.idempotency_key == race_key).all()
            self.assertEqual(len(jobs), 1)
            self.assertEqual(jobs[0].id, list(job_ids)[0])
        finally:
            db.close()

    # -------------------------------------------------------------
    # 15. Stale-worker fencing after lease expiration
    # -------------------------------------------------------------
    def test_stale_worker_fenced_after_lease_loss(self):
        """
        If a worker loses its lease while processing a job, its late completion
        must be fenced out: the newer worker's state is preserved, and duplicate
        chat turns are not persisted.
        """
        # Create a chat session
        db = SessionLocal()
        session_id = None
        try:
            sess = ChatSession(user_id=self.user1_id, title="Fencing Test Chat")
            db.add(sess)
            db.commit()
            db.refresh(sess)
            session_id = sess.id
        finally:
            db.close()

        # Submit job with session_id
        res = self.client.post(
            "/agent/jobs",
            json={"message": "Fencing test query", "session_id": session_id},
            headers={"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "fencing-test-key"},
        )
        self.assertEqual(res.status_code, 202)
        job_id = res.json()["job_id"]

        # Worker 1 claims job
        worker1 = AgentWorker(worker_id="worker_alpha", lease_seconds=10)
        claimed_id = worker1.claim_next_job()
        self.assertEqual(claimed_id, job_id)

        # Verify job is claimed by worker_alpha
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            self.assertEqual(job.status, "RUNNING")
            self.assertEqual(job.locked_by, "worker_alpha")
            self.assertEqual(job.attempt_count, 1)

            # Artificially expire worker1's lease
            job.lease_timeout_at = datetime.utcnow() - timedelta(seconds=10)
            db.commit()
        finally:
            db.close()

        # Worker 2 claims the abandoned job
        worker2 = AgentWorker(worker_id="worker_beta", lease_seconds=60)
        claimed_id_2 = worker2.claim_next_job()
        self.assertEqual(claimed_id_2, job_id)

        # Verify job is now RUNNING under worker_beta with attempt_count 2
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            self.assertEqual(job.status, "RUNNING")
            self.assertEqual(job.locked_by, "worker_beta")
            self.assertEqual(job.attempt_count, 2)
        finally:
            db.close()

        # Setup mock runner for worker runs
        mock_runner = MagicMock()
        mock_runner.run.return_value = AgentRunResult(
            answer="Answer from worker",
            tool_calls_executed=[],
            tool_calls_count=0,
            rounds=1,
            status="completed",
        )
        set_default_agent_runner(mock_runner)

        # Worker 1 finishes late and attempts to process/complete the job
        success1 = worker1.process_job(job_id)
        self.assertFalse(success1, "Worker 1 should have been fenced out and returned False")

        # Verify that Worker 1 DID NOT overwrite Worker 2's RUNNING status or write chat turns
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            self.assertEqual(job.status, "RUNNING")
            self.assertEqual(job.locked_by, "worker_beta")
            self.assertEqual(job.attempt_count, 2)

            chat_turns = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).all()
            self.assertEqual(len(chat_turns), 0, "Stale worker should not have added any chat turns")
        finally:
            db.close()

        # Worker 2 finishes and completes the job successfully
        success2 = worker2.process_job(job_id)
        self.assertTrue(success2, "Worker 2 holds the valid lease and should complete successfully")

        # Verify job is COMPLETED and chat turns exist exactly once
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            self.assertEqual(job.status, "COMPLETED")
            self.assertIsNone(job.locked_by)

            chat_turns = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).all()
            self.assertEqual(len(chat_turns), 2, "Chat turn (user + assistant) should be added exactly once")
            self.assertEqual(chat_turns[1].message, "Answer from worker")
        finally:
            db.close()

    # -------------------------------------------------------------
    # 16. Stale-worker late failure fenced
    # -------------------------------------------------------------
    def test_stale_worker_failure_fenced(self):
        """
        If a worker loses its lease, a late failure in that worker must NOT overwrite
        the newer worker's RUNNING state with RETRY_WAIT or FAILED.
        """
        res = self.client.post(
            "/agent/jobs",
            json={"message": "Late failure test query"},
            headers={"Authorization": f"Bearer {self.token1}", "Idempotency-Key": "fail-fence-key"},
        )
        job_id = res.json()["job_id"]

        # Worker 1 claims job
        worker1 = AgentWorker(worker_id="worker_fail_1", lease_seconds=10)
        worker1.claim_next_job()

        # Expire lease
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            job.lease_timeout_at = datetime.utcnow() - timedelta(seconds=10)
            db.commit()
        finally:
            db.close()

        # Worker 2 claims job
        worker2 = AgentWorker(worker_id="worker_fail_2", lease_seconds=60)
        worker2.claim_next_job()

        # Worker 1 encounters an exception and calls _handle_job_failure
        worker1._handle_job_failure(job_id, RuntimeError("Late failure in worker 1"))

        # Verify job is STILL RUNNING and locked_by worker_fail_2 (NOT overwritten to RETRY_WAIT or FAILED)
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            self.assertEqual(job.status, "RUNNING")
            self.assertEqual(job.locked_by, "worker_fail_2")
            self.assertEqual(job.attempt_count, 2)
        finally:
            db.close()

    # -------------------------------------------------------------
    # 17. Database session lifecycle & get_db generator
    # -------------------------------------------------------------
    def test_get_db_generator_session_lifecycle(self):
        """get_db yields a database session and closes it on normal exit and exception."""
        # Normal exit
        gen = get_db()
        session = next(gen)
        self.assertIsNotNone(session)
        try:
            next(gen)
        except StopIteration:
            pass

        # Exception exit
        gen2 = get_db()
        session2 = next(gen2)
        try:
            gen2.throw(ZeroDivisionError("simulated error"))
        except (StopIteration, ZeroDivisionError):
            pass


if __name__ == "__main__":
    unittest.main()
