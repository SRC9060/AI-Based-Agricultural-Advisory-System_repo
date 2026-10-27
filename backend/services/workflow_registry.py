"""
Schema-validated AI Workflow Registry for AgriAdvisor.

Loads declarative workflow profiles from JSON configuration, validates tool
allowlists against trusted Python tool definitions, and enforces tool isolation
and reasoning bounds at runtime.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ValidationError, field_validator

from services.tool_registry import (
    ToolRegistry,
    create_default_agricultural_tool_registry,
)


class WorkflowRegistryError(ValueError):
    """Base exception for workflow configuration and resolution errors."""


class WorkflowNotFoundError(WorkflowRegistryError):
    """Raised when a requested workflow profile does not exist."""


class WorkflowDisabledError(WorkflowRegistryError):
    """Raised when a requested workflow profile is disabled."""


class WorkflowConfigValidationError(WorkflowRegistryError):
    """Raised when the workflow configuration file is missing, malformed, or invalid."""


# =====================================================================
# Pydantic Schemas for Workflow Configuration
# =====================================================================

class WorkflowProfile(BaseModel):
    name: str = Field(min_length=1, max_length=50, pattern=r"^[a-z0-9_-]+$")
    description: str = Field(min_length=1, max_length=500)
    allowed_tools: List[str] = Field(min_length=1)
    max_rounds: int = Field(default=5, ge=1, le=10)
    system_prompt: str = Field(min_length=10, max_length=4000)
    enabled: bool = True

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("allowed_tools")
    @classmethod
    def validate_unique_tools(cls, values: List[str]) -> List[str]:
        cleaned = [v.strip() for v in values if v and v.strip()]
        if not cleaned:
            raise ValueError("allowed_tools list cannot be empty.")
        if len(cleaned) != len(set(cleaned)):
            raise ValueError("allowed_tools must contain unique tool names.")
        return cleaned


class WorkflowConfigFile(BaseModel):
    version: str = "1.0"
    workflows: Dict[str, WorkflowProfile]


# =====================================================================
# Runtime Workflow Definition
# =====================================================================

@dataclass
class WorkflowDefinition:
    name: str
    description: str
    allowed_tools: List[str]
    max_rounds: int
    system_prompt: str
    enabled: bool
    scoped_registry: ToolRegistry

    def to_metadata(self) -> Dict[str, Any]:
        """Return safe client-facing metadata without internal prompts."""
        return {
            "name": self.name,
            "description": self.description,
            "allowed_tools": list(self.allowed_tools),
            "max_rounds": self.max_rounds,
            "enabled": self.enabled,
        }


def get_default_workflow_config_path() -> Path:
    """Return the absolute path to the default agent workflows JSON file."""
    return Path(__file__).resolve().parent.parent / "workflows" / "agent_workflows.json"


# =====================================================================
# Workflow Registry
# =====================================================================

class WorkflowRegistry:
    """
    Registry managing declarative, schema-validated AI workflows.

    Enforces strict security invariants:
    - Workflows can ONLY reference tools registered in trusted Python code.
    - No dynamic code execution, importlib loading, or arbitrary expressions.
    - Each workflow receives a scoped ToolRegistry exposing only its allowed tools.
    """

    def __init__(
        self,
        config_path: Optional[str | Path] = None,
        tool_registry: Optional[ToolRegistry] = None,
    ):
        self._config_path = Path(config_path) if config_path else get_default_workflow_config_path()
        self._base_tool_registry = tool_registry or create_default_agricultural_tool_registry()
        self._workflows: Dict[str, WorkflowDefinition] = {}
        self._load_and_validate()

    def _load_and_validate(self) -> None:
        if not self._config_path.exists():
            raise WorkflowConfigValidationError(
                f"Workflow configuration file not found at: {self._config_path}"
            )

        try:
            raw_text = self._config_path.read_text(encoding="utf-8")
        except Exception as read_err:
            raise WorkflowConfigValidationError(
                f"Failed reading workflow configuration file: {type(read_err).__name__}"
            ) from read_err

        try:
            raw_json = json.loads(raw_text)
        except Exception as json_err:
            raise WorkflowConfigValidationError(
                f"Malformed JSON in workflow configuration: {type(json_err).__name__}"
            ) from json_err

        try:
            config_file = WorkflowConfigFile.model_validate(raw_json)
        except ValidationError as val_err:
            details = "; ".join(f"{err['loc']}: {err['msg']}" for err in val_err.errors())
            raise WorkflowConfigValidationError(
                f"Workflow configuration schema validation failed: {details}"
            ) from val_err

        registered_tools = set(self._base_tool_registry.list_tool_names())
        parsed_workflows: Dict[str, WorkflowDefinition] = {}

        for profile_key, profile in config_file.workflows.items():
            if profile_key != profile.name:
                raise WorkflowConfigValidationError(
                    f"Workflow key '{profile_key}' does not match workflow name '{profile.name}'."
                )

            # Security validation: all referenced tools must exist in trusted base registry
            unknown_tools = set(profile.allowed_tools) - registered_tools
            if unknown_tools:
                raise WorkflowConfigValidationError(
                    f"Workflow '{profile.name}' references unknown or unverified tool(s): "
                    f"{', '.join(sorted(unknown_tools))}. "
                    f"Available registered tools: {', '.join(sorted(registered_tools))}."
                )

            # Build isolated, scoped tool registry containing ONLY the allowlisted tools
            scoped_reg = ToolRegistry()
            for tool_name in profile.allowed_tools:
                tool_def = self._base_tool_registry.get_tool(tool_name)
                if tool_def:
                    scoped_reg.register(
                        name=tool_def.name,
                        description=tool_def.description,
                        args_schema=tool_def.args_schema,
                        handler=tool_def.handler,
                    )

            parsed_workflows[profile.name] = WorkflowDefinition(
                name=profile.name,
                description=profile.description,
                allowed_tools=list(profile.allowed_tools),
                max_rounds=profile.max_rounds,
                system_prompt=profile.system_prompt,
                enabled=profile.enabled,
                scoped_registry=scoped_reg,
            )

        if not parsed_workflows:
            raise WorkflowConfigValidationError(
                "Workflow configuration must define at least one workflow profile."
            )

        self._workflows = parsed_workflows

    def list_workflow_names(self, include_disabled: bool = False) -> List[str]:
        """List workflow names."""
        return [
            name
            for name, wf in self._workflows.items()
            if include_disabled or wf.enabled
        ]

    def list_workflows(self, include_disabled: bool = False) -> List[Dict[str, Any]]:
        """List safe metadata for all available workflows."""
        return [
            wf.to_metadata()
            for wf in self._workflows.values()
            if include_disabled or wf.enabled
        ]

    def has_workflow(self, name: str, include_disabled: bool = False) -> bool:
        """Check if a workflow exists and meets enabled criteria."""
        wf = self._workflows.get(name.strip().lower() if name else "")
        if not wf:
            return False
        return include_disabled or wf.enabled

    def get_workflow(self, name: str) -> WorkflowDefinition:
        """
        Retrieve a validated workflow definition by name.
        Rejects unknown or disabled workflow profiles.
        """
        normalized_name = (name or "").strip().lower()
        if not normalized_name or normalized_name not in self._workflows:
            available = ", ".join(self.list_workflow_names(include_disabled=False))
            raise WorkflowNotFoundError(
                f"Unknown workflow '{name}'. Available workflows: {available}."
            )

        wf = self._workflows[normalized_name]
        if not wf.enabled:
            raise WorkflowDisabledError(
                f"Workflow '{normalized_name}' is currently disabled."
            )

        return wf

    def create_runner(
        self,
        name: str,
        llm_client: Optional[Any] = None,
    ) -> Any:
        """
        Construct a bounded AgentRunner configured strictly for the specified workflow.
        """
        from services.agent_runner import AgentRunner
        from services.agent_llm import OpenAIToolCallingClient

        wf = self.get_workflow(name)
        client = llm_client or OpenAIToolCallingClient()
        return AgentRunner(
            tool_registry=wf.scoped_registry,
            llm_client=client,
            max_rounds=wf.max_rounds,
            system_prompt=wf.system_prompt,
        )


# =====================================================================
# Singleton Management
# =====================================================================

_default_workflow_registry: Optional[WorkflowRegistry] = None


def get_default_workflow_registry() -> WorkflowRegistry:
    """Retrieve or lazily initialize the singleton workflow registry."""
    global _default_workflow_registry
    if _default_workflow_registry is None:
        _default_workflow_registry = WorkflowRegistry()
    return _default_workflow_registry


def set_default_workflow_registry(registry: Optional[WorkflowRegistry]) -> None:
    """Override or reset the singleton workflow registry (primarily for tests)."""
    global _default_workflow_registry
    _default_workflow_registry = registry
