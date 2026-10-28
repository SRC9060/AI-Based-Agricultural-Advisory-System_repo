"""
LLM Client Interface for Real Tool Calling in AgriAdvisor.

Supports OpenAI-compatible providers (Groq and OpenAI) with automatic credential
detection, secure error handling without credential leakage, and mock clients
for deterministic automated testing.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from config import Config

logger = logging.getLogger("agriadvisor.agent_llm")

RETIRED_GROQ_MODELS = {
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
}

DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b"


def resolve_groq_model(model_override: Optional[str] = None) -> str:
    """
    Resolve the Groq model for agent tool-calling according to configuration priority:
    1. AGENT_LLM_MODEL environment variable
    2. Explicit model argument (if passed and valid)
    3. GROQ_MODEL environment variable
    4. Config.GROQ_MODEL
    5. Documented fallback: DEFAULT_GROQ_MODEL ('qwen/qwen3.8-27b')

    Rejects retired models (e.g. retired free/developer-tier Llama 3.3/3.1 70B)
    and preserves valid explicit configuration overrides.
    """
    candidates = [
        os.getenv("AGENT_LLM_MODEL"),
        model_override,
        os.getenv("GROQ_MODEL"),
        getattr(Config, "GROQ_MODEL", None),
    ]

    for candidate in candidates:
        if candidate and isinstance(candidate, str):
            cleaned = candidate.strip()
            if cleaned and cleaned.lower() not in RETIRED_GROQ_MODELS:
                return cleaned

    return DEFAULT_GROQ_MODEL


def _sanitize_diagnostic_text(text: str, api_key: Optional[str] = None) -> str:
    """
    Sanitize diagnostic message to ensure API keys, tokens, and filesystem paths
    are never leaked into logs or exception traces.
    """
    if not text:
        return ""
    cleaned = str(text)
    if api_key:
        cleaned = cleaned.replace(api_key, "[REDACTED_API_KEY]")
    cleaned = re.sub(r"(gsk_[a-zA-Z0-9_\-]{16,})", "[REDACTED_GROQ_KEY]", cleaned)
    cleaned = re.sub(r"(sk-[a-zA-Z0-9_\-]{16,})", "[REDACTED_OPENAI_KEY]", cleaned)
    cleaned = re.sub(r"(Bearer\s+)[^\s,;]+", r"\1[REDACTED_BEARER]", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"([a-zA-Z]:\\[^\s,;]+)", "[REDACTED_PATH]", cleaned)
    return cleaned


import time

DEFAULT_LLM_TIMEOUT_SECONDS = float(os.getenv("AGENT_LLM_TIMEOUT_SECONDS", "45.0"))
DEFAULT_LLM_MAX_RETRIES = int(os.getenv("AGENT_LLM_MAX_RETRIES", "2"))


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: str  # Raw JSON arguments string from model


@dataclass
class AgentLLMResponse:
    content: Optional[str]
    tool_calls: List[ToolCall] = field(default_factory=list)
    finish_reason: Optional[str] = None


class BaseLLMClient:
    """Base protocol for agent tool-calling LLM clients."""

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
        timeout: Optional[float] = None,
        job_id: Optional[str] = None,
    ) -> AgentLLMResponse:
        raise NotImplementedError


class OpenAIToolCallingClient(BaseLLMClient):
    """
    OpenAI-compatible LLM client supporting native tool calling.
    Automatically prioritizes configured keys (Groq ultra-fast or OpenAI),
    enforces bounded timeouts and retry limits, and logs request lifecycle.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
    ):
        groq_key = os.getenv("GROQ_API_KEY") or getattr(Config, "GROQ_API_KEY", None)
        openai_key = os.getenv("OPENAI_API_KEY") or getattr(Config, "OPENAI_API_KEY", None)

        env_timeout = os.getenv("AGENT_LLM_TIMEOUT_SECONDS")
        self.timeout = float(
            timeout
            if timeout is not None
            else (float(env_timeout) if env_timeout else DEFAULT_LLM_TIMEOUT_SECONDS)
        )
        env_retries = os.getenv("AGENT_LLM_MAX_RETRIES")
        self.max_retries = int(
            max_retries
            if max_retries is not None
            else (int(env_retries) if env_retries else DEFAULT_LLM_MAX_RETRIES)
        )

        if api_key:
            self.api_key = api_key
            self.base_url = base_url
            self.model = model or "gpt-4o-mini"
            self.provider = "custom"
        elif groq_key:
            self.api_key = groq_key
            self.base_url = base_url or "https://api.groq.com/openai/v1"
            self.model = resolve_groq_model(model_override=model)
            self.provider = "groq"
        elif openai_key:
            self.api_key = openai_key
            self.base_url = base_url
            self.model = model or os.getenv("AGENT_LLM_MODEL") or getattr(Config, "OPENAI_MODEL", None) or "gpt-4o-mini"
            self.provider = "openai"
        else:
            self.api_key = None
            self.base_url = None
            self.model = model or "unconfigured"
            self.provider = "none"

        self._client = None

    def _get_client(self):
        if not self.api_key:
            raise ValueError(
                "No API key configured for tool-calling agent. Set GROQ_API_KEY or OPENAI_API_KEY."
            )
        if self._client is None:
            from openai import OpenAI
            kwargs: Dict[str, Any] = {
                "api_key": self.api_key,
                "timeout": self.timeout,
                "max_retries": self.max_retries,
            }
            if self.base_url:
                kwargs["base_url"] = self.base_url
            self._client = OpenAI(**kwargs)
        return self._client

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
        timeout: Optional[float] = None,
        job_id: Optional[str] = None,
    ) -> AgentLLMResponse:
        client = self._get_client()

        req_timeout = float(timeout if timeout is not None else self.timeout)
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "timeout": req_timeout,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        job_prefix = f"[{job_id}] " if job_id else ""
        logger.info(
            "%sLLM tool-calling request started [provider=%s, model=%s, timeout=%.1fs, max_retries=%d]",
            job_prefix,
            self.provider,
            self.model,
            req_timeout,
            self.max_retries,
        )

        start_time = time.monotonic()
        try:
            response = client.chat.completions.create(**kwargs)
        except Exception as err:
            elapsed = time.monotonic() - start_time
            exc_category = type(err).__name__
            status_code = getattr(err, "status_code", None)
            if status_code is None and hasattr(err, "response"):
                status_code = getattr(err.response, "status_code", None)
            upstream_code = getattr(err, "code", None)

            raw_msg = str(err)
            sanitized_msg = _sanitize_diagnostic_text(raw_msg, self.api_key)

            diag_parts = [
                f"provider={self.provider}",
                f"model={self.model}",
                f"exception={exc_category}",
            ]
            if status_code is not None:
                diag_parts.append(f"status_code={status_code}")
            if upstream_code is not None:
                diag_parts.append(f"code={upstream_code}")

            diag_str = " ".join(diag_parts)
            logger.error(
                "%sLLM tool-calling API failure in %.2fs [%s]: %s",
                job_prefix,
                elapsed,
                diag_str,
                sanitized_msg,
            )

            status_str = f" HTTP {status_code}" if status_code is not None else ""
            code_str = f" code={upstream_code}" if upstream_code is not None else ""
            raise RuntimeError(
                f"LLM tool-calling error ({self.provider}/{self.model} - {exc_category}{status_str}{code_str}): {sanitized_msg}"
            ) from err

        elapsed = time.monotonic() - start_time
        choice = response.choices[0]
        msg = choice.message
        content = msg.content
        tool_calls: List[ToolCall] = []

        if getattr(msg, "tool_calls", None):
            for tc in msg.tool_calls:
                tool_calls.append(
                    ToolCall(
                        id=tc.id,
                        name=tc.function.name,
                        arguments=tc.function.arguments,
                    )
                )

        logger.info(
            "%sLLM tool-calling request completed in %.2fs [provider=%s, model=%s, tool_calls=%d, finish_reason=%s]",
            job_prefix,
            elapsed,
            self.provider,
            self.model,
            len(tool_calls),
            choice.finish_reason,
        )

        return AgentLLMResponse(
            content=content,
            tool_calls=tool_calls,
            finish_reason=choice.finish_reason,
        )


class MockToolCallingClient(BaseLLMClient):
    """Mock client for offline deterministic testing of agent loops."""

    def __init__(
        self,
        responses: Optional[List[AgentLLMResponse | Callable[..., AgentLLMResponse]]] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
    ):
        self.responses: List[Any] = list(responses) if responses else []
        self.call_history: List[Dict[str, Any]] = []
        self.timeout = timeout
        self.max_retries = max_retries

    def queue_response(self, response: AgentLLMResponse | Callable[..., AgentLLMResponse]) -> None:
        self.responses.append(response)

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
        timeout: Optional[float] = None,
        job_id: Optional[str] = None,
    ) -> AgentLLMResponse:
        self.call_history.append({
            "messages": messages,
            "tools": tools,
            "temperature": temperature,
            "timeout": timeout,
            "job_id": job_id,
        })
        if not self.responses:
            return AgentLLMResponse(
                content="Grounded default response from mock agent.",
                tool_calls=[],
                finish_reason="stop",
            )

        next_item = self.responses.pop(0)
        if callable(next_item):
            return next_item(messages, tools)
        return next_item
