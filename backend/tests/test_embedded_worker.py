"""
Unit and integration tests for the embedded background AgentWorker lifecycle.

Tests verify:
1. AGENT_WORKER_MODE configuration parsing and defaulting to 'disabled'.
2. Disabled mode does not launch a worker thread.
3. Embedded mode starts exactly one worker thread in the background.
4. Duplicate start calls within the process are prevented.
5. Application shutdown cleanly signals and joins the worker thread.
6. Worker loop survives transient database exceptions without dying.
7. Knowledge base initialization is not duplicated across threads.
"""

import os
import threading
import time
import unittest
from unittest.mock import MagicMock, patch

from services import agent_worker, knowledge_base
from services.agent_worker import (
    AgentWorker,
    get_embedded_worker,
    get_worker_mode,
    start_embedded_worker,
    stop_embedded_worker,
)
from services.knowledge_base import (
    initialize_knowledge_base,
    start_knowledge_base_initialization,
)


class TestEmbeddedWorkerLifecycle(unittest.TestCase):
    def setUp(self):
        # Ensure any leftover embedded worker is stopped before each test
        stop_embedded_worker(timeout=2.0)
        knowledge_base.KNOWLEDGE_BASE_READY.clear()

    def tearDown(self):
        stop_embedded_worker(timeout=2.0)
        knowledge_base.KNOWLEDGE_BASE_READY.clear()

    def test_get_worker_mode_default_disabled(self):
        """Worker mode defaults to 'disabled' when unset or blank."""
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(get_worker_mode(), "disabled")

        with patch.dict(os.environ, {"AGENT_WORKER_MODE": ""}):
            self.assertEqual(get_worker_mode(), "disabled")

    def test_get_worker_mode_embedded(self):
        """Worker mode correctly parses 'embedded' case-insensitively."""
        with patch.dict(os.environ, {"AGENT_WORKER_MODE": "embedded"}):
            self.assertEqual(get_worker_mode(), "embedded")

        with patch.dict(os.environ, {"AGENT_WORKER_MODE": "  EMBEDDED  "}):
            self.assertEqual(get_worker_mode(), "embedded")

    def test_get_worker_mode_unknown_falls_back_to_disabled(self):
        """Unrecognized worker mode safely falls back to 'disabled'."""
        with patch.dict(os.environ, {"AGENT_WORKER_MODE": "standalone_unsupported"}):
            self.assertEqual(get_worker_mode(), "disabled")

    def test_disabled_mode_does_not_launch_worker(self):
        """When AGENT_WORKER_MODE=disabled, no background worker thread is started."""
        with patch.dict(os.environ, {"AGENT_WORKER_MODE": "disabled"}):
            worker = start_embedded_worker()
            self.assertIsNone(worker)
            self.assertIsNone(get_embedded_worker())

    def test_embedded_worker_starts_only_when_enabled(self):
        """When AGENT_WORKER_MODE=embedded, exactly one background thread starts."""
        with patch.dict(os.environ, {"AGENT_WORKER_MODE": "embedded"}):
            # Mock run so the thread doesn't poll a real DB during this test
            with patch.object(AgentWorker, "run", autospec=True) as mock_run:
                mock_run.side_effect = lambda self: self._stop_event.wait(5.0)

                worker = start_embedded_worker()
                try:
                    self.assertIsNotNone(worker)
                    self.assertIsInstance(worker, AgentWorker)
                    self.assertFalse(worker.warmup_knowledge_base)
                    self.assertEqual(get_embedded_worker(), worker)

                    thread = agent_worker._EMBEDDED_WORKER_THREAD
                    self.assertIsNotNone(thread)
                    self.assertTrue(thread.is_alive())
                    self.assertEqual(thread.name, "EmbeddedAgentWorker")
                finally:
                    stop_embedded_worker(timeout=2.0)

    def test_prevent_duplicate_worker_threads_in_process(self):
        """Multiple calls to start_embedded_worker return the existing worker without spawning new threads."""
        with patch.dict(os.environ, {"AGENT_WORKER_MODE": "embedded"}):
            with patch.object(AgentWorker, "run", autospec=True) as mock_run:
                mock_run.side_effect = lambda self: self._stop_event.wait(5.0)

                worker1 = start_embedded_worker()
                thread1 = agent_worker._EMBEDDED_WORKER_THREAD

                worker2 = start_embedded_worker()
                thread2 = agent_worker._EMBEDDED_WORKER_THREAD

                try:
                    self.assertIs(worker1, worker2)
                    self.assertIs(thread1, thread2)
                finally:
                    stop_embedded_worker(timeout=2.0)

    def test_shutdown_signals_worker_and_joins_thread(self):
        """stop_embedded_worker signals the worker and cleanly joins the background thread."""
        with patch.dict(os.environ, {"AGENT_WORKER_MODE": "embedded"}):
            with patch.object(AgentWorker, "run", autospec=True) as mock_run:
                mock_run.side_effect = lambda self: self._stop_event.wait(5.0)

                worker = start_embedded_worker()
                thread = agent_worker._EMBEDDED_WORKER_THREAD
                self.assertTrue(thread.is_alive())

                stop_embedded_worker(timeout=2.0)

                self.assertTrue(worker.is_stopped)
                self.assertFalse(thread.is_alive())
                self.assertIsNone(get_embedded_worker())
                self.assertIsNone(agent_worker._EMBEDDED_WORKER_THREAD)

    def test_worker_loop_resilience_to_transient_database_exceptions(self):
        """Worker loop catches transient exceptions, applies backoff, and keeps running."""
        worker = AgentWorker(poll_interval=0.01, warmup_knowledge_base=False)
        attempts = 0

        def flaky_run_once():
            nonlocal attempts
            attempts += 1
            if attempts == 1:
                raise RuntimeError("Transient connection lost: [REDACTED_API_KEY]")
            if attempts == 2:
                raise ConnectionError("Database host unreachable")
            # Third attempt succeeds, then stop worker
            worker.stop()
            return True

        worker.run_once = flaky_run_once

        # Run worker with thread to verify it exits gracefully when worker.stop() is called
        t = threading.Thread(target=worker.run, daemon=True)
        t.start()
        t.join(timeout=3.0)

        self.assertFalse(t.is_alive(), "Worker loop thread should terminate after worker.stop()")
        self.assertGreaterEqual(attempts, 3, "Worker loop must survive transient exceptions until stop")

    def test_knowledge_base_initialization_single_thread_coordination(self):
        """start_knowledge_base_initialization coordinates single-thread execution without duplicates."""
        with patch.object(knowledge_base, "initialize_knowledge_base") as mock_init:
            mock_init.side_effect = lambda: time.sleep(0.1)

            # Clear state
            knowledge_base._KB_INIT_THREAD = None
            knowledge_base.KNOWLEDGE_BASE_READY.clear()

            t1 = start_knowledge_base_initialization()
            t2 = start_knowledge_base_initialization()

            self.assertIs(t1, t2)
            self.assertEqual(t1.name, "AppKBInit")

            t1.join(timeout=2.0)

            # When ready, start_knowledge_base_initialization returns None immediately
            knowledge_base.KNOWLEDGE_BASE_READY.set()
            t3 = start_knowledge_base_initialization()
            self.assertIsNone(t3)


if __name__ == "__main__":
    unittest.main()
