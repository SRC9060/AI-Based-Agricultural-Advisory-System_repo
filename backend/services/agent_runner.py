"""
Bounded AI Agent Runner for AgriAdvisor.

Orchestrates multi-round reasoning loops where an LLM calls allowlisted tools,
receives validated results, and synthesizes grounded agricultural advisory responses.
"""

from __future__ import annotations

import json
import logging
import os
import time
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

logger = logging.getLogger("agriadvisor.agent_runner")

DEFAULT_MAX_RUN_SECONDS = float(os.getenv("AGENT_MAX_RUN_SECONDS", "120.0"))

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
        job_id: Optional[str] = None,
        max_execution_seconds: Optional[float] = None,
    ) -> AgentRunResult:
        """
        Execute bounded tool-calling loop until LLM provides a final text response,
        max_rounds is reached, or max_execution_seconds is exceeded.
        """
        start_time = time.monotonic()
        max_sec = float(max_execution_seconds if max_execution_seconds is not None else DEFAULT_MAX_RUN_SECONDS)
        job_prefix = f"[{job_id}] " if job_id else ""
        logger.info(
            "%sAgent run started [max_rounds=%d, max_execution_seconds=%.1fs]",
            job_prefix,
            self.max_rounds,
            max_sec,
        )

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
            elapsed_so_far = time.monotonic() - start_time
            if elapsed_so_far >= max_sec:
                logger.warning(
                    "%sAgent run reached max execution time (%.2fs >= %.1fs) at round %d; finalizing",
                    job_prefix,
                    elapsed_so_far,
                    max_sec,
                    rounds,
                )
                break

            rounds += 1
            logger.info(
                "%sRound %d/%d starting [elapsed=%.2fs]",
                job_prefix,
                rounds,
                self.max_rounds,
                elapsed_so_far,
            )
            try:
                response = self.client.chat_completion(
                    messages=messages,
                    tools=tool_specs,
                    job_id=job_id,
                )
            except Exception as llm_err:
                elapsed_err = time.monotonic() - start_time
                logger.error(
                    "%sAgent run aborted on LLM error in %.2fs: %s",
                    job_prefix,
                    elapsed_err,
                    type(llm_err).__name__,
                )
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
                    t_start = time.monotonic()
                    logger.info("%sTool call '%s' started [round=%d]", job_prefix, tc.name, rounds)
                    exec_result = self.registry.execute(tc.name, tc.arguments)
                    t_elapsed = time.monotonic() - t_start
                    logger.info(
                        "%sTool call '%s' completed in %.2fs [success=%s]",
                        job_prefix,
                        tc.name,
                        t_elapsed,
                        exec_result.get("success", False),
                    )

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
                elapsed_total = time.monotonic() - start_time
                logger.info(
                    "%sAgent run completed in %.2fs [rounds=%d, tool_calls=%d, status=completed]",
                    job_prefix,
                    elapsed_total,
                    rounds,
                    len(tool_calls_executed),
                )
                return AgentRunResult(
                    answer=response.content.strip(),
                    tool_calls_executed=tool_calls_executed,
                    tool_calls_count=len(tool_calls_executed),
                    rounds=rounds,
                    status="completed",
                )

        # Loop exhausted max_rounds or max_sec without a final answer: request final grounded summary
        try:
            messages.append({
                "role": "user",
                "content": (
                    "Please provide your final grounded agricultural response now based strictly "
                    "on the retrieved information above."
                ),
            })
            final_resp = self.client.chat_completion(messages=messages, tools=None, job_id=job_id)
            if final_resp.content:
                logger.info(
                    "%sAgent run finalized in %.2fs [rounds=%d, tool_calls=%d, status=max_rounds_reached]",
                    job_prefix,
                    time.monotonic() - start_time,
                    rounds,
                    len(tool_calls_executed),
                )
                return AgentRunResult(
                    answer=final_resp.content.strip(),
                    tool_calls_executed=tool_calls_executed,
                    tool_calls_count=len(tool_calls_executed),
                    rounds=rounds,
                    status="max_rounds_reached",
                )
        except Exception:
            pass

        logger.info(
            "%sAgent run exhausted in %.2fs [rounds=%d, tool_calls=%d, status=max_rounds_reached]",
            job_prefix,
            time.monotonic() - start_time,
            rounds,
            len(tool_calls_executed),
        )
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


def get_workflow_agent_runner(
    workflow_name: str = "general_advisory",
    workflow_registry: Optional[Any] = None,
    llm_client: Optional[BaseLLMClient] = None,
) -> AgentRunner:
    """
    Retrieve an AgentRunner configured for the specified workflow profile.
    Supports test overrides transparently when _default_agent_runner is set.
    """
    global _default_agent_runner
    if _default_agent_runner is not None and workflow_name == "general_advisory":
        return _default_agent_runner

    from services.workflow_registry import get_default_workflow_registry

    reg = workflow_registry or get_default_workflow_registry()
    wf = reg.get_workflow(workflow_name)

    client = llm_client
    if client is None:
        if _default_agent_runner is not None and getattr(_default_agent_runner, "client", None) is not None:
            client = _default_agent_runner.client
        else:
            client = OpenAIToolCallingClient()

    return AgentRunner(
        tool_registry=wf.scoped_registry,
        llm_client=client,
        max_rounds=wf.max_rounds,
        system_prompt=wf.system_prompt,
    )


def get_default_agent_runner() -> AgentRunner:
    """Retrieve or lazily initialize the singleton agent runner."""
    global _default_agent_runner
    if _default_agent_runner is not None:
        return _default_agent_runner
    return get_workflow_agent_runner("general_advisory")


def set_default_agent_runner(runner: Optional[AgentRunner]) -> None:
    """Override or reset default agent runner (primarily for testing)."""
    global _default_agent_runner
    _default_agent_runner = runner
