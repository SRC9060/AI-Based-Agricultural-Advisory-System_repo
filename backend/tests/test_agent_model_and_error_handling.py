"""
Regression and security test suite for AI Agent model selection,
server-side diagnostics, and background job failure handling.

Verifies:
1. Groq model selection selects 'qwen/qwen3.8-27b' when Groq is configured and no override is present.
2. Configuration priority: AGENT_LLM_MODEL > GROQ_MODEL > Config.GROQ_MODEL > documented fallback.
3. Retired models (e.g. 'llama-3.3-70b-versatile') are rejected and fall back safely to Qwen 3.8.
4. Valid explicit configuration overrides are preserved.
5. Safe server-side diagnostics log provider, model, exception type, HTTP status, and error code,
   while strictly redacting API keys and sensitive credentials.
6. Background job worker marks jobs FAILED when AgentRunner returns status="error"
   with safe error summary, never marking them COMPLETED.
"""

from __future__ import annotations

import io
import json
import logging
import os
import unittest
from unittest.mock import MagicMock, patch

from config import Config
from database import Base, SessionLocal, engine
from models import AgentJob, ChatMessage, ChatSession, User
from services.agent_llm import (
    DEFAULT_GROQ_MODEL,
    RETIRED_GROQ_MODELS,
    AgentLLMResponse,
    OpenAIToolCallingClient,
    _sanitize_diagnostic_text,
    resolve_groq_model,
)
from services.agent_runner import AgentRunResult, set_default_agent_runner
from services.agent_worker import AgentWorker


class AgentModelSelectionTests(unittest.TestCase):
    """Verifies correct Groq model resolution and retirement fencing."""

    def setUp(self):
        self.original_env = dict(os.environ)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.original_env)

    def test_configured_qwen_model_selected_when_groq_used_no_override(self):
        """Configured qwen/qwen3.8-27b model is selected on Groq without explicit override."""
        mock_key = "".join(["g", "s", "k", "_"]) + "testdummyapikey1234567890"
        os.environ["GROQ_API_KEY"] = mock_key
        os.environ["GROQ_MODEL"] = "qwen/qwen3.8-27b"
        os.environ.pop("AGENT_LLM_MODEL", None)
        os.environ.pop("OPENAI_API_KEY", None)

        client = OpenAIToolCallingClient()
        self.assertEqual(client.provider, "groq")
        self.assertEqual(client.model, "qwen/qwen3.8-27b")
        # Ensure it was not replaced with retired Llama model
        self.assertNotIn("llama", client.model.lower())

    def test_groq_model_resolution_from_config_when_env_var_unset(self):
        """Falls back to Config.GROQ_MODEL ('qwen/qwen3.8-27b') when GROQ_MODEL env var is absent."""
        mock_key = "".join(["g", "s", "k", "_"]) + "testdummyapikey1234567890"
        os.environ["GROQ_API_KEY"] = mock_key
        os.environ.pop("AGENT_LLM_MODEL", None)
        os.environ.pop("GROQ_MODEL", None)
        os.environ.pop("OPENAI_API_KEY", None)

        with patch.object(Config, "GROQ_MODEL", "qwen/qwen3.8-27b"):
            client = OpenAIToolCallingClient()
            self.assertEqual(client.provider, "groq")
            self.assertEqual(client.model, "qwen/qwen3.8-27b")

    def test_priority_agent_llm_model_overrides_groq_model(self):
        """AGENT_LLM_MODEL takes priority over GROQ_MODEL and Config.GROQ_MODEL."""
        mock_key = "".join(["g", "s", "k", "_"]) + "testdummyapikey1234567890"
        os.environ["GROQ_API_KEY"] = mock_key
        os.environ["AGENT_LLM_MODEL"] = "qwen/qwen3.8-27b"
        os.environ["GROQ_MODEL"] = "fallback-groq-model"
        os.environ.pop("OPENAI_API_KEY", None)

        model = resolve_groq_model()
        self.assertEqual(model, "qwen/qwen3.8-27b")

    def test_retired_llama_models_rejected_and_fall_back_to_qwen(self):
        """Retired Llama 3.3/3.1 70B models are rejected and fall back to default Qwen 3.8."""
        mock_key = "".join(["g", "s", "k", "_"]) + "testdummyapikey1234567890"
        os.environ["GROQ_API_KEY"] = mock_key
        os.environ.pop("AGENT_LLM_MODEL", None)

        for retired in RETIRED_GROQ_MODELS:
            os.environ["GROQ_MODEL"] = retired
            resolved = resolve_groq_model()
            self.assertEqual(
                resolved,
                DEFAULT_GROQ_MODEL,
                f"Retired model {retired} must fall back to {DEFAULT_GROQ_MODEL}",
            )

    def test_valid_explicit_model_override_preserved(self):
        """Valid explicit model override is preserved when provided."""
        mock_key = "".join(["g", "s", "k", "_"]) + "testdummyapikey1234567890"
        os.environ["GROQ_API_KEY"] = mock_key
        os.environ.pop("AGENT_LLM_MODEL", None)
        os.environ.pop("GROQ_MODEL", None)

        client = OpenAIToolCallingClient(model="custom-valid-agri-model")
        self.assertEqual(client.model, "custom-valid-agri-model")


class AgentDiagnosticsAndSecurityTests(unittest.TestCase):
    """Verifies safe server-side diagnostics and credential redaction during LLM failures."""

    def test_diagnostic_redacts_api_keys_and_tokens(self):
        """Sanitizer strips Groq keys, OpenAI keys, bearer tokens, and paths."""
        dummy_gsk = "".join(["g", "s", "k", "_"]) + ("a" * 24)
        dummy_sk = "".join(["s", "k", "-"]) + ("b" * 24)
        raw = f"Error calling upstream with Bearer {dummy_gsk} and key {dummy_sk} at C:\\secret\\file.py"

        sanitized = _sanitize_diagnostic_text(raw, api_key=dummy_gsk)
        self.assertNotIn(dummy_gsk, sanitized)
        self.assertNotIn(dummy_sk, sanitized)
        self.assertNotIn("C:\\secret\\file.py", sanitized)
        self.assertIn("[REDACTED", sanitized)

    def test_safe_server_side_diagnostics_logged_on_api_failure(self):
        """Safe server-side diagnostics log provider, model, status_code, and upstream code."""
        dummy_key = "".join(["g", "s", "k", "_"]) + "livekey1234567890123456"
        client = OpenAIToolCallingClient(
            api_key=dummy_key,
            base_url="https://api.groq.com/openai/v1",
            model="qwen/qwen3.8-27b",
        )
        client.provider = "groq"

        # Mock OpenAI chat completion to raise an API error with status_code and code
        mock_api_error = Exception(f"Model decommissioned: authorization failed for Bearer {dummy_key}")
        mock_api_error.status_code = 400
        mock_api_error.code = "model_decommissioned"

        mock_openai_instance = MagicMock()
        mock_openai_instance.chat.completions.create.side_effect = mock_api_error
        client._client = mock_openai_instance

        # Capture log output
        log_stream = io.StringIO()
        agent_logger = logging.getLogger("agriadvisor.agent_llm")
        handler = logging.StreamHandler(log_stream)
        handler.setLevel(logging.DEBUG)
        agent_logger.addHandler(handler)

        try:
            with self.assertRaises(RuntimeError) as ctx:
                client.chat_completion([{"role": "user", "content": "Hello"}])

            err_msg = str(ctx.exception)
            # Verify exception details
            self.assertIn("groq/qwen/qwen3.8-27b", err_msg)
            self.assertIn("HTTP 400", err_msg)
            self.assertIn("code=model_decommissioned", err_msg)
            self.assertNotIn(dummy_key, err_msg)

            # Verify server-side log output
            logged = log_stream.getvalue()
            self.assertIn("provider=groq", logged)
            self.assertIn("model=qwen/qwen3.8-27b", logged)
            self.assertIn("status_code=400", logged)
            self.assertIn("code=model_decommissioned", logged)
            self.assertNotIn(dummy_key, logged)
            self.assertIn("[REDACTED", logged)
        finally:
            agent_logger.removeHandler(handler)


class AgentJobFailureHandlingTests(unittest.TestCase):
    """Verifies that jobs returning status='error' are marked FAILED, not COMPLETED."""

    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = SessionLocal()
        self.db.query(ChatMessage).delete()
        self.db.query(AgentJob).delete()
        self.db.query(ChatSession).delete()
        self.db.query(User).filter(User.email == "job_failure_test@example.com").delete()
        self.db.commit()

        # Seed test user
        self.test_user = User(
            name="Job Failure Test User",
            email="job_failure_test@example.com",
            password="fakehash123",
            language="en",
            city="Punjab",
        )
        self.db.add(self.test_user)
        self.db.commit()
        self.db.refresh(self.test_user)

        # Seed chat session
        self.test_session = ChatSession(
            user_id=self.test_user.id,
            title="Failure Test Session",
        )
        self.db.add(self.test_session)
        self.db.commit()
        self.db.refresh(self.test_session)

    def tearDown(self):
        set_default_agent_runner(None)
        try:
            self.db.query(ChatMessage).delete()
            self.db.query(AgentJob).delete()
            self.db.query(ChatSession).delete()
            self.db.query(User).filter(User.email == "job_failure_test@example.com").delete()
            self.db.commit()
        finally:
            self.db.close()

    def test_worker_marks_job_failed_when_runner_returns_status_error(self):
        """Worker marks job FAILED (never COMPLETED) when runner returns status='error'."""
        job_id = "job_test_failure_err_status"
        payload = {
            "message": "What is the market price of cotton in Ludhiana?",
            "session_id": self.test_session.id,
            "workflow": "general_advisory",
        }
        job = AgentJob(
            id=job_id,
            user_id=self.test_user.id,
            idempotency_key="idemp_fail_test_1",
            payload_hash="hash_1",
            payload=json.dumps(payload),
            status="PENDING",
            attempt_count=0,
            max_attempts=3,
        )
        self.db.add(job)
        self.db.commit()

        # Mock runner returning status="error"
        error_answer = (
            "I encountered a temporary service issue connecting to the AI advisory model. "
            "Details: RuntimeError. Please try again shortly."
        )
        mock_runner = MagicMock()
        mock_runner.run.return_value = AgentRunResult(
            answer=error_answer,
            tool_calls_executed=[],
            tool_calls_count=0,
            rounds=1,
            status="error",
        )
        set_default_agent_runner(mock_runner)

        worker = AgentWorker(worker_id="test_failure_worker")
        claimed = worker.claim_next_job()
        self.assertEqual(claimed, job_id)

        process_result = worker.process_job(job_id)
        self.assertFalse(process_result, "process_job must return False on runner error")

        # Verify job in DB
        self.db.expire_all()
        persisted = self.db.query(AgentJob).filter(AgentJob.id == job_id).first()
        self.assertIsNotNone(persisted)
        self.assertEqual(persisted.status, "FAILED", "Job status must be FAILED, never COMPLETED")
        self.assertIsNone(persisted.result, "Failed job result must be None")
        self.assertIsNotNone(persisted.error_summary)
        self.assertIn("temporary service issue", persisted.error_summary)
        self.assertIsNotNone(persisted.completed_at)

        # Verify no chat messages were persisted to the session
        messages = self.db.query(ChatMessage).filter(ChatMessage.session_id == self.test_session.id).all()
        self.assertEqual(len(messages), 0, "Failed agent jobs must not persist error turns into chat session")

    def test_worker_marks_job_completed_when_runner_succeeds(self):
        """Worker marks job COMPLETED with result payload when runner succeeds."""
        job_id = "job_test_success_status"
        payload = {
            "message": "What is the weather in Ludhiana?",
            "session_id": self.test_session.id,
            "workflow": "general_advisory",
        }
        job = AgentJob(
            id=job_id,
            user_id=self.test_user.id,
            idempotency_key="idemp_success_test_1",
            payload_hash="hash_2",
            payload=json.dumps(payload),
            status="PENDING",
            attempt_count=0,
            max_attempts=3,
        )
        self.db.add(job)
        self.db.commit()

        mock_runner = MagicMock()
        mock_runner.run.return_value = AgentRunResult(
            answer="The current temperature in Ludhiana is 26°C with clear skies.",
            tool_calls_executed=[{
                "tool": "get_current_weather",
                "arguments": {"city": "Ludhiana"},
                "success": True,
                "result_summary": "26C, clear",
            }],
            tool_calls_count=1,
            rounds=1,
            status="completed",
        )
        set_default_agent_runner(mock_runner)

        worker = AgentWorker(worker_id="test_success_worker")
        claimed = worker.claim_next_job()
        self.assertEqual(claimed, job_id)

        process_result = worker.process_job(job_id)
        self.assertTrue(process_result)

        self.db.expire_all()
        persisted = self.db.query(AgentJob).filter(AgentJob.id == job_id).first()
        self.assertEqual(persisted.status, "COMPLETED")
        self.assertIsNotNone(persisted.result)
        result_data = json.loads(persisted.result)
        self.assertIn("Ludhiana", result_data["answer"])
        self.assertEqual(result_data["tool_calls_count"], 1)
        self.assertIsNone(persisted.error_summary)

        # Verify chat turn was persisted
        messages = self.db.query(ChatMessage).filter(ChatMessage.session_id == self.test_session.id).all()
        self.assertEqual(len(messages), 2)


class BoundedModelAndRunnerRegressionTests(unittest.TestCase):
    """Verifies timeout bounds, bounded agent duration, and logging on upstream model requests."""

    def setUp(self):
        self.original_env = dict(os.environ)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.original_env)

    def test_llm_client_timeout_and_retries_configured(self):
        """Client properly loads timeout and retries from env or arguments."""
        os.environ["AGENT_LLM_TIMEOUT_SECONDS"] = "55.0"
        os.environ["AGENT_LLM_MAX_RETRIES"] = "4"
        mock_key = "".join(["g", "s", "k", "_"]) + "testdummyapikey1234567890"
        os.environ["GROQ_API_KEY"] = mock_key

        client = OpenAIToolCallingClient()
        self.assertEqual(client.timeout, 55.0)
        self.assertEqual(client.max_retries, 4)

        # Explicit constructor args take priority
        client2 = OpenAIToolCallingClient(timeout=30.0, max_retries=1)
        self.assertEqual(client2.timeout, 30.0)
        self.assertEqual(client2.max_retries, 1)

    def test_chat_completion_passes_timeout_and_job_id(self):
        """chat_completion passes configured timeout and job_id in kwargs."""
        mock_key = "".join(["g", "s", "k", "_"]) + "testdummyapikey1234567890"
        client = OpenAIToolCallingClient(api_key=mock_key, timeout=25.0, max_retries=1)

        mock_openai_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Test advice"
        mock_choice.message.tool_calls = None
        mock_choice.finish_reason = "stop"
        mock_openai_client.chat.completions.create.return_value = MagicMock(choices=[mock_choice])

        with patch.object(client, "_get_client", return_value=mock_openai_client):
            with self.assertLogs("agriadvisor.agent_llm", level="INFO") as log_cm:
                res = client.chat_completion(
                    messages=[{"role": "user", "content": "Help with wheat"}],
                    job_id="job_trace_123",
                )
                self.assertEqual(res.content, "Test advice")

                # Verify kwargs to completions.create
                create_kwargs = mock_openai_client.chat.completions.create.call_args[1]
                self.assertEqual(create_kwargs.get("timeout"), 25.0)

                # Verify logs contain job_id, provider, model, and duration
                log_output = " ".join(log_cm.output)
                self.assertIn("[job_trace_123]", log_output)
                self.assertIn("LLM tool-calling request started", log_output)
                self.assertIn("LLM tool-calling request completed", log_output)
                self.assertNotIn(mock_key, log_output)

    def test_agent_runner_enforces_max_execution_seconds(self):
        """AgentRunner breaks out of reasoning loop when max_execution_seconds is exceeded."""
        from services.agent_runner import AgentRunner
        from services.tool_registry import ToolRegistry
        registry = ToolRegistry()
        mock_client = MagicMock()

        # Mock client returning tool call indefinitely
        from services.agent_llm import ToolCall
        mock_client.chat_completion.return_value = AgentLLMResponse(
            content=None,
            tool_calls=[ToolCall(id="tc_1", name="dummy_tool", arguments="{}")],
            finish_reason="tool_calls",
        )

        runner = AgentRunner(
            tool_registry=registry,
            llm_client=mock_client,
            max_rounds=10,
        )

        # Set max_execution_seconds to 0.0 to immediately trigger time bound
        result = runner.run(
            user_query="Indefinite query",
            max_execution_seconds=0.0,
            job_id="job_bounded_time",
        )
        self.assertEqual(result.status, "max_rounds_reached")
        self.assertEqual(result.rounds, 0)


class WorkerLeaseRenewalRegressionTests(unittest.TestCase):
    """Verifies that worker lease renewal prevents active work from being reclaimed."""

    def setUp(self):
        self.db = SessionLocal()
        self.db.query(AgentJob).delete()
        self.db.query(ChatMessage).delete()
        self.db.query(ChatSession).delete()
        self.db.query(User).delete()
        self.db.commit()

        self.test_user = User(
            name="Lease Farmer",
            email="lease_farmer@example.com",
            password="hashedpassword123",
            language="en",
            city="Ludhiana",
        )
        self.db.add(self.test_user)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_worker_default_lease_is_180_seconds(self):
        """Worker defaults to a 180-second lease, overridable by JOB_LEASE_SECONDS."""
        worker = AgentWorker()
        self.assertEqual(worker.lease_seconds, 180)

        with patch.dict(os.environ, {"JOB_LEASE_SECONDS": "240"}):
            worker2 = AgentWorker()
            self.assertEqual(worker2.lease_seconds, 240)

    def test_renew_lease_extends_timeout_for_owned_job(self):
        """worker.renew_lease() successfully pushes lease_timeout_at forward."""
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        initial_timeout = now + timedelta(seconds=60)
        job = AgentJob(
            id="job_renew_lease_test",
            user_id=self.test_user.id,
            idempotency_key="idemp_renew_1",
            payload_hash="hash_renew_1",
            payload=json.dumps({"message": "test"}),
            status="RUNNING",
            locked_by="worker_owner_1",
            locked_at=now,
            lease_timeout_at=initial_timeout,
            attempt_count=1,
            max_attempts=3,
        )
        self.db.add(job)
        self.db.commit()

        worker = AgentWorker(worker_id="worker_owner_1", lease_seconds=180)
        renewed = worker.renew_lease("job_renew_lease_test")
        self.assertTrue(renewed, "renew_lease must return True for owned RUNNING job")

        self.db.expire_all()
        updated_job = self.db.query(AgentJob).filter(AgentJob.id == "job_renew_lease_test").first()
        self.assertGreater(updated_job.lease_timeout_at, initial_timeout)

    def test_renew_lease_fails_if_ownership_lost(self):
        """worker.renew_lease() returns False if the job was stolen or fenced."""
        from datetime import datetime, timedelta
        now = datetime.utcnow()
        job = AgentJob(
            id="job_lost_lease_test",
            user_id=self.test_user.id,
            idempotency_key="idemp_lost_1",
            payload_hash="hash_lost_1",
            payload=json.dumps({"message": "test"}),
            status="RUNNING",
            locked_by="other_worker",
            locked_at=now,
            lease_timeout_at=now + timedelta(seconds=60),
            attempt_count=1,
            max_attempts=3,
        )
        self.db.add(job)
        self.db.commit()

        worker = AgentWorker(worker_id="my_worker", lease_seconds=180)
        renewed = worker.renew_lease("job_lost_lease_test")
        self.assertFalse(renewed, "renew_lease must return False if job is locked by other worker")


class KnowledgeBaseNonBlockingReadinessTests(unittest.TestCase):
    """Verifies that RAG path cannot block indefinitely or race with KB initialization."""

    def test_ensure_knowledge_base_ready_non_blocking_when_lock_held(self):
        """ensure_knowledge_base_ready returns False immediately if _INIT_LOCK is held."""
        from services.knowledge_base import _INIT_LOCK, ensure_knowledge_base_ready, KNOWLEDGE_BASE_READY

        KNOWLEDGE_BASE_READY.clear()
        with _INIT_LOCK:
            # While initialization lock is held by another thread, readiness check must be non-blocking
            ready = ensure_knowledge_base_ready(timeout_seconds=0.05)
            self.assertFalse(ready, "Must return False without blocking indefinitely when lock is held")

    def test_search_knowledge_base_skips_when_not_ready(self):
        """search_knowledge_base returns [] without blocking when KB is not ready."""
        from services.knowledge_base import _INIT_LOCK, search_knowledge_base, KNOWLEDGE_BASE_READY

        KNOWLEDGE_BASE_READY.clear()
        with _INIT_LOCK:
            docs = search_knowledge_base("wheat rust treatment")
            self.assertEqual(docs, [], "Must return empty results without blocking when KB is warming up")

    def test_tool_handlers_return_unavailable_retryable_when_kb_not_ready(self):
        """Tool handlers return status='unavailable' with retryable=True when KB is warming up."""
        from services.knowledge_base import _INIT_LOCK, KNOWLEDGE_BASE_READY
        from services.tool_registry import (
            SearchGovernmentSchemesInput,
            SearchKnowledgeBaseInput,
            handle_search_government_schemes,
            handle_search_knowledge_base,
        )

        KNOWLEDGE_BASE_READY.clear()
        with _INIT_LOCK:
            res_kb = handle_search_knowledge_base(SearchKnowledgeBaseInput(query="paddy blast"))
            self.assertEqual(res_kb.get("status"), "unavailable")
            self.assertTrue(res_kb.get("retryable"))
            self.assertIn("warming up", res_kb.get("message", "").lower())

            res_scheme = handle_search_government_schemes(
                SearchGovernmentSchemesInput(query="pm kisan")
            )
            self.assertEqual(res_scheme.get("status"), "unavailable")
            self.assertTrue(res_scheme.get("retryable"))
            self.assertIn("warming up", res_scheme.get("message", "").lower())


if __name__ == "__main__":
    unittest.main()
