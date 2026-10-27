"""
LLM Client Interface for Real Tool Calling in AgriAdvisor.

Supports OpenAI-compatible providers (Groq and OpenAI) with automatic credential
detection, secure error handling without credential leakage, and mock clients
for deterministic automated testing.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from config import Config


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
    ) -> AgentLLMResponse:
        raise NotImplementedError


class OpenAIToolCallingClient(BaseLLMClient):
    """
    OpenAI-compatible LLM client supporting native tool calling.
    Automatically prioritizes configured keys (Groq ultra-fast or OpenAI).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
    ):
        groq_key = os.getenv("GROQ_API_KEY") or getattr(Config, "GROQ_API_KEY", None)
        openai_key = os.getenv("OPENAI_API_KEY") or getattr(Config, "OPENAI_API_KEY", None)

        if api_key:
            self.api_key = api_key
            self.base_url = base_url
            self.model = model or "gpt-4o-mini"
            self.provider = "custom"
        elif groq_key:
            self.api_key = groq_key
            self.base_url = base_url or "https://api.groq.com/openai/v1"
            # Prefer Llama-3.3-70b-versatile for Groq function calling
            configured_model = os.getenv("AGENT_LLM_MODEL") or model
            if not configured_model or "qwen3.8" in configured_model.lower():
                self.model = "llama-3.3-70b-versatile"
            else:
                self.model = configured_model
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
            kwargs: Dict[str, Any] = {"api_key": self.api_key}
            if self.base_url:
                kwargs["base_url"] = self.base_url
            self._client = OpenAI(**kwargs)
        return self._client

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
    ) -> AgentLLMResponse:
        client = self._get_client()

        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"

        try:
            response = client.chat.completions.create(**kwargs)
        except Exception as err:
            err_msg = str(err)
            if self.api_key:
                err_msg = err_msg.replace(self.api_key, "[REDACTED]")
            raise RuntimeError(f"LLM tool-calling error ({self.provider}): {err_msg}") from err

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
    ):
        self.responses: List[Any] = list(responses) if responses else []
        self.call_history: List[Dict[str, Any]] = []

    def queue_response(self, response: AgentLLMResponse | Callable[..., AgentLLMResponse]) -> None:
        self.responses.append(response)

    def chat_completion(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.2,
    ) -> AgentLLMResponse:
        self.call_history.append({
            "messages": messages,
            "tools": tools,
            "temperature": temperature,
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
