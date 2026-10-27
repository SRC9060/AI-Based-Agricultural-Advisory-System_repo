"""
Schema-driven Tool Registry for AgriAdvisor AI Agent.

Registers verified, read-only agricultural tools with Pydantic input validation,
generates OpenAI/Groq compatible tool definitions, and executes tools safely with
error sanitization.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Type
from pydantic import BaseModel, Field, ValidationError


# =====================================================================
# Pydantic Input Schemas for Agricultural Tools
# =====================================================================

class SearchKnowledgeBaseInput(BaseModel):
    query: str = Field(
        ...,
        description=(
            "Keywords or query to search in the agricultural RAG knowledge base "
            "regarding crops, diseases, pests, fertilizers, soil health, and farming practices."
        ),
        min_length=2,
        max_length=500,
    )


class GetWeatherInput(BaseModel):
    location: str = Field(
        ...,
        description="City, town, or district name in India (e.g. 'Mandya', 'Mysuru', 'Bagalkot', 'Pune').",
        min_length=2,
        max_length=100,
    )


class GetMarketPricesInput(BaseModel):
    commodity: str = Field(
        ...,
        description="The agricultural crop or commodity name (e.g. 'Tomato', 'Paddy(Common)', 'Wheat', 'Onion', 'Cotton', 'Maize').",
        min_length=2,
        max_length=100,
    )
    state: str = Field(
        ...,
        description="Indian state name (e.g. 'Karnataka', 'Maharashtra', 'Punjab').",
        min_length=2,
        max_length=100,
    )
    district: str = Field(
        ...,
        description="District name within the state (e.g. 'Kolar', 'Mandya', 'Mysuru', 'Bangalore Rural').",
        min_length=2,
        max_length=100,
    )


class SearchGovernmentSchemesInput(BaseModel):
    query: str = Field(
        ...,
        description=(
            "Keywords or question regarding Indian central or state government agricultural schemes, "
            "subsidies, PM-KISAN, crop insurance (PMFBY), or machinery support."
        ),
        min_length=2,
        max_length=500,
    )


# =====================================================================
# Normalized Handlers Reusing Existing Services
# =====================================================================

def handle_search_knowledge_base(params: SearchKnowledgeBaseInput) -> Dict[str, Any]:
    """Execute vector search over curated agronomic documentation."""
    try:
        from services.knowledge_base import search_knowledge_base

        docs = search_knowledge_base(params.query)
        if not docs:
            return {
                "status": "not_found",
                "message": f"No relevant agronomic documents found for '{params.query}'.",
                "documents": [],
            }

        normalized = []
        for doc in docs[:3]:  # Top 3 relevant passages
            source = (
                Path(doc.metadata.get("source", "knowledge_base")).name
                if doc.metadata
                else "document"
            )
            folder = doc.metadata.get("folder", "general") if doc.metadata else "general"
            content = doc.page_content.strip()[:400] if doc.page_content else ""
            normalized.append({
                "source": source,
                "folder": folder,
                "content": content,
            })

        return {
            "status": "success",
            "count": len(normalized),
            "documents": normalized,
        }
    except Exception as err:
        return {
            "status": "error",
            "message": f"Knowledge base search unavailable: {type(err).__name__}",
        }


def handle_get_weather(params: GetWeatherInput) -> Dict[str, Any]:
    """Fetch verified live weather from OpenWeather service."""
    try:
        from services.weather_service import get_weather

        res = get_weather(params.location)
        if not isinstance(res, dict):
            return {"status": "error", "message": "Weather service returned invalid response format."}
        if "error" in res:
            return {
                "status": "unavailable",
                "message": res.get("error", "Weather data currently unavailable."),
            }

        return {
            "status": "success",
            "city": res.get("city", params.location),
            "temperature_celsius": res.get("temperature"),
            "humidity_percent": res.get("humidity"),
            "condition": res.get("weather"),
            "wind_speed_mps": res.get("wind_speed"),
        }
    except Exception as err:
        return {
            "status": "error",
            "message": f"Weather lookup failed: {type(err).__name__}",
        }


def handle_get_market_prices(params: GetMarketPricesInput) -> Dict[str, Any]:
    """Fetch verified live APMC mandi prices from AGMARKNET service."""
    try:
        from services.agmarknet import get_market_price

        res = get_market_price(
            commodity=params.commodity,
            state=params.state,
            district=params.district,
        )
        return {
            "status": "success",
            "commodity": res.commodity,
            "state": res.state,
            "district": res.district,
            "market": res.market,
            "modal_price_per_quintal": res.modal_price,
            "min_price_per_quintal": res.min_price,
            "max_price_per_quintal": res.max_price,
            "arrival_date": res.arrival_date,
        }
    except Exception as err:
        return {
            "status": "unavailable",
            "message": (
                f"No market records available for {params.commodity} in "
                f"{params.district}, {params.state}: {type(err).__name__}"
            ),
        }


def handle_search_government_schemes(params: SearchGovernmentSchemesInput) -> Dict[str, Any]:
    """Fetch verified government scheme guidelines and subsidy details."""
    try:
        from services.knowledge_base import search_government_schemes

        docs = search_government_schemes(params.query)
        if not docs:
            return {
                "status": "not_found",
                "message": f"No scheme guidelines found matching '{params.query}'.",
                "schemes": [],
            }

        normalized = []
        for doc in docs[:3]:
            source = (
                Path(doc.metadata.get("source", "scheme_guideline")).name
                if doc.metadata
                else "scheme_doc"
            )
            content = doc.page_content.strip()[:400] if doc.page_content else ""
            normalized.append({
                "source": source,
                "content": content,
            })

        return {
            "status": "success",
            "count": len(normalized),
            "schemes": normalized,
        }
    except Exception as err:
        return {
            "status": "error",
            "message": f"Scheme search unavailable: {type(err).__name__}",
        }


# =====================================================================
# Tool Definition & Registry
# =====================================================================

@dataclass
class ToolDefinition:
    name: str
    description: str
    args_schema: Type[BaseModel]
    handler: Callable[[Any], Dict[str, Any]]


class ToolRegistry:
    """Registry managing allowlisted tools and schema conversions."""

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}

    def register(
        self,
        name: str,
        description: str,
        args_schema: Type[BaseModel],
        handler: Callable[[Any], Dict[str, Any]],
    ) -> None:
        self._tools[name] = ToolDefinition(
            name=name,
            description=description.strip(),
            args_schema=args_schema,
            handler=handler,
        )

    def get_tool(self, name: str) -> Optional[ToolDefinition]:
        return self._tools.get(name)

    def list_tool_names(self) -> List[str]:
        return list(self._tools.keys())

    def get_openai_tools(self) -> List[Dict[str, Any]]:
        """Generate OpenAI/Groq compatible tool definitions with JSON Schemas."""
        tools = []
        for tool in self._tools.values():
            schema = tool.args_schema.model_json_schema()
            properties = schema.get("properties", {})
            required = schema.get("required", [])

            tools.append({
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": {
                        "type": "object",
                        "properties": properties,
                        "required": required,
                    },
                },
            })
        return tools

    def execute(self, tool_name: str, raw_args: Any) -> Dict[str, Any]:
        """
        Safely validate and execute a requested tool.
        Rejects unknown tools, handles invalid JSON/types, and suppresses tracebacks.
        """
        tool = self._tools.get(tool_name)
        if not tool:
            return {
                "success": False,
                "error": (
                    f"Unknown tool '{tool_name}'. Available allowlisted tools: "
                    f"{', '.join(self._tools.keys())}"
                ),
            }

        # Parse string arguments if received from LLM
        if isinstance(raw_args, str):
            try:
                parsed_args = json.loads(raw_args)
            except Exception as json_err:
                return {
                    "success": False,
                    "error": f"Invalid JSON arguments supplied for '{tool_name}': {str(json_err)}",
                }
        elif isinstance(raw_args, dict):
            parsed_args = raw_args
        else:
            return {
                "success": False,
                "error": (
                    f"Tool arguments must be a JSON object or string, "
                    f"got {type(raw_args).__name__}"
                ),
            }

        # Validate with Pydantic model
        try:
            validated_input = tool.args_schema.model_validate(parsed_args)
        except ValidationError as val_err:
            error_details = []
            for err in val_err.errors():
                loc = " -> ".join(str(p) for p in err.get("loc", []))
                error_details.append(f"{loc}: {err.get('msg')}")
            return {
                "success": False,
                "error": f"Invalid arguments for '{tool_name}': {'; '.join(error_details)}",
            }

        # Safe execution
        try:
            result = tool.handler(validated_input)
            return {
                "success": True,
                "result": result,
            }
        except Exception as exec_err:
            return {
                "success": False,
                "error": f"Tool execution error in '{tool_name}': {type(exec_err).__name__}",
            }


def create_default_agricultural_tool_registry() -> ToolRegistry:
    """Create and configure the default read-only agricultural tool registry."""
    registry = ToolRegistry()

    registry.register(
        name="search_agricultural_knowledge_base",
        description=(
            "Search curated agronomic guidelines, crop diseases, pest controls, "
            "soil health recommendations, and farming best practices."
        ),
        args_schema=SearchKnowledgeBaseInput,
        handler=handle_search_knowledge_base,
    )

    registry.register(
        name="get_current_weather",
        description="Retrieve verified live weather details (temperature, humidity, condition, wind) for an Indian location.",
        args_schema=GetWeatherInput,
        handler=handle_get_weather,
    )

    registry.register(
        name="get_market_prices",
        description="Retrieve verified current APMC mandi market prices for a commodity in a specific Indian district and state.",
        args_schema=GetMarketPricesInput,
        handler=handle_get_market_prices,
    )

    registry.register(
        name="search_government_schemes",
        description="Search official guidelines and eligibility criteria for Indian agricultural government schemes and subsidies.",
        args_schema=SearchGovernmentSchemesInput,
        handler=handle_search_government_schemes,
    )

    return registry
