"""
AgriAdvisor Agent Background Worker.

Provides an independent, reliable, database-backed background processing worker
for read-only agricultural advisory agent queries.

EXECUTION SEMANTICS & AT-LEAST-ONCE NOTICE:
- Client-side duplicate requests are prevented using client-provided Idempotency-Key
  headers and SHA-256 payload fingerprints stored in the database.
- Worker processing provides AT-LEAST-ONCE execution guarantees, NOT exactly-once.
  If a worker crashes, loses power, or suffers an unhandled process termination while
  a job is marked RUNNING, the worker lease will eventually expire (lease_timeout_at).
  A recovering worker will reclaim the abandoned job and re-execute the read-only query.
- Because all agent tools (agricultural RAG, weather, mandi prices, government schemes)
  are strictly read-only, re-executing queries is safe from data corruption. However,
  each re-execution turn calls the LLM provider and may incur provider token costs.
"""

from __future__ import annotations

import json
import logging
import os
import random
import re
import signal
import sys
import threading
import time
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session

from database import SessionLocal, engine
from models import AgentJob, ChatMessage, ChatSession
from services.agent_runner import get_default_agent_runner

logger = logging.getLogger("agriadvisor.agent_worker")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("[%(asctime)s] [%(levelname)s] [Worker] %(message)s")
    )
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def sanitize_worker_error(exc: Exception) -> str:
    """
    Sanitize exception messages to prevent leaking credentials, internal file paths,
    or SQL connection secrets to clients or database records.
    """
    msg = str(exc)
    # Strip potential API keys or tokens
    msg = re.sub(r"gsk_[A-Za-z0-9_-]{20,}", "[REDACTED_API_KEY]", msg)
    msg = re.sub(r"sk-[A-Za-z0-9_-]{20,}", "[REDACTED_API_KEY]", msg)
    msg = re.sub(r"Bearer\s+[A-Za-z0-9_\-\.]+", "Bearer [REDACTED]", msg, flags=re.IGNORECASE)
    # Strip system local paths
    msg = re.sub(r"([A-Za-z]:\\[^:\s]+|/(?:home|Users|tmp|var)[^:\s]+)", "[PATH]", msg)
    cleaned = msg.strip()
    if not cleaned:
        cleaned = type(exc).__name__
    return cleaned[:500]


class AgentWorker:
    """
    Persistent background worker that claims, executes, and retries
    database-backed AgentJob records.
    """

    def __init__(
        self,
        worker_id: Optional[str] = None,
        lease_seconds: int = 120,
        poll_interval: float = 1.0,
        base_backoff: float = 2.0,
        max_backoff: float = 300.0,
        session_factory=SessionLocal,
        db_engine=engine,
    ):
        self.worker_id = worker_id or f"worker_{os.getpid()}_{uuid.uuid4().hex[:8]}"
        self.lease_seconds = int(os.getenv("JOB_LEASE_SECONDS", str(lease_seconds)))
        self.poll_interval = float(os.getenv("WORKER_POLL_INTERVAL", str(poll_interval)))
        self.base_backoff = float(os.getenv("BASE_BACKOFF_SECONDS", str(base_backoff)))
        self.max_backoff = float(os.getenv("MAX_BACKOFF_SECONDS", str(max_backoff)))
        self.session_factory = session_factory
        self.db_engine = db_engine
        self._stop_event = threading.Event()

    def stop(self) -> None:
        """Signal worker to stop gracefully."""
        self._stop_event.set()

    @property
    def is_stopped(self) -> bool:
        return self._stop_event.is_set()

    def claim_next_job(self) -> Optional[str]:
        """
        Atomically claim the next eligible PENDING, RETRY_WAIT, or abandoned RUNNING job.
        
        Uses database conditional updates to prevent race conditions across concurrent workers.
        Returns the claimed job_id on success, or None if no eligible job was claimed.
        """
        db: Session = self.session_factory()
        try:
            now = datetime.utcnow()
            lease_expiry = now + timedelta(seconds=self.lease_seconds)

            # PostgreSQL with FOR UPDATE SKIP LOCKED if dialect supports it
            is_postgres = (
                getattr(self.db_engine, "dialect", None) is not None
                and self.db_engine.dialect.name == "postgresql"
            )

            if is_postgres:
                # Optimized PostgreSQL locking
                candidate = (
                    db.query(AgentJob)
                    .filter(
                        or_(
                            and_(
                                AgentJob.status == "PENDING",
                                or_(
                                    AgentJob.next_retry_at.is_(None),
                                    AgentJob.next_retry_at <= now,
                                ),
                            ),
                            and_(
                                AgentJob.status == "RETRY_WAIT",
                                AgentJob.next_retry_at <= now,
                            ),
                            and_(
                                AgentJob.status == "RUNNING",
                                AgentJob.lease_timeout_at <= now,
                            ),
                        )
                    )
                    .order_by(AgentJob.created_at.asc())
                    .with_for_update(skip_locked=True)
                    .first()
                )

                if not candidate:
                    db.rollback()
                    return None

                # Check if abandoned job has already exceeded max attempts
                if candidate.status == "RUNNING" and candidate.attempt_count >= candidate.max_attempts:
                    candidate.status = "FAILED"
                    candidate.error_summary = (
                        f"Abandoned worker lease expired and max attempts ({candidate.max_attempts}) reached."
                    )
                    candidate.completed_at = now
                    candidate.updated_at = now
                    candidate.locked_by = None
                    candidate.lease_timeout_at = None
                    db.commit()
                    return None

                job_id = candidate.id
                candidate.status = "RUNNING"
                candidate.locked_by = self.worker_id
                candidate.locked_at = now
                candidate.lease_timeout_at = lease_expiry
                if candidate.started_at is None:
                    candidate.started_at = now
                candidate.attempt_count += 1
                candidate.updated_at = now
                db.commit()
                return job_id

            # Universal strategy (safe for SQLite, MySQL, and PostgreSQL)
            # 1. Identify candidate
            candidate = (
                db.query(AgentJob.id, AgentJob.status, AgentJob.attempt_count, AgentJob.max_attempts)
                .filter(
                    or_(
                        and_(
                            AgentJob.status == "PENDING",
                            or_(
                                AgentJob.next_retry_at.is_(None),
                                AgentJob.next_retry_at <= now,
                            ),
                        ),
                        and_(
                            AgentJob.status == "RETRY_WAIT",
                            AgentJob.next_retry_at <= now,
                        ),
                        and_(
                            AgentJob.status == "RUNNING",
                            AgentJob.lease_timeout_at <= now,
                        ),
                    )
                )
                .order_by(AgentJob.created_at.asc())
                .first()
            )

            if not candidate:
                return None

            candidate_id, candidate_status, attempt_count, max_attempts = candidate

            # Check if stale running job exceeded max attempts
            if candidate_status == "RUNNING" and attempt_count >= max_attempts:
                # Mark as FAILED
                db.query(AgentJob).filter(
                    AgentJob.id == candidate_id,
                    AgentJob.status == "RUNNING",
                    AgentJob.lease_timeout_at <= now,
                ).update(
                    {
                        AgentJob.status: "FAILED",
                        AgentJob.error_summary: f"Abandoned worker lease expired and max attempts ({max_attempts}) reached.",
                        AgentJob.completed_at: now,
                        AgentJob.updated_at: now,
                        AgentJob.locked_by: None,
                        AgentJob.lease_timeout_at: None,
                    },
                    synchronize_session=False,
                )
                db.commit()
                return None

            # 2. Atomic conditional update to claim lease
            rows_updated = (
                db.query(AgentJob)
                .filter(
                    AgentJob.id == candidate_id,
                    or_(
                        and_(
                            AgentJob.status == "PENDING",
                            or_(
                                AgentJob.next_retry_at.is_(None),
                                AgentJob.next_retry_at <= now,
                            ),
                        ),
                        and_(
                            AgentJob.status == "RETRY_WAIT",
                            AgentJob.next_retry_at <= now,
                        ),
                        and_(
                            AgentJob.status == "RUNNING",
                            AgentJob.lease_timeout_at <= now,
                        ),
                    ),
                )
                .update(
                    {
                        AgentJob.status: "RUNNING",
                        AgentJob.locked_by: self.worker_id,
                        AgentJob.locked_at: now,
                        AgentJob.lease_timeout_at: lease_expiry,
                        AgentJob.started_at: func.coalesce(AgentJob.started_at, now),
                        AgentJob.attempt_count: AgentJob.attempt_count + 1,
                        AgentJob.updated_at: now,
                    },
                    synchronize_session=False,
                )
            )
            db.commit()

            if rows_updated == 1:
                return candidate_id
            return None
        except Exception as claim_err:
            db.rollback()
            logger.error("Error during claim_next_job: %s", claim_err)
            return None
        finally:
            db.close()

    def process_job(self, job_id: str) -> bool:
        """
        Execute an already-claimed job.
        Invokes the AI AgentRunner, persists results, and manages retries or failures.
        """
        db: Session = self.session_factory()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            if not job:
                logger.warning("Claimed job %s not found in database", job_id)
                return False

            logger.info(
                "Processing job %s (attempt %d of %d)",
                job_id,
                job.attempt_count,
                job.max_attempts,
            )

            # Parse payload
            try:
                payload = json.loads(job.payload)
            except Exception as parse_err:
                # Fatal payload error: mark FAILED immediately
                now = datetime.utcnow()
                job.status = "FAILED"
                job.error_summary = f"Malformed job payload: {sanitize_worker_error(parse_err)}"
                job.completed_at = now
                job.updated_at = now
                job.locked_by = None
                job.lease_timeout_at = None
                db.commit()
                return False

            message = payload.get("message", "")
            session_id = payload.get("session_id")
            conversation_context = ""
            session = None

            if session_id:
                try:
                    session_id_int = int(session_id)
                    session = (
                        db.query(ChatSession)
                        .filter(
                            ChatSession.id == session_id_int,
                            ChatSession.user_id == job.user_id,
                        )
                        .first()
                    )
                    if session:
                        recent_messages = (
                            db.query(ChatMessage)
                            .filter(ChatMessage.session_id == session.id)
                            .order_by(ChatMessage.created_at.desc())
                            .limit(4)
                            .all()
                        )
                        if recent_messages:
                            conversation_context = "\n".join(
                                f"{msg.role.title()}: {msg.message}"
                                for msg in reversed(recent_messages)
                            )
                except Exception as ctx_err:
                    logger.warning("Error fetching conversation context: %s", ctx_err)

            # Invoke AgentRunner
            runner = get_default_agent_runner()
            result = runner.run(
                user_query=message,
                conversation_context=conversation_context or None,
            )

            # Format result payload
            result_payload = {
                "answer": result.answer,
                "tool_calls": [
                    {
                        "tool": tc.get("tool", ""),
                        "arguments": tc.get("arguments", {}),
                        "success": tc.get("success", False),
                        "result_summary": tc.get("result_summary", ""),
                    }
                    for tc in result.tool_calls_executed
                ],
                "tool_calls_count": result.tool_calls_count,
                "rounds": result.rounds,
                "status": result.status,
            }

            # Persist chat history if session exists
            if session:
                try:
                    db.add(
                        ChatMessage(
                            session_id=session.id,
                            role="user",
                            intent="agent_job_worker",
                            message=message,
                        )
                    )
                    db.add(
                        ChatMessage(
                            session_id=session.id,
                            role="assistant",
                            intent="agent_job_worker",
                            message=result.answer,
                        )
                    )
                    session.updated_at = datetime.utcnow()
                except Exception as hist_err:
                    logger.warning("Failed to persist session chat turn: %s", hist_err)

            now = datetime.utcnow()
            job.status = "COMPLETED"
            job.result = json.dumps(result_payload)
            job.error_summary = None
            job.completed_at = now
            job.updated_at = now
            job.locked_by = None
            job.lease_timeout_at = None
            db.commit()

            logger.info("Successfully completed job %s", job_id)
            return True

        except Exception as exc:
            db.rollback()
            logger.error("Job %s execution failed with error: %s", job_id, exc)
            self._handle_job_failure(job_id, exc)
            return False
        finally:
            db.close()

    def _handle_job_failure(self, job_id: str, exc: Exception) -> None:
        """
        Record failure, evaluate retry eligibility, apply exponential backoff with jitter,
        or mark permanently FAILED if max attempts are exhausted.
        """
        db: Session = self.session_factory()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            if not job:
                return

            now = datetime.utcnow()
            sanitized = sanitize_worker_error(exc)

            if job.attempt_count < job.max_attempts:
                # Exponential backoff: base * 2^(attempt - 1) + jitter
                power = max(0, job.attempt_count - 1)
                backoff = min(self.max_backoff, self.base_backoff * (2 ** power))
                jitter = random.uniform(0.1, 1.0)
                delay_seconds = backoff + jitter

                job.status = "RETRY_WAIT"
                job.error_summary = f"Transient error: {sanitized}"
                job.next_retry_at = now + timedelta(seconds=delay_seconds)
                job.updated_at = now
                job.locked_by = None
                job.lease_timeout_at = None
                logger.info(
                    "Job %s scheduled for retry #%d in %.2fs (next_retry_at=%s)",
                    job_id,
                    job.attempt_count + 1,
                    delay_seconds,
                    job.next_retry_at,
                )
            else:
                job.status = "FAILED"
                job.error_summary = (
                    f"Max attempts ({job.max_attempts}) reached. Last error: {sanitized}"
                )
                job.completed_at = now
                job.updated_at = now
                job.locked_by = None
                job.lease_timeout_at = None
                logger.warning(
                    "Job %s permanently FAILED after %d attempts",
                    job_id,
                    job.attempt_count,
                )

            db.commit()
        except Exception as update_err:
            db.rollback()
            logger.error("Error updating failure state for job %s: %s", job_id, update_err)
        finally:
            db.close()

    def run_once(self) -> bool:
        """
        Attempt to claim and process a single job.
        Returns True if a job was claimed and processed, False if queue was empty.
        """
        job_id = self.claim_next_job()
        if not job_id:
            return False
        return self.process_job(job_id)

    def run(self, max_jobs: Optional[int] = None) -> int:
        """
        Run the worker loop continuously until stop() is called or max_jobs is reached.
        Returns total number of jobs processed.
        """
        logger.info(
            "Worker %s started (poll_interval=%.1fs, lease=%ds)",
            self.worker_id,
            self.poll_interval,
            self.lease_seconds,
        )
        processed_count = 0

        while not self._stop_event.is_set():
            if max_jobs is not None and processed_count >= max_jobs:
                break

            did_work = self.run_once()
            if did_work:
                processed_count += 1
            else:
                self._stop_event.wait(self.poll_interval)

        logger.info("Worker %s shutting down. Total jobs processed: %d", self.worker_id, processed_count)
        return processed_count


if __name__ == "__main__":
    worker = AgentWorker()

    def handle_signal(sig, frame):
        logger.info("Signal %s received; initiating graceful shutdown...", sig)
        worker.stop()

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    logger.info("Starting AgriAdvisor agent background worker (press Ctrl+C to stop)...")
    worker.run()
