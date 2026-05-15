# Sentinel-Jedi MCP Server

> **Phase 2 — MAGIC Framework Integration**
> Custom Model Context Protocol server for real-time KQL validation,
> self-correction, and MITRE ATT&CK mapping inside any MCP-compatible host.

---

## Overview

The Sentinel-Jedi MCP server exposes eight tools to your AI assistant:

| Tool | Description |
|---|---|
| `validate_sentinel_kql` | Safe syntax + schema check via `\| take 0 \| getschema` |
| `suggest_kql_fix` | Deterministic MAGIC heuristics for common KQL footguns |
| `self_correct_and_validate` | Full correction loop: fix → re-validate in one call |
| `map_kql_to_mitre` | Maps query patterns to MITRE ATT&CK techniques (keyword + STIX) |
| `generate_navigator_layer` | Outputs ATT&CK Navigator JSON for coverage heatmaps |
| `get_actor_ttps` | Fetches live TTP list for a named threat actor via TAXII |
| `compare_actor_overlap` | Finds shared techniques between two threat actors |
| `generate_prompt_iterations` | Prompt refinement simulator for AI workflow tuning |

---

## Architecture

```
MCP Host (Claude Desktop / VS Code / Code Jedi)
        │
        │  stdio / SSE transport
        ▼
┌─────────────────────────────────┐
│   Sentinel-Jedi MCP Server      │
│   (fastmcp, Python 3.11+)       │
│                                 │
│  ┌─────────────────────────┐    │
│  │  MAGIC Correction Rules │    │
│  │  (deterministic pass)   │    │
│  └────────────┬────────────┘    │
│               │                 │
│  ┌────────────▼────────────┐    │
│  │  Log Analytics REST API │    │
│  │  (getschema validation) │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
        │
        ▼
  Azure Log Analytics Workspace
  (Microsoft Sentinel Data Lake)
```

---

## Prerequisites

- Python 3.11+
- Access to a Microsoft Sentinel / Log Analytics workspace
- Azure credentials (one of):
  - Service principal (`AZURE_CLIENT_ID` + `AZURE_CLIENT_SECRET` + `AZURE_TENANT_ID`)
  - Azure CLI logged in (`az login`)
  - Managed identity (when running in Azure)

---

## Installation

```bash
# From the repository root
pip install -r mcp_server/requirements.txt
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SENTINEL_WORKSPACE_ID` | ✅ | Log Analytics workspace GUID |
| `AZURE_TENANT_ID` | ✅ | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | ⚡ | Service-principal client ID (or use `az login`) |
| `AZURE_CLIENT_SECRET` | ⚡ | Service-principal secret |
| `MCP_TRANSPORT` | ❌ | `stdio` (default) or `sse` |

### Claude Desktop

Copy `mcp_server/config_examples/claude_desktop_config.json` into your
`claude_desktop_config.json`, updating the `cwd` and `env` values:

```json
{
  "mcpServers": {
    "sentinel-jedi": {
      "command": "python",
      "args": ["-m", "mcp_server.sentinel_jedi"],
      "cwd": "/path/to/Sentinel-Copilot",
      "env": {
        "SENTINEL_WORKSPACE_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "AZURE_TENANT_ID": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      }
    }
  }
}
```

### VS Code

See `mcp_server/config_examples/vscode_mcp_settings.json`.

---

## Purple Team Workflow Examples

### 1. Validate a new detection rule

Ask your AI assistant:
> *"Validate this KQL for a Sentinel analytic rule:*
> `SecurityEvent | where EventID == 4624`"

The assistant calls `validate_sentinel_kql` → hits the Log Analytics API →
returns the column schema or a precise error message.

### 2. Fix a broken query

> *"Fix this failing KQL: `SecurityIncident where Status == 'Closed' summarize count()`"*

The assistant calls `suggest_kql_fix` → applies MAGIC rules → returns:
```
[missing_pipe_before_operator] Inserted missing pipe before 'where'
[missing_pipe_before_operator] Inserted missing pipe before 'summarize'

Corrected query:
SecurityIncident | where Status == 'Closed' | summarize count()
```

### 3. Map to MITRE ATT&CK

> *"What ATT&CK techniques does this query cover?*
> `DeviceNetworkEvents | where RemotePort == 443`"

Returns:
```
[T1071] Application Layer Protocol
  Tactic: Command and Control
  Description: Network telemetry — check for beaconing or C2 traffic.
```

### 4. One-shot correct and validate

> *"Self-correct and re-validate: `SigninLogs where ResultType != 0 summarize count() by UserPrincipalName`"*

Calls `self_correct_and_validate` → applies fixes → re-validates → reports
final status in one turn.

---

## MAGIC Correction Rules

The deterministic correction pass catches well-known KQL footguns without
requiring an LLM call:

| Rule | Trigger | Fix |
|---|---|---|
| `missing_pipe_before_operator` | SyntaxError or bare operator keyword | Inserts `\|` before tabular operator |
| `count_without_dcount` | `count(UniqueXxx)` pattern | Replaces with `dcount()` |
| `join_kind_missing` | `join (` without `kind=` | Adds `kind=innerunique` |
| `ago_bare_number` | `ago(7)` with no unit | Adds `d` unit → `ago(7d)` |

---

## MITRE ATT&CK Coverage

The `map_kql_to_mitre` tool matches against 10 built-in patterns spanning:

- **T1078** Valid Accounts (logon success)
- **T1110** Brute Force (logon failures)
- **T1059** Command and Scripting Interpreter (process creation)
- **T1071** Application Layer Protocol (network events)
- **T1078.002** Domain Accounts (identity logon)
- **T1059.001** PowerShell (scripting engine launch)
- **T1485** Data Destruction (resource deletion)
- **T1078.004** Cloud Accounts (Azure AD sign-in)
- **T1562** Impair Defenses (incident manipulation)
- **T1071.004** DNS (DNS events)

Extend `MITRE_MAP` in `sentinel_jedi.py` to add coverage for your environment.

---

## Threat Actor TTP Lookup

`get_actor_ttps` and `compare_actor_overlap` connect to MITRE's live TAXII
server via the `attackcti` library. No local STIX file needed.

**2026 threat context baked in:**
- **APT29 (Midnight Blizzard)** — Cloud Administration Commands (T1651),
  Azure Run Command abuse, Microsoft Graph API for C2 concealment.
- **Lazarus Group** — Remote Access Hardware (T1219.003), PiKVM laptop farms
  for jurisdiction-hopping, AI-channel C2 (SesameOp-style backdoors).

Example workflow:
> *"What techniques does Lazarus Group use that I haven't covered yet?"*

1. Assistant calls `get_actor_ttps("Lazarus Group")` → gets TTP list.
2. Assistant calls `map_kql_to_mitre` on your existing queries → gets covered IDs.
3. Assistant identifies gaps and suggests new KQL detection rules.
4. Assistant calls `generate_navigator_layer` with the gap IDs for a stakeholder heatmap.

---

## ATT&CK Navigator Layers

`generate_navigator_layer` writes a JSON file compatible with the
[MITRE ATT&CK Navigator](https://mitre-attack.github.io/attack-navigator/).

Active detections appear in **green (#00c853)**. Import via:
*Layer → Open Existing Layer → Upload from local.*

---

## Prompt Engineering Tool

`generate_prompt_iterations` simulates iterative prompt refinement workflows.
Use it to test MAGIC correction prompts or detection-rule generation prompts
before committing them to your CI/CD pipeline.

```
base_prompt: "Generate a KQL rule for lateral movement detection."
variables:   {"log_source": "SecurityEvent", "sensitivity": "high"}
iterations:  3
```

The tool returns a structured JSON log of `user`/`assistant` message pairs,
showing how variable mutations affect prompt shape — useful for identifying
prompt brittleness before production.

---

## Extending the Server

Add a new tool by decorating any `async` function with `@mcp.tool()`:

```python
@mcp.tool()
async def my_custom_tool(query: str) -> str:
    """Tool description shown to the AI assistant."""
    # implementation
    return "result"
```

The docstring becomes the tool description visible to the MCP host.
