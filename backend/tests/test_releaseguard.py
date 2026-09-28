"""
Unit tests for ReleaseGuard integration in Agri AI Backend.

Verifies:
1. ReleaseGuard initializes when configuration exists.
2. Missing RELEASEGUARD_API_KEY does not break local startup.
3. A test exception is captured without breaking the host application.
4. ReleaseGuard / network failure does not propagate to the host application.
5. No API key or sensitive credentials appear in logs.
6. The test endpoint /api/test/releaseguard-error works in development and is hidden in production.
"""

import logging
import os
import unittest
from unittest.mock import patch

from starlette.testclient import TestClient

import releaseguard_integration as rgi


class ReleaseGuardIntegrationTests(unittest.TestCase):
    def setUp(self):
        # Save original environment
        self._orig_env = {
            k: os.environ.get(k)
            for k in [
                "RELEASEGUARD_API_KEY",
                "RELEASEGUARD_ENDPOINT",
                "RELEASEGUARD_ENVIRONMENT",
                "RELEASEGUARD_RELEASE",
                "RELEASEGUARD_PROJECT_ID",
                "RELEASEGUARD_LIVE_TEST",
                "ENVIRONMENT",
                "RENDER",
            ]
        }
        # Ensure clean state for each test
        rgi.shutdown_releaseguard(timeout=0.2)

    def tearDown(self):
        rgi.shutdown_releaseguard(timeout=0.2)
        # Restore original environment
        for k, v in self._orig_env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def test_init_with_valid_configuration(self):
        """ReleaseGuard integration initializes properly when configuration exists."""
        os.environ["RELEASEGUARD_API_KEY"] = "rg_live_test_api_key_12345"
        os.environ["RELEASEGUARD_ENDPOINT"] = "http://127.0.0.1:8000"
        os.environ["RELEASEGUARD_ENVIRONMENT"] = "testing"
        os.environ["RELEASEGUARD_RELEASE"] = "1.0.0-test"
        os.environ["RELEASEGUARD_PROJECT_ID"] = "42"

        success = rgi.init_releaseguard(force=True)
        self.assertTrue(success)
        self.assertTrue(rgi.is_releaseguard_enabled())

        from releaseguard_sdk import get_client

        client = get_client()
        self.assertIsNotNone(client)
        self.assertEqual(client.config.project_id, 42)
        self.assertEqual(client.config.base_url, "http://127.0.0.1:8000")
        self.assertEqual(client.config.environment, "testing")
        self.assertEqual(client.config.release, "1.0.0-test")

    def test_missing_api_key_does_not_break_local_startup(self):
        """Missing RELEASEGUARD_API_KEY safely disables capture without breaking startup."""
        os.environ.pop("RELEASEGUARD_API_KEY", None)

        success = rgi.init_releaseguard(force=True)
        self.assertFalse(success)
        self.assertFalse(rgi.is_releaseguard_enabled())

        # Calling capture must be a safe no-op
        try:
            rgi.capture_releaseguard_exception(RuntimeError("Sample uncaptured error"))
            rgi.capture_releaseguard_message("Sample message")
            rgi.flush_releaseguard(timeout=0.1)
        except Exception as e:
            self.fail(f"Capture raised an exception when uninitialized: {e}")

    def test_exception_captured_without_breaking_host_application(self):
        """An exception is captured cleanly and never bubbles up to break the host."""
        os.environ["RELEASEGUARD_API_KEY"] = "rg_test_valid_key"
        os.environ["RELEASEGUARD_ENDPOINT"] = "http://127.0.0.1:8000"
        rgi.init_releaseguard(force=True)

        from releaseguard_sdk import get_client

        client = get_client()
        self.assertIsNotNone(client)
        initial_queued = client.stats.queued

        try:
            raise ValueError("Controlled host error for capture verification")
        except ValueError as err:
            # Must not raise
            rgi.capture_releaseguard_exception(err)

        self.assertGreaterEqual(client.stats.queued, initial_queued + 1)

    def test_network_or_api_failure_does_not_propagate_to_agri_application(self):
        """If ReleaseGuard API is down or times out, the Agri application continues without crashing."""
        # Point to a guaranteed dead local port with minimal timeout
        os.environ["RELEASEGUARD_API_KEY"] = "rg_test_dead_network_key"
        os.environ["RELEASEGUARD_ENDPOINT"] = "http://127.0.0.1:59998"
        os.environ["RELEASEGUARD_TIMEOUT"] = "0.2"
        os.environ["RELEASEGUARD_MAX_RETRIES"] = "0"
        rgi.init_releaseguard(force=True)

        try:
            # Capture error when network is unreachable
            try:
                1 / 0
            except ZeroDivisionError as err:
                rgi.capture_releaseguard_exception(err)

            # Flush with short timeout
            rgi.flush_releaseguard(timeout=0.5)
        except Exception as exc:
            self.fail(f"Network outage caused an exception in host application: {exc}")

    def test_no_api_key_or_credentials_appear_in_logs(self):
        """API key and URL credentials are NEVER logged."""
        secret_key = "super_secret_rg_token_XYZ_789"
        os.environ["RELEASEGUARD_API_KEY"] = secret_key
        os.environ["RELEASEGUARD_ENDPOINT"] = "http://admin:secretpassword@127.0.0.1:8000"

        with self.assertLogs("agri_backend.releaseguard", level=logging.INFO) as log_capture:
            rgi.init_releaseguard(force=True)

        combined_logs = " ".join(log_capture.output)
        self.assertNotIn(secret_key, combined_logs)
        self.assertNotIn("secretpassword", combined_logs)
        self.assertNotIn("admin:secretpassword", combined_logs)

    def test_test_endpoint_in_development_mode(self):
        """The /api/test/releaseguard-error endpoint functions properly in development/test."""
        os.environ["ENVIRONMENT"] = "development"
        os.environ["RELEASEGUARD_ENVIRONMENT"] = "development"
        os.environ.pop("RENDER", None)

        from app import app

        client = TestClient(app)
        response = client.get("/api/test/releaseguard-error")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["exception_type"], "RuntimeError")
        self.assertIn("ReleaseGuard test exception", data["detail"])

    def test_test_endpoint_hidden_in_production(self):
        """The /api/test/releaseguard-error endpoint returns 404 in production."""
        os.environ["ENVIRONMENT"] = "production"

        from app import app

        client = TestClient(app)
        response = client.get("/api/test/releaseguard-error")
        self.assertEqual(response.status_code, 404)

    def test_unhandled_exception_handler_captures_error(self):
        """Global unhandled exception handler catches uncaught errors, calls capture, and returns 500."""
        os.environ["ENVIRONMENT"] = "development"
        os.environ["RELEASEGUARD_ENVIRONMENT"] = "development"
        os.environ.pop("RENDER", None)

        from app import app

        client = TestClient(app, raise_server_exceptions=False)
        with patch("app.capture_releaseguard_exception") as mock_capture:
            response = client.get("/api/test/releaseguard-error?raw=true")
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.json(), {"detail": "Internal Server Error"})
            mock_capture.assert_called_once()

    def test_live_error_endpoint_disabled_by_default_returns_404(self):
        """When RELEASEGUARD_LIVE_TEST is unset or false, the live test endpoint returns 404."""
        os.environ.pop("RELEASEGUARD_LIVE_TEST", None)
        from app import app

        client = TestClient(app)
        response = client.get("/api/test/releaseguard-live-error")
        self.assertEqual(response.status_code, 404)

        # Explicitly false
        os.environ["RELEASEGUARD_LIVE_TEST"] = "false"
        response = client.get("/api/test/releaseguard-live-error")
        self.assertEqual(response.status_code, 404)

    def test_live_error_endpoint_enabled_returns_500_and_captures(self):
        """When RELEASEGUARD_LIVE_TEST == 'true', raises exception captured by ReleaseGuard and returns 500."""
        os.environ["RELEASEGUARD_LIVE_TEST"] = "true"
        from app import app

        client = TestClient(app, raise_server_exceptions=False)
        with patch("app.capture_releaseguard_exception") as mock_capture:
            response = client.get("/api/test/releaseguard-live-error")
            self.assertEqual(response.status_code, 500)
            self.assertEqual(response.json(), {"detail": "Internal Server Error"})
            mock_capture.assert_called_once()
            captured_exc = mock_capture.call_args[0][0]
            self.assertIsInstance(captured_exc, RuntimeError)
            self.assertEqual(str(captured_exc), "ReleaseGuard live integration test event")

    def test_live_error_no_secret_leakage(self):
        """Ensure no secrets or API keys leak into response or error strings."""
        secret_key = "super_confidential_live_key_999888"
        os.environ["RELEASEGUARD_API_KEY"] = secret_key
        os.environ["RELEASEGUARD_LIVE_TEST"] = "true"
        from app import app

        client = TestClient(app, raise_server_exceptions=False)
        response = client.get("/api/test/releaseguard-live-error")
        self.assertEqual(response.status_code, 500)
        self.assertNotIn(secret_key, response.text)


if __name__ == "__main__":
    unittest.main()
