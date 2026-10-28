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
- SEARCH EFFICIENCY: Do NOT repeat identical or near-identical searches within the same session. If you have already searched, synthesize the retrieved evidence.
- CROP SPECIFICITY: When inquiring about a specific crop, provide the `crop` parameter to retrieve crop-specific guidance and general horticulture/pathology recommendations.
- CHEMICAL & PESTICIDE DOSAGE SAFETY: Only describe a dosage or chemical treatment as verified when the retrieved source explicitly supports the crop, product, dose, and application method. Otherwise, clearly state that the treatment needs confirmation from an authoritative local recommendation (such as a local Krishi Vigyan Kendra / agricultural extension officer) or product label. NEVER invent, guess, or extrapolate chemical dosages.
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

    @staticmethod
    def _detect_crop_from_text(text: str) -> Optional[str]:
        if not text:
            return None
        import re
        from services.knowledge_base import CROP_KEYWORD_MAP
        text_lower = text.lower()
        for kw, canon in CROP_KEYWORD_MAP.items():
            if re.search(rf"\b{re.escape(kw)}\b", text_lower):
                return canon
        return None

    @staticmethod
    def _normalize_search_query(q: str) -> str:
        import re
        tokens = re.findall(r"\b[a-zA-Z0-9]+\b", q.lower())
        stop_words = {
            "what", "is", "are", "the", "a", "an", "in", "of", "for", "to", "and", "or",
            "how", "do", "does", "can", "should", "why", "my", "on", "with", "about",
            "please", "tell", "me", "find", "search", "give", "information"
        }
        stemmed = []
        for t in tokens:
            if t in stop_words:
                continue
            for suffix in ("ing", "es", "ed", "s"):
                if t.endswith(suffix) and len(t) - len(suffix) >= 3:
                    t = t[:-len(suffix)]
                    break
            stemmed.append(t)
        return " ".join(stemmed) if stemmed else " ".join(tokens)

    @classmethod
    def _query_similarity(cls, norm1: str, norm2: str) -> float:
        if not norm1 or not norm2:
            return 0.0
        if norm1 == norm2:
            return 1.0
        tokens1 = set(norm1.split())
        tokens2 = set(norm2.split())
        if not tokens1 or not tokens2:
            return 0.0
        intersection = len(tokens1 & tokens2)
        union = len(tokens1 | tokens2)
        return intersection / union

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
        executed_searches: Dict[str, List[Dict[str, Any]]] = {}
        kb_search_count = 0
        MAX_KB_SEARCHES_PER_RUN = 3
        detected_user_crop = self._detect_crop_from_text(user_query)
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
                    # Extract arguments for audit trail and normalization
                    parsed_args = tc.arguments
                    if isinstance(tc.arguments, str):
                        try:
                            parsed_args = json.loads(tc.arguments)
                        except Exception:
                            parsed_args = {"raw": tc.arguments}

                    # Redundant search prevention for knowledge base and scheme searches
                    is_redundant = False
                    cached_result = None
                    if tc.name in ("search_agricultural_knowledge_base", "search_government_schemes") and isinstance(parsed_args, dict):
                        raw_q = str(parsed_args.get("query", "")).strip()
                        norm_q = self._normalize_search_query(raw_q)
                        history = executed_searches.setdefault(tc.name, [])

                        for prev in history:
                            sim = self._query_similarity(norm_q, prev["norm_query"])
                            if sim >= 0.70 or norm_q == prev["norm_query"]:
                                is_redundant = True
                                cached_result = prev["result"]
                                logger.info(
                                    "%sRedundant search detected for '%s' (query: '%s' matches '%s' with similarity %.2f); reusing cached evidence",
                                    job_prefix,
                                    tc.name,
                                    raw_q,
                                    prev["raw_query"],
                                    sim,
                                )
                                break

                    if is_redundant and cached_result is not None:
                        exec_result = {
                            "success": True,
                            "result": {
                                "status": "cached",
                                "duplicate_prevented": True,
                                "message": (
                                    "A near-identical search was already executed in this session. "
                                    "Using previously retrieved evidence. Please synthesize your advisory "
                                    "response based on the evidence already retrieved rather than repeating searches."
                                ),
                                "documents": cached_result.get("result", {}).get("documents", []),
                            },
                        }
                    elif tc.name == "search_agricultural_knowledge_base" and kb_search_count >= MAX_KB_SEARCHES_PER_RUN:
                        logger.info(
                            "%sKnowledge base search limit (%d) reached; returning budget notice",
                            job_prefix,
                            MAX_KB_SEARCHES_PER_RUN,
                        )
                        exec_result = {
                            "success": True,
                            "result": {
                                "status": "search_limit_reached",
                                "message": (
                                    f"Maximum knowledge base searches ({MAX_KB_SEARCHES_PER_RUN}) reached for this advisory session. "
                                    "Please synthesize your final response from the extensive evidence already gathered above."
                                ),
                                "documents": [],
                            },
                        }
                    else:
                        # Auto-propagate crop context if user query explicitly specified a crop
                        # and the LLM omitted the crop parameter
                        if (
                            tc.name == "search_agricultural_knowledge_base"
                            and isinstance(parsed_args, dict)
                            and detected_user_crop
                            and not parsed_args.get("crop")
                        ):
                            parsed_args["crop"] = detected_user_crop
                            tc.arguments = json.dumps(parsed_args)

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

                        if tc.name == "search_agricultural_knowledge_base":
                            kb_search_count += 1

                        if tc.name in ("search_agricultural_knowledge_base", "search_government_schemes") and isinstance(parsed_args, dict):
                            raw_q = str(parsed_args.get("query", "")).strip()
                            executed_searches.setdefault(tc.name, []).append({
                                "raw_query": raw_q,
                                "norm_query": self._normalize_search_query(raw_q),
                                "result": exec_result,
                            })

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
