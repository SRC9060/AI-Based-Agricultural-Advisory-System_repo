"""
Bounded AI Agent Runner for AgriAdvisor.

Orchestrates multi-round reasoning loops where an LLM calls allowlisted tools,
receives validated results, and synthesizes grounded agricultural advisory responses.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from services.agent_llm import (
    AgentLLMResponse,
    BaseLLMClient,
    OpenAIToolCallingClient,
)
from services.tool_registry import (
    ToolRegistry,
    create_default_agricultural_tool_registry,
)


DEFAULT_AGENT_SYSTEM_PROMPT = """You are an experienced, expert agricultural advisor helping Indian farmers.
You have access to live tools to look up verified information:
1. `search_agricultural_knowledge_base`: Search curated agronomic documents for crop diseases, cultivation guides, soil health, and pest management.
2. `get_current_weather`: Retrieve verified live weather (temperature, humidity, wind, condition) for Indian cities or districts.
3. `get_market_prices`: Retrieve official APMC mandi market commodity prices from AGMARKNET for a specific commodity, state, and district.
4. `search_government_schemes`: Search government schemes, PM-KISAN, crop insurance (PMFBY), subsidies, and financial assistance programs.

CRITICAL OPERATIONAL RULES:
- When the farmer asks about weather, market prices, or government schemes, ALWAYS use the relevant tool to fetch verified data before answering.
- NEVER invent, hallucinate, or extrapolate market prices, dates, rainfall, or temperature.
- If a tool reports that data is unavailable, clearly state that verified live records are not available rather than guessing.
- Do NOT claim that crop diseases have been diagnosed by a computer vision model from text.
- Formulate practical, encouraging, step-by-step advice grounded in the retrieved tool data.
- Return your final answer directly in plain, friendly text."""


@dataclass
class AgentRunResult:
    answer: str
    tool_calls_executed: List[Dict[str, Any]]
    tool_calls_count: int
    rounds: int
    status: str  # "completed", "max_rounds_reached", "error"


class AgentRunner:
    """Bounded agent loop executing multi-round tool interactions."""

    def __init__(
        self,
        tool_registry: ToolRegistry,
        llm_client: BaseLLMClient,
        max_rounds: int = 5,
        system_prompt: str = DEFAULT_AGENT_SYSTEM_PROMPT,
    ):
        self.registry = tool_registry
        self.client = llm_client
        self.max_rounds = max_rounds
        self.system_prompt = system_prompt

    def run(
        self,
        user_query: str,
        conversation_context: Optional[str] = None,
    ) -> AgentRunResult:
        """
        Execute bounded tool-calling loop until LLM provides a final text response
        or max_rounds is reached.
        """
        tool_specs = self.registry.get_openai_tools()
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": self.system_prompt}
        ]

        if conversation_context:
            messages.append({
                "role": "user",
                "content": (
                    f"Previous conversation context:\n{conversation_context}\n\n"
                    f"Current question: {user_query}"
                ),
            })
        else:
            messages.append({"role": "user", "content": user_query})

        tool_calls_executed: List[Dict[str, Any]] = []
        rounds = 0

        while rounds < self.max_rounds:
            rounds += 1
            try:
                response = self.client.chat_completion(
                    messages=messages,
                    tools=tool_specs,
                )
            except Exception as llm_err:
                return AgentRunResult(
                    answer=(
                        "I encountered a temporary service issue connecting to the AI advisory model. "
                        f"Details: {type(llm_err).__name__}. Please try again shortly."
                    ),
                    tool_calls_executed=tool_calls_executed,
                    tool_calls_count=len(tool_calls_executed),
                    rounds=rounds,
                    status="error",
                )

            # If the LLM requested one or more tool calls
            if response.tool_calls:
                # Add assistant message with tool calls to conversation history
                assistant_message = {
                    "role": "assistant",
                    "content": response.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.name,
                                "arguments": tc.arguments,
                            },
                        }
                        for tc in response.tool_calls
                    ],
                }
                messages.append(assistant_message)

                # Process and execute each requested tool call
                for tc in response.tool_calls:
                    exec_result = self.registry.execute(tc.name, tc.arguments)

                    # Extract arguments for audit trail
                    parsed_args = tc.arguments
                    if isinstance(tc.arguments, str):
                        try:
                            parsed_args = json.loads(tc.arguments)
                        except Exception:
                            parsed_args = {"raw": tc.arguments}

                    # Summarize result for client audit log
                    if exec_result.get("success"):
                        summary = str(exec_result.get("result", {}))
                    else:
                        summary = str(exec_result.get("error", "Failed"))

                    tool_calls_executed.append({
                        "tool": tc.name,
                        "arguments": parsed_args if isinstance(parsed_args, dict) else {"raw": str(parsed_args)},
                        "success": exec_result.get("success", False),
                        "result_summary": summary[:300],
                    })

                    # Supply tool result message in provider format
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(exec_result),
                    })

                # Continue next iteration of bounded loop so LLM can inspect tool outputs
                continue

            # If the model emitted final text content without tool calls
            if response.content:
                return AgentRunResult(
                    answer=response.content.strip(),
                    tool_calls_executed=tool_calls_executed,
                    tool_calls_count=len(tool_calls_executed),
                    rounds=rounds,
                    status="completed",
                )

        # Loop exhausted max_rounds without a final answer: request final grounded summary
        try:
            messages.append({
                "role": "user",
                "content": (
                    "Please provide your final grounded agricultural response now based strictly "
                    "on the retrieved information above."
                ),
            })
            final_resp = self.client.chat_completion(messages=messages, tools=None)
            if final_resp.content:
                return AgentRunResult(
                    answer=final_resp.content.strip(),
                    tool_calls_executed=tool_calls_executed,
                    tool_calls_count=len(tool_calls_executed),
                    rounds=rounds,
                    status="max_rounds_reached",
                )
        except Exception:
            pass

        return AgentRunResult(
            answer=(
                f"I performed {len(tool_calls_executed)} research steps but reached the maximum allowed "
                "reasoning rounds. Please ask a more specific query."
            ),
            tool_calls_executed=tool_calls_executed,
            tool_calls_count=len(tool_calls_executed),
            rounds=rounds,
            status="max_rounds_reached",
        )


_default_agent_runner: Optional[AgentRunner] = None


def get_default_agent_runner() -> AgentRunner:
    """Retrieve or lazily initialize the singleton agent runner."""
    global _default_agent_runner
    if _default_agent_runner is None:
        registry = create_default_agricultural_tool_registry()
        client = OpenAIToolCallingClient()
        _default_agent_runner = AgentRunner(
            tool_registry=registry,
            llm_client=client,
        )
    return _default_agent_runner


def set_default_agent_runner(runner: Optional[AgentRunner]) -> None:
    """Override or reset default agent runner (primarily for testing)."""
    global _default_agent_runner
    _default_agent_runner = runner
