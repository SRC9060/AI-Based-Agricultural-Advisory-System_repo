# ⚙️ AgriAdvisor Configurable AI Workflows

## 1. Overview & Motivation

In production AI systems, a single monolithic agent with access to all system tools is often suboptimal:
1. **Tool Overload & Hallucination Risk:** Supplying dozens of tool definitions increases LLM token consumption and increases the likelihood that a model invokes irrelevant tools or misroutes queries.
2. **Task Specialization:** An agronomic disease query only requires access to crop health manuals and government subsidy schemes, whereas a market decision query only needs live mandi prices and local weather forecasts.
3. **Reasoning Bounds Control:** Highly focused workflows can run with tighter loop limits (e.g., 3 rounds) to cut latency and API token costs, whereas comprehensive workflows can be granted more reasoning rounds.
4. **Agility Without Redeploying Code:** Declarative JSON configuration allows teams to define, tune, enable, or disable workflow profiles without writing or deploying new Python code.

The **AgriAdvisor Workflow Registry** (`services.workflow_registry`) decouples workflow orchestration from hardcoded Python logic while enforcing strict security boundaries.

---

## 2. Architecture & Security Invariants

```mermaid
flowchart TD
    Config["backend/workflows/agent_workflows.json"] -->|Loaded & Validated| WReg["WorkflowRegistry"]
    TReg["Trusted Python ToolRegistry\n(Read-Only allowlist)"] -->|Validation Check| WReg

    subgraph Security Boundary
        WReg -->|Strict Check| Check{"All allowed_tools\nin ToolRegistry?"}
        Check -->|No| Reject["Reject: WorkflowConfigValidationError"]
        Check -->|Yes| Build["Build Scoped ToolRegistry"]
    end

    Build --> Profile["WorkflowDefinition\n(scoped tools, max_rounds, system_prompt)"]
    Profile --> API["FastAPI (/agent/chat, /agent/jobs)"]
    Profile --> Worker["AgentWorker (Background Queue)"]
    Profile --> Runner["AgentRunner (Scoped reasoning loop)"]
```

### Security Invariants
- **No Arbitrary Code Execution:** The workflow configuration is strictly pure JSON. The system never evaluates Python expressions, executes scripts, or dynamically imports modules (`eval`, `exec`, `__import__`).
- **Tool Allowlist Validation:** Every tool name in `allowed_tools` must strictly pre-exist in the trusted Python `ToolRegistry`. Unregistered tool names immediately fail validation on startup or test loading.
- **Runtime Tool Isolation:** At runtime, `AgentRunner` receives a `scoped_registry` containing *only* the tools declared for that profile.
  - JSON schemas sent to the LLM contain only allowlisted tools.
  - If a model hallucinates or attempts to call a disallowed tool, the scoped registry strictly rejects execution (`Unknown tool '...'`).

---

## 3. Configuration Schema & Initial Profiles

The default workflow configuration lives in [`backend/workflows/agent_workflows.json`](../backend/workflows/agent_workflows.json).

### Profile Schema
| Field | Type | Constraints | Description |
|---|---|---|---|
| `name` | string | `^[a-z0-9_-]+$`, 1–50 chars | Unique, stable identifier for the workflow profile. |
| `description` | string | 1–500 chars | Human-readable explanation of the profile's purpose. |
| `allowed_tools` | list[string] | Non-empty, unique | Allowlist of tool names registered in `ToolRegistry`. |
| `max_rounds` | integer | `1 <= max_rounds <= 10` | Maximum reasoning and tool-calling turns allowed. |
| `system_prompt` | string | 10–4000 chars | Tailored system prompt establishing persona and constraints. |
| `enabled` | boolean | default `true` | When `false`, requests to this workflow are safely rejected. |

### Built-in Workflow Profiles

#### 1. `general_advisory`
- **Scope:** Complete agricultural assistance.
- **Allowed Tools:**
  - `search_agricultural_knowledge_base`
  - `get_current_weather`
  - `get_market_prices`
  - `search_government_schemes`
- **Max Rounds:** 5

#### 2. `crop_care`
- **Scope:** Agronomy, disease identification, soil health, and government subsidies.
- **Allowed Tools:**
  - `search_agricultural_knowledge_base`
  - `search_government_schemes`
- **Max Rounds:** 4

#### 3. `market_and_weather`
- **Scope:** Real-time APMC mandi market commodity prices and localized weather forecasts.
- **Allowed Tools:**
  - `get_market_prices`
  - `get_current_weather`
- **Max Rounds:** 3

---

## 4. API Endpoints

### 1. List Available Workflows
```http
GET /agent/workflows
Authorization: Bearer <access_token>
```

#### Response (`200 OK`)
```json
{
  "workflows": [
    {
      "name": "general_advisory",
      "description": "Comprehensive agricultural advisory covering agronomy, live weather, mandi market prices, and government schemes.",
      "allowed_tools": [
        "search_agricultural_knowledge_base",
        "get_current_weather",
        "get_market_prices",
        "search_government_schemes"
      ],
      "max_rounds": 5,
      "enabled": true
    },
    {
      "name": "crop_care",
      "description": "Focused agronomic advisory specializing in crop diseases, pest controls, soil health, and government agricultural subsidies.",
      "allowed_tools": [
        "search_agricultural_knowledge_base",
        "search_government_schemes"
      ],
      "max_rounds": 4,
      "enabled": true
    },
    {
      "name": "market_and_weather",
      "description": "Real-time APMC mandi market commodity prices and localized weather forecasts for harvest and marketing decisions.",
      "allowed_tools": [
        "get_market_prices",
        "get_current_weather"
      ],
      "max_rounds": 3,
      "enabled": true
    }
  ]
}
```
*(Notice: internal system prompts and server filesystem paths are never leaked in the metadata response.)*

---

### 2. Synchronous Agent Execution with Workflow
```http
POST /agent/chat
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "user_id": 1,
  "message": "What is the tomato price in Kolar?",
  "workflow": "market_and_weather"
}
```

If the `workflow` parameter is omitted, it defaults to `"general_advisory"` for backward compatibility.
If an unknown or disabled workflow is provided, the API returns:
```json
{
  "detail": "Unknown workflow 'hacked_workflow'. Available workflows: general_advisory, crop_care, market_and_weather."
}
```

---

### 3. Asynchronous Background Job with Workflow
```http
POST /agent/jobs
Authorization: Bearer <access_token>
Idempotency-Key: farmer_req_001
Content-Type: application/json

{
  "message": "How do I manage stem borer in paddy?",
  "workflow": "crop_care"
}
```

#### Behavior & Idempotency Rules:
- The workflow name is validated before the job is queued (`400 Bad Request` if invalid).
- The normalized workflow name is stored directly in the `payload` JSON.
- The workflow name is included in the canonical SHA-256 payload hash (`payload_hash`).
- Reusing the same `Idempotency-Key` with a different `workflow` returns `409 Conflict`.
- Reusing the same `Idempotency-Key` with the identical `workflow` returns `200 OK` with the existing job status.
- Background worker processes (`services.agent_worker`) unpack the selected workflow and invoke `AgentRunner` strictly under the scoped tools and reasoning bounds of that workflow.

---

---

## 5. Frontend Chat Integration & UI Usage

AgriAdvisor features full frontend integration for AI Agent workflows and database-backed background jobs directly in [`frontend/app/chat/page.tsx`](../frontend/app/chat/page.tsx).

### 1. Standard Chat vs. AI Agent Mode
- **Standard Chat (Default):** Retains the original synchronous `/chat` endpoint. Uses existing intent detection and response generation. Existing users are never silently moved to a different backend architecture.
- **AI Agent Mode:** Enables multi-turn tool-calling and the database-backed background job queue. The user can switch modes anytime via the mode toggle bar at the top of the chat area.

### 2. Dynamic Workflow Selection
When AI Agent mode is activated:
- The UI queries `GET /agent/workflows` via the authenticated same-origin proxy (`/api/proxy/agent/workflows`), which automatically forwards the HttpOnly session token.
- Available workflows (`general_advisory`, `crop_care`, `market_and_weather`) populate the workflow dropdown selector.
- The UI displays a live capability description for the selected workflow.
- If workflow loading fails (e.g. network interruption), the UI presents a clear error state with a "Retry" button and disables submission rather than silently falling back to Standard Chat.

### 3. Background Job Queue & Polling
- When a question is submitted in AI Agent mode, the client posts to `POST /agent/jobs` with:
  - `message`: Farmer's question text.
  - `session_id`: Current chat session ID (or null).
  - `language`: Selected UI language.
  - `workflow`: Selected workflow profile name.
  - `Idempotency-Key`: Unique UUID header (`agri_<uuid>`) preventing duplicate queue operations.
- The UI handles HTTP 202 (job newly accepted) and HTTP 200 (deduplicated result).
- The client polls `GET /agent/jobs/{job_id}` at ~1.5-second intervals (up to 30 attempts, ~45 seconds maximum wait).
- The send and voice buttons are disabled during submission and polling to prevent accidental duplicate jobs.
- If polling times out, the client notifies the user that the job is still executing in the background and displays the Job ID, rather than falsely marking the job as failed.

### 4. Actual Tool Execution Metadata & TTS
- When the job reaches `COMPLETED`, the answer is displayed in the chat stream.
- A workflow badge (e.g. `⚡ Crop Care`) and total tool invocation count are displayed directly beneath the answer.
- An expandable `<details>` section lists the executed tool names along with explicit success (`✓`) or failure (`✗`) indicators and result summaries. Live weather or market claims are never fabricated.
- Text-to-speech (`Listen` / `Stop`) remains fully supported for agent answers.
- For `FAILED` jobs, the backend's sanitized `error_summary` is shown to the user.

---

## 6. Adding a New Workflow Safely

To add a new workflow:
1. Ensure the required tools are already implemented and registered in [`backend/services/tool_registry.py`](../backend/services/tool_registry.py).
2. Add a new profile entry to [`backend/workflows/agent_workflows.json`](../backend/workflows/agent_workflows.json):
   ```json
   "weather_only": {
     "name": "weather_only",
     "description": "Specialized fast localized weather updates.",
     "allowed_tools": ["get_current_weather"],
     "max_rounds": 2,
     "system_prompt": "You are a weather specialist. Provide concise forecasts based on tool data.",
     "enabled": true
   }
   ```
3. Run the test suite: `python -m unittest discover -s tests -v`.
   - The test suite automatically validates that all tool names exist and schemas are well-formed.

---

## 7. Testing & Current Limitations

### Automated Tests
- Backend workflow tests: [`backend/tests/test_workflows.py`](../backend/tests/test_workflows.py) (configuration loading, tool allowlist enforcement, bounded rounds, authenticated endpoints, and background worker execution).
- Frontend type checking and production build: `tsc --noEmit` and `npm run build`.

### Current Limitations
- **Read-Only Agricultural Tools:** All current workflows operate over read-only data sources (RAG, OpenWeather, AGMARKNET). Mutating operations (e.g. farm data modification) are not supported via workflows.
- **Worker Execution:** Background jobs require the `agent_worker` service to be running to pick up and process queued tasks.
