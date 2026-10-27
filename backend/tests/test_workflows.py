"""
Automated unit and integration tests for Configurable AI Workflows.

Tests:
1. Valid configuration loading and metadata inspection.
2. Rejection of malformed JSON, missing files, and schema validation errors.
3. Strict security rejection of unknown tool names in configuration.
4. Safe rejection of unknown or disabled workflow profiles.
5. Tool schema generation matches selected workflow allowlist.
6. Execution of disallowed tools is strictly rejected by the scoped registry.
7. Workflow-specific reasoning round limits are enforced.
8. GET /agent/workflows authentication and safe metadata retrieval.
9. POST /agent/chat accepts valid workflows and rejects unknown workflows.
10. POST /agent/jobs stores workflow in payload and fingerprint, and worker executes it.
11. Idempotency keys distinguish requests with different workflows (409 Conflict).
12. Backward compatibility when workflow parameter is omitted.
"""

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app import app
from database import SessionLocal
from models import AgentJob, ChatSession, User
from services.agent_llm import (
    AgentLLMResponse,
    MockToolCallingClient,
    ToolCall,
)
from services.agent_runner import (
    AgentRunner,
    get_workflow_agent_runner,
    set_default_agent_runner,
)
from services.agent_worker import AgentWorker
from services.auth import create_access_token
from services.tool_registry import create_default_agricultural_tool_registry
from services.workflow_registry import (
    WorkflowConfigValidationError,
    WorkflowDisabledError,
    WorkflowNotFoundError,
    WorkflowRegistry,
    get_default_workflow_registry,
    set_default_workflow_registry,
)


class WorkflowRegistryUnitTests(unittest.TestCase):
    def setUp(self):
        self.base_tool_registry = create_default_agricultural_tool_registry()

    def test_default_workflows_load_successfully(self):
        """Default agent_workflows.json loads valid profiles with expected allowlists."""
        registry = WorkflowRegistry(tool_registry=self.base_tool_registry)
        names = registry.list_workflow_names()

        self.assertIn("general_advisory", names)
        self.assertIn("crop_care", names)
        self.assertIn("market_and_weather", names)

        # Validate general_advisory
        gen_wf = registry.get_workflow("general_advisory")
        self.assertEqual(len(gen_wf.allowed_tools), 4)
        self.assertEqual(gen_wf.max_rounds, 5)
        self.assertTrue(gen_wf.enabled)

        # Validate crop_care
        crop_wf = registry.get_workflow("crop_care")
        self.assertEqual(
            sorted(crop_wf.allowed_tools),
            ["search_agricultural_knowledge_base", "search_government_schemes"],
        )
        self.assertEqual(crop_wf.max_rounds, 4)

        # Validate market_and_weather
        mw_wf = registry.get_workflow("market_and_weather")
        self.assertEqual(
            sorted(mw_wf.allowed_tools),
            ["get_current_weather", "get_market_prices"],
        )
        self.assertEqual(mw_wf.max_rounds, 3)

    def test_missing_config_file_rejection(self):
        """Registry raises WorkflowConfigValidationError if config file does not exist."""
        with self.assertRaises(WorkflowConfigValidationError) as ctx:
            WorkflowRegistry(config_path=Path("/tmp/non_existent_workflows.json"))
        self.assertIn("not found", str(ctx.exception).lower())

    def test_malformed_json_rejection(self):
        """Registry raises WorkflowConfigValidationError if JSON is malformed."""
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            tf.write("{malformed json")
            tf_path = tf.name

        try:
            with self.assertRaises(WorkflowConfigValidationError) as ctx:
                WorkflowRegistry(config_path=tf_path)
            self.assertIn("malformed json", str(ctx.exception).lower())
        finally:
            os.unlink(tf_path)

    def test_invalid_schema_bounds_rejection(self):
        """Registry rejects max_rounds outside [1, 10] or empty tool allowlists."""
        invalid_config = {
            "version": "1.0",
            "workflows": {
                "bad_rounds": {
                    "name": "bad_rounds",
                    "description": "Invalid rounds",
                    "allowed_tools": ["get_current_weather"],
                    "max_rounds": 99,  # exceeds le=10
                    "system_prompt": "Valid system prompt for testing.",
                    "enabled": True,
                }
            },
        }

        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            json.dump(invalid_config, tf)
            tf_path = tf.name

        try:
            with self.assertRaises(WorkflowConfigValidationError) as ctx:
                WorkflowRegistry(config_path=tf_path)
            self.assertIn("schema validation failed", str(ctx.exception).lower())
        finally:
            os.unlink(tf_path)

    def test_security_unknown_tool_in_workflow_rejected(self):
        """Security invariant: Configuration referencing an unregistered tool is strictly rejected."""
        untrusted_config = {
            "version": "1.0",
            "workflows": {
                "hacked_workflow": {
                    "name": "hacked_workflow",
                    "description": "Attempts to call unauthorized tools",
                    "allowed_tools": ["execute_arbitrary_shell_command"],
                    "max_rounds": 3,
                    "system_prompt": "Valid prompt for testing.",
                    "enabled": True,
                }
            },
        }

        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            json.dump(untrusted_config, tf)
            tf_path = tf.name

        try:
            with self.assertRaises(WorkflowConfigValidationError) as ctx:
                WorkflowRegistry(config_path=tf_path, tool_registry=self.base_tool_registry)
            self.assertIn("unknown or unverified tool", str(ctx.exception).lower())
            self.assertIn("execute_arbitrary_shell_command", str(ctx.exception))
        finally:
            os.unlink(tf_path)

    def test_unknown_and_disabled_workflow_resolution(self):
        """Registry safely raises WorkflowNotFoundError or WorkflowDisabledError."""
        config_with_disabled = {
            "version": "1.0",
            "workflows": {
                "active_profile": {
                    "name": "active_profile",
                    "description": "Active workflow",
                    "allowed_tools": ["get_current_weather"],
                    "max_rounds": 3,
                    "system_prompt": "Prompt for active workflow.",
                    "enabled": True,
                },
                "inactive_profile": {
                    "name": "inactive_profile",
                    "description": "Disabled workflow",
                    "allowed_tools": ["get_current_weather"],
                    "max_rounds": 3,
                    "system_prompt": "Prompt for inactive workflow.",
                    "enabled": False,
                },
            },
        }

        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as tf:
            json.dump(config_with_disabled, tf)
            tf_path = tf.name

        try:
            reg = WorkflowRegistry(config_path=tf_path, tool_registry=self.base_tool_registry)

            # Active resolves normally
            self.assertEqual(reg.get_workflow("active_profile").name, "active_profile")

            # Unknown raises WorkflowNotFoundError
            with self.assertRaises(WorkflowNotFoundError):
                reg.get_workflow("non_existent_profile")

            # Disabled raises WorkflowDisabledError
            with self.assertRaises(WorkflowDisabledError):
                reg.get_workflow("inactive_profile")

            # Listing excludes disabled unless requested
            self.assertIn("active_profile", reg.list_workflow_names(include_disabled=False))
            self.assertNotIn("inactive_profile", reg.list_workflow_names(include_disabled=False))
            self.assertIn("inactive_profile", reg.list_workflow_names(include_disabled=True))
        finally:
            os.unlink(tf_path)

    def test_scoped_tool_registry_filters_tool_definitions(self):
        """Tool JSON schemas exposed to the model strictly match the workflow allowlist."""
        registry = WorkflowRegistry(tool_registry=self.base_tool_registry)
        crop_wf = registry.get_workflow("crop_care")

        exposed_tool_names = [
            t["function"]["name"]
            for t in crop_wf.scoped_registry.get_openai_tools()
        ]

        self.assertEqual(
            sorted(exposed_tool_names),
            ["search_agricultural_knowledge_base", "search_government_schemes"],
        )
        self.assertNotIn("get_current_weather", exposed_tool_names)
        self.assertNotIn("get_market_prices", exposed_tool_names)

    def test_disallowed_tool_execution_rejected_by_scoped_registry(self):
        """Attempting to execute a disallowed tool returns an execution error, not execution."""
        registry = WorkflowRegistry(tool_registry=self.base_tool_registry)
        crop_wf = registry.get_workflow("crop_care")

        # Weather is a valid tool in the system, but NOT in crop_care's allowlist
        res = crop_wf.scoped_registry.execute("get_current_weather", {"location": "Mandya"})
        self.assertFalse(res["success"])
        self.assertIn("Unknown tool 'get_current_weather'", res["error"])
        self.assertIn("Available allowlisted tools", res["error"])

    def test_workflow_specific_round_limits_enforced(self):
        """AgentRunner configured via workflow strictly stops after workflow's max_rounds."""
        registry = WorkflowRegistry(tool_registry=self.base_tool_registry)
        mw_wf = registry.get_workflow("market_and_weather")
        self.assertEqual(mw_wf.max_rounds, 3)

        looping_response = AgentLLMResponse(
            content=None,
            tool_calls=[
                ToolCall(
                    id="call_loop",
                    name="get_current_weather",
                    arguments=json.dumps({"location": "Mandya"}),
                )
            ],
            finish_reason="tool_calls",
        )
        mock_client = MockToolCallingClient([
            looping_response,
            looping_response,
            looping_response,
            looping_response,
        ])

        with patch("services.weather_service.get_weather", return_value={"temperature": 27, "city": "Mandya"}):
            runner = registry.create_runner("market_and_weather", llm_client=mock_client)
            result = runner.run("Keep looping")

            self.assertEqual(result.rounds, 3)
            self.assertEqual(result.status, "max_rounds_reached")


class WorkflowApiAndJobIntegrationTests(unittest.TestCase):
    def setUp(self):
        from services.security import _rate_lock, _request_times
        with _rate_lock:
            _request_times.clear()

        self.client = TestClient(app)
        self.user_id = 1
        self.auth_token = create_access_token(self.user_id)
        self.headers = {"Authorization": f"Bearer {self.auth_token}"}

        # Ensure user exists for authentication checks
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.user_id).first()
            if not user:
                user = User(
                    id=self.user_id,
                    name="Farmer Workflow",
                    email="farmer_workflow@example.com",
                    password="securehashedpassword",
                )
                db.add(user)
                db.commit()
        finally:
            db.close()

    def tearDown(self):
        from services.security import _rate_lock, _request_times
        with _rate_lock:
            _request_times.clear()
        set_default_agent_runner(None)
        set_default_workflow_registry(None)

    def test_get_agent_workflows_endpoint(self):
        """GET /agent/workflows returns authenticated safe metadata for enabled profiles."""
        # Unauthenticated request yields 401
        unauth = self.client.get("/agent/workflows")
        self.assertEqual(unauth.status_code, 401)

        # Authenticated request succeeds
        res = self.client.get("/agent/workflows", headers=self.headers)
        self.assertEqual(res.status_code, 200)

        data = res.json()
        self.assertIn("workflows", data)
        workflows_by_name = {w["name"]: w for w in data["workflows"]}

        self.assertIn("general_advisory", workflows_by_name)
        self.assertIn("crop_care", workflows_by_name)
        self.assertIn("market_and_weather", workflows_by_name)

        # Confirm internal system prompt is NOT leaked in the API response
        for w in data["workflows"]:
            self.assertNotIn("system_prompt", w)
            self.assertIn("allowed_tools", w)
            self.assertIn("max_rounds", w)
            self.assertTrue(w["enabled"])

    def test_agent_chat_accepts_valid_workflow(self):
        """POST /agent/chat runs with the specified workflow."""
        mock_client = MockToolCallingClient([
            AgentLLMResponse(
                content="Crop care advisory: Apply neem oil spray to control pests.",
                tool_calls=[],
                finish_reason="stop",
            )
        ])
        mock_runner = AgentRunner(
            tool_registry=create_default_agricultural_tool_registry(),
            llm_client=mock_client,
        )
        set_default_agent_runner(mock_runner)

        res = self.client.post(
            "/agent/chat",
            json={
                "user_id": self.user_id,
                "message": "Pest issues in cotton",
                "workflow": "crop_care",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("neem oil", res.json()["answer"].lower())

    def test_agent_chat_rejects_unknown_workflow(self):
        """POST /agent/chat rejects non-existent workflow with HTTP 400."""
        res = self.client.post(
            "/agent/chat",
            json={
                "user_id": self.user_id,
                "message": "What is the weather?",
                "workflow": "non_existent_workflow_profile",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Unknown workflow", res.json()["detail"])

    def test_agent_chat_backward_compatibility_default_workflow(self):
        """POST /agent/chat defaults to general_advisory when workflow is omitted."""
        mock_client = MockToolCallingClient([
            AgentLLMResponse(
                content="General advisory: Weather is clear and crops are healthy.",
                tool_calls=[],
                finish_reason="stop",
            )
        ])
        mock_runner = AgentRunner(
            tool_registry=create_default_agricultural_tool_registry(),
            llm_client=mock_client,
        )
        set_default_agent_runner(mock_runner)

        res = self.client.post(
            "/agent/chat",
            json={
                "user_id": self.user_id,
                "message": "General farming update",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("general advisory", res.json()["answer"].lower())

    def test_background_job_persists_and_executes_workflow(self):
        """POST /agent/jobs stores workflow in payload and worker executes it."""
        mock_client = MockToolCallingClient([
            AgentLLMResponse(
                content="Market update: Tomato modal price in Kolar is Rs 2200/quintal.",
                tool_calls=[],
                finish_reason="stop",
            )
        ])
        mock_runner = AgentRunner(
            tool_registry=create_default_agricultural_tool_registry(),
            llm_client=mock_client,
        )
        set_default_agent_runner(mock_runner)

        idempotency_key = "test_wf_job_key_001"
        res = self.client.post(
            "/agent/jobs",
            json={
                "message": "Tomato prices in Kolar",
                "workflow": "market_and_weather",
            },
            headers={**self.headers, "Idempotency-Key": idempotency_key},
        )
        self.assertEqual(res.status_code, 202)
        job_id = res.json()["job_id"]

        # Verify workflow is stored in database payload
        db = SessionLocal()
        try:
            job = db.query(AgentJob).filter(AgentJob.id == job_id).first()
            self.assertIsNotNone(job)
            payload = json.loads(job.payload)
            self.assertEqual(payload.get("workflow"), "market_and_weather")
        finally:
            db.close()

        # Run worker to process job
        worker = AgentWorker(worker_id="test_wf_worker", poll_interval=0.01)
        worked = worker.run_once()
        self.assertTrue(worked)

        # Confirm job completed
        status_res = self.client.get(f"/agent/jobs/{job_id}", headers=self.headers)
        self.assertEqual(status_res.status_code, 200)
        status_data = status_res.json()
        self.assertEqual(status_data["status"], "COMPLETED")
        self.assertIn("Tomato modal price", status_data["result"]["answer"])

    def test_idempotency_key_distinguishes_different_workflows(self):
        """Submitting the same idempotency key with different workflows yields 409 Conflict."""
        key = "shared_idempotency_key_wf_test"

        # Request 1: market_and_weather
        res1 = self.client.post(
            "/agent/jobs",
            json={
                "message": "Tell me about Mandya",
                "workflow": "market_and_weather",
            },
            headers={**self.headers, "Idempotency-Key": key},
        )
        self.assertEqual(res1.status_code, 202)
        job_id_1 = res1.json()["job_id"]

        # Request 2: same key, same message, DIFFERENT workflow (crop_care)
        res2 = self.client.post(
            "/agent/jobs",
            json={
                "message": "Tell me about Mandya",
                "workflow": "crop_care",
            },
            headers={**self.headers, "Idempotency-Key": key},
        )
        self.assertEqual(res2.status_code, 409)
        self.assertIn("different request payload", res2.json()["detail"].lower())

        # Request 3: same key, identical workflow (market_and_weather)
        res3 = self.client.post(
            "/agent/jobs",
            json={
                "message": "Tell me about Mandya",
                "workflow": "market_and_weather",
            },
            headers={**self.headers, "Idempotency-Key": key},
        )
        self.assertEqual(res3.status_code, 200)
        self.assertEqual(res3.json()["job_id"], job_id_1)


if __name__ == "__main__":
    unittest.main()
