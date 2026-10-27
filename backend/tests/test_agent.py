"""
Automated unit and integration tests for the AI Agent and Real Tool Calling system.

Tests:
1. Tool registration, Pydantic validation, and generated JSON schemas.
2. A successful tool call followed by a grounded final response.
3. Multiple tool calls executed within the configured limits.
4. Handling of invalid arguments and rejection of unknown/hallucinated tools.
5. External tool failure and safe recovery without leaking credentials or stack traces.
6. Strict maximum-round loop bounds enforcement.
7. Endpoint authentication, authorization, and input validation.
8. End-to-end /agent/chat API endpoint execution.
"""

import json
import os
import unittest
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from models import AgentChatRequest, AgentChatResponse, User
from services.auth import create_access_token
from services.agent_llm import (
    AgentLLMResponse,
    MockToolCallingClient,
    ToolCall,
)
from services.agent_runner import (
    AgentRunner,
    get_default_agent_runner,
    set_default_agent_runner,
)
from services.tool_registry import (
    GetMarketPricesInput,
    GetWeatherInput,
    SearchGovernmentSchemesInput,
    SearchKnowledgeBaseInput,
    ToolRegistry,
    create_default_agricultural_tool_registry,
)
from app import app
from database import SessionLocal


class ToolRegistryTests(unittest.TestCase):
    def setUp(self):
        self.registry = create_default_agricultural_tool_registry()

    def test_tool_registration_and_schemas(self):
        """All 4 read-only agricultural tools are registered with valid JSON schemas."""
        tool_names = self.registry.list_tool_names()
        expected = [
            "search_agricultural_knowledge_base",
            "get_current_weather",
            "get_market_prices",
            "search_government_schemes",
        ]
        for name in expected:
            self.assertIn(name, tool_names)

        openai_tools = self.registry.get_openai_tools()
        self.assertEqual(len(openai_tools), 4)

        tools_by_name = {t["function"]["name"]: t["function"] for t in openai_tools}

        # Check Weather tool schema
        weather_tool = tools_by_name["get_current_weather"]
        self.assertEqual(weather_tool["parameters"]["type"], "object")
        self.assertIn("location", weather_tool["parameters"]["properties"])
        self.assertIn("location", weather_tool["parameters"]["required"])

        # Check Market tool schema
        market_tool = tools_by_name["get_market_prices"]
        self.assertEqual(market_tool["parameters"]["type"], "object")
        for field in ("commodity", "state", "district"):
            self.assertIn(field, market_tool["parameters"]["properties"])
            self.assertIn(field, market_tool["parameters"]["required"])

        # Check Knowledge Base tool schema
        kb_tool = tools_by_name["search_agricultural_knowledge_base"]
        self.assertIn("query", kb_tool["parameters"]["properties"])
        self.assertIn("query", kb_tool["parameters"]["required"])

        # Check Scheme tool schema
        scheme_tool = tools_by_name["search_government_schemes"]
        self.assertIn("query", scheme_tool["parameters"]["properties"])
        self.assertIn("query", scheme_tool["parameters"]["required"])

    def test_tool_execution_with_valid_arguments(self):
        """Tool executes successfully when given valid arguments."""
        mock_handler = MagicMock(return_value={"status": "success", "temp": 28})
        custom_registry = ToolRegistry()
        custom_registry.register(
            name="test_tool",
            description="A test tool",
            args_schema=GetWeatherInput,
            handler=mock_handler,
        )

        res = custom_registry.execute("test_tool", {"location": "Bengaluru"})
        self.assertTrue(res["success"])
        self.assertEqual(res["result"]["temp"], 28)
        mock_handler.assert_called_once()

    def test_tool_execution_with_string_json_arguments(self):
        """Tool properly parses JSON string arguments emitted by an LLM."""
        mock_handler = MagicMock(return_value={"status": "ok"})
        custom_registry = ToolRegistry()
        custom_registry.register(
            name="test_tool",
            description="A test tool",
            args_schema=GetWeatherInput,
            handler=mock_handler,
        )

        res = custom_registry.execute("test_tool", '{"location": "Mandya"}')
        self.assertTrue(res["success"])

    def test_unknown_tool_rejection(self):
        """Registry rejects tools not on the allowlist."""
        res = self.registry.execute("execute_arbitrary_shell", {"cmd": "ls"})
        self.assertFalse(res["success"])
        self.assertIn("Unknown tool", res["error"])

    def test_invalid_arguments_validation(self):
        """Pydantic validation catches missing or malformed parameters."""
        # Missing required fields
        res = self.registry.execute("get_market_prices", {"commodity": "Tomato"})
        self.assertFalse(res["success"])
        self.assertIn("Invalid arguments", res["error"])

        # Invalid JSON string
        res = self.registry.execute("get_current_weather", "{not_valid_json}")
        self.assertFalse(res["success"])
        self.assertIn("Invalid JSON", res["error"])

    def test_market_prices_exception_does_not_leak_credentials_or_paths(self):
        """Tool handler suppresses dummy credentials, database URLs, and file paths on failure."""
        dummy_api_key = "dummy_secret_key_" + "test_12345"
        dummy_db_url = "postgresql://mock_user:sensitive_mock_pass@db.internal:5432/agri"
        dummy_path = "/var/app/internal/secrets/config.json"
        toxic_error = RuntimeError(
            f"Failed to query upstream AGMARKNET with key={dummy_api_key} "
            f"and db={dummy_db_url} using config from {dummy_path}"
        )

        with patch("services.agmarknet.get_market_price", side_effect=toxic_error):
            res = self.registry.execute("get_market_prices", {
                "commodity": "Tomato",
                "state": "Karnataka",
                "district": "Kolar",
            })

        self.assertTrue(res["success"])
        tool_result = res["result"]
        self.assertEqual(tool_result["status"], "unavailable")

        # Confirm safe generic message with exception class name
        self.assertIn("RuntimeError", tool_result["message"])

        # Confirm none of the sensitive tokens or paths leak into tool result
        serialized_result = json.dumps(res)
        self.assertNotIn(dummy_api_key, serialized_result)
        self.assertNotIn(dummy_db_url, serialized_result)
        self.assertNotIn("sensitive_mock_pass", serialized_result)
        self.assertNotIn(dummy_path, serialized_result)


class AgentRunnerTests(unittest.TestCase):
    def setUp(self):
        self.registry = create_default_agricultural_tool_registry()

    def test_successful_single_tool_call_and_final_answer(self):
        """Agent runs one tool call, receives result, and returns grounded answer."""
        mock_client = MockToolCallingClient([
            # Round 1: Model requests weather tool
            AgentLLMResponse(
                content=None,
                tool_calls=[
                    ToolCall(
                        id="call_weather_1",
                        name="get_current_weather",
                        arguments=json.dumps({"location": "Mandya"}),
                    )
                ],
                finish_reason="tool_calls",
            ),
            # Round 2: Model receives weather data and produces final advisory
            AgentLLMResponse(
                content="The weather in Mandya is currently 29°C with scattered clouds and 65% humidity.",
                tool_calls=[],
                finish_reason="stop",
            ),
        ])

        with patch("services.weather_service.get_weather") as mock_weather:
            mock_weather.return_value = {
                "city": "Mandya",
                "temperature": 29.0,
                "humidity": 65,
                "weather": "scattered clouds",
                "wind_speed": 3.5,
            }

            runner = AgentRunner(
                tool_registry=self.registry,
                llm_client=mock_client,
                max_rounds=5,
            )
            result = runner.run("What is the weather today in Mandya?")

            self.assertEqual(result.status, "completed")
            self.assertEqual(result.tool_calls_count, 1)
            self.assertEqual(result.rounds, 2)
            self.assertIn("Mandya is currently 29°C", result.answer)
            self.assertEqual(result.tool_calls_executed[0]["tool"], "get_current_weather")
            self.assertTrue(result.tool_calls_executed[0]["success"])

    def test_multiple_tool_calls_within_limit(self):
        """Agent can execute multiple tool calls across rounds or in parallel."""
        mock_client = MockToolCallingClient([
            # Round 1: Model requests both weather and market price
            AgentLLMResponse(
                content=None,
                tool_calls=[
                    ToolCall(
                        id="call_weather_1",
                        name="get_current_weather",
                        arguments=json.dumps({"location": "Kolar"}),
                    ),
                    ToolCall(
                        id="call_market_1",
                        name="get_market_prices",
                        arguments=json.dumps({
                            "commodity": "Tomato",
                            "state": "Karnataka",
                            "district": "Kolar",
                        }),
                    ),
                ],
                finish_reason="tool_calls",
            ),
            # Round 2: Model provides combined synthesis
            AgentLLMResponse(
                content="In Kolar, the weather is 28°C and the tomato modal price at the APMC mandi is ₹2,200/quintal.",
                tool_calls=[],
                finish_reason="stop",
            ),
        ])

        with patch("services.weather_service.get_weather") as mock_weather, \
             patch("services.agmarknet.get_market_price") as mock_market:
            mock_weather.return_value = {
                "city": "Kolar",
                "temperature": 28.0,
                "humidity": 60,
                "weather": "clear",
                "wind_speed": 2.1,
            }
            mock_resp = MagicMock()
            mock_resp.commodity = "Tomato"
            mock_resp.state = "Karnataka"
            mock_resp.district = "Kolar"
            mock_resp.market = "Kolar APMC"
            mock_resp.modal_price = 2200.0
            mock_resp.min_price = 2000.0
            mock_resp.max_price = 2400.0
            mock_resp.arrival_date = "2026-10-27"
            mock_market.return_value = mock_resp

            runner = AgentRunner(
                tool_registry=self.registry,
                llm_client=mock_client,
                max_rounds=5,
            )
            result = runner.run("Check weather and tomato price in Kolar.")

            self.assertEqual(result.status, "completed")
            self.assertEqual(result.tool_calls_count, 2)
            self.assertIn("Kolar", result.answer)
            self.assertIn("2,200", result.answer)

    def test_invalid_arguments_and_unknown_tool_safe_handling(self):
        """Agent safely handles unknown tool requests and invalid arguments without crashing."""
        mock_client = MockToolCallingClient([
            # Round 1: Model requests an unknown tool
            AgentLLMResponse(
                content=None,
                tool_calls=[
                    ToolCall(
                        id="call_unknown_1",
                        name="unsupported_database_hack",
                        arguments=json.dumps({"sql": "DROP TABLE"}),
                    )
                ],
                finish_reason="tool_calls",
            ),
            # Round 2: Model reads rejection error and recovers gracefully
            AgentLLMResponse(
                content="I cannot execute arbitrary operations. I only provide verified agricultural advisory information.",
                tool_calls=[],
                finish_reason="stop",
            ),
        ])

        runner = AgentRunner(
            tool_registry=self.registry,
            llm_client=mock_client,
            max_rounds=5,
        )
        result = runner.run("Execute arbitrary system command")

        self.assertEqual(result.status, "completed")
        self.assertEqual(result.tool_calls_count, 1)
        self.assertFalse(result.tool_calls_executed[0]["success"])
        self.assertIn("Unknown tool", result.tool_calls_executed[0]["result_summary"])
        self.assertIn("cannot execute", result.answer)

    def test_tool_failure_safe_recovery(self):
        """Agent handles upstream external API failure gracefully and informs farmer."""
        mock_client = MockToolCallingClient([
            AgentLLMResponse(
                content=None,
                tool_calls=[
                    ToolCall(
                        id="call_market_fail",
                        name="get_market_prices",
                        arguments=json.dumps({
                            "commodity": "ExoticBerry",
                            "state": "Karnataka",
                            "district": "Nowhere",
                        }),
                    )
                ],
                finish_reason="tool_calls",
            ),
            AgentLLMResponse(
                content="Today's market records for ExoticBerry in that district are unavailable. Please consult your local mandi.",
                tool_calls=[],
                finish_reason="stop",
            ),
        ])

        with patch("services.agmarknet.get_market_price", side_effect=ValueError("No records found")):
            runner = AgentRunner(
                tool_registry=self.registry,
                llm_client=mock_client,
                max_rounds=5,
            )
            result = runner.run("What is the ExoticBerry price in Nowhere?")

            self.assertEqual(result.status, "completed")
            self.assertEqual(result.tool_calls_count, 1)
            self.assertIn("unavailable", result.answer.lower())

    def test_maximum_rounds_enforcement(self):
        """Agent loop terminates strictly when max_rounds is exhausted."""
        # Infinitely looping model that always requests a tool call
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
            # Fallback final response when prompted for summary
            AgentLLMResponse(
                content="Reached maximum research limit. Here is the summary of Mandya weather.",
                tool_calls=[],
                finish_reason="stop",
            ),
        ])

        with patch("services.weather_service.get_weather", return_value={"temperature": 25, "city": "Mandya"}):
            runner = AgentRunner(
                tool_registry=self.registry,
                llm_client=mock_client,
                max_rounds=3,
            )
            result = runner.run("Keep searching forever")

            self.assertEqual(result.status, "max_rounds_reached")
            self.assertEqual(result.rounds, 3)
            self.assertEqual(result.tool_calls_count, 3)

    def test_agent_runner_does_not_leak_tool_exception_secrets_to_downstream_model(self):
        """Downstream model-visible messages never receive raw credentials from tool exceptions."""
        dummy_api_key = "dummy_secret_key_" + "test_98765"
        dummy_db_url = "postgresql://worker:secret_db_pass@agri-host:5432/farms"
        dummy_path = "D:\\internal\\secrets\\credentials.env"
        toxic_error = RuntimeError(
            f"Provider failure: key={dummy_api_key} db={dummy_db_url} path={dummy_path}"
        )

        mock_client = MockToolCallingClient([
            # Round 1: Model requests market prices
            AgentLLMResponse(
                content=None,
                tool_calls=[
                    ToolCall(
                        id="call_market_leak_test",
                        name="get_market_prices",
                        arguments=json.dumps({
                            "commodity": "Tomato",
                            "state": "Karnataka",
                            "district": "Kolar",
                        }),
                    )
                ],
                finish_reason="tool_calls",
            ),
            # Round 2: Model completes after receiving tool result
            AgentLLMResponse(
                content="Market prices for Tomato in Kolar are currently unavailable.",
                tool_calls=[],
                finish_reason="stop",
            ),
        ])

        with patch("services.agmarknet.get_market_price", side_effect=toxic_error):
            runner = AgentRunner(
                tool_registry=self.registry,
                llm_client=mock_client,
                max_rounds=3,
            )
            result = runner.run("What is the market price of Tomato in Kolar?")

        self.assertEqual(result.status, "completed")
        self.assertEqual(result.tool_calls_count, 1)

        # Inspect all downstream model-visible content passed to the LLM in round 2
        downstream_calls = mock_client.call_history
        self.assertGreaterEqual(len(downstream_calls), 2)
        downstream_messages = downstream_calls[1]["messages"]
        downstream_str = json.dumps(downstream_messages)

        # Assert none appear in downstream model-visible messages
        self.assertNotIn(dummy_api_key, downstream_str)
        self.assertNotIn(dummy_db_url, downstream_str)
        self.assertNotIn("secret_db_pass", downstream_str)
        self.assertNotIn(dummy_path, downstream_str)

        # Assert none appear in the result summary or runner output
        tool_exec_str = json.dumps(result.tool_calls_executed)
        self.assertNotIn(dummy_api_key, tool_exec_str)
        self.assertNotIn(dummy_db_url, tool_exec_str)
        self.assertNotIn("secret_db_pass", tool_exec_str)
        self.assertNotIn(dummy_path, tool_exec_str)


class AgentChatEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.user_id = 1
        self.auth_token = create_access_token(self.user_id)
        self.headers = {"Authorization": f"Bearer {self.auth_token}"}

        # Ensure user 1 exists in SQLite test DB for auth check
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == self.user_id).first()
            if not user:
                user = User(
                    id=self.user_id,
                    name="Farmer Test",
                    email="testfarmer@example.com",
                    password="hashedpassword123",
                )
                db.add(user)
                db.commit()
        finally:
            db.close()

    def tearDown(self):
        set_default_agent_runner(None)

    def test_endpoint_authentication_required(self):
        """Accessing /agent/chat without auth header yields 401."""
        res = self.client.post("/agent/chat", json={
            "user_id": self.user_id,
            "message": "What is the best fertilizer for wheat?",
        })
        self.assertEqual(res.status_code, 401)

    def test_endpoint_forbidden_cross_user_access(self):
        """Accessing another farmer's account yields 403."""
        res = self.client.post(
            "/agent/chat",
            json={
                "user_id": 999,  # Mismatch with token user_id=1
                "message": "What is the best fertilizer for wheat?",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 403)

    def test_endpoint_input_validation(self):
        """Empty messages or messages exceeding max length are rejected with 422."""
        # Empty message
        res = self.client.post(
            "/agent/chat",
            json={"user_id": self.user_id, "message": "   "},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 422)

        # Excessively long message
        res = self.client.post(
            "/agent/chat",
            json={"user_id": self.user_id, "message": "a" * 2001},
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 422)

    def test_endpoint_successful_execution(self):
        """Authenticated call with mocked runner returns 200 and AgentChatResponse structure."""
        registry = create_default_agricultural_tool_registry()
        mock_client = MockToolCallingClient([
            AgentLLMResponse(
                content="PM-KISAN provides Rs. 6,000 per year in three equal installments to eligible farmer families.",
                tool_calls=[],
                finish_reason="stop",
            )
        ])
        mock_runner = AgentRunner(tool_registry=registry, llm_client=mock_client)
        set_default_agent_runner(mock_runner)

        res = self.client.post(
            "/agent/chat",
            json={
                "user_id": self.user_id,
                "message": "Explain PM Kisan benefits",
            },
            headers=self.headers,
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("PM-KISAN", data["answer"])
        self.assertEqual(data["status"], "completed")
        self.assertEqual(data["rounds"], 1)
        self.assertEqual(data["tool_calls_count"], 0)


if __name__ == "__main__":
    unittest.main()
