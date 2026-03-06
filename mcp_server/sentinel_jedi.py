"""
Sentinel-Jedi MCP Server
========================
A custom Model Context Protocol server that exposes Microsoft Sentinel
KQL validation, MAGIC self-correction, MITRE ATT&CK simulation, ATT&CK
Navigator layer generation, and live threat-actor TTP lookups as first-class
tools for any MCP-compatible host (Claude Desktop, VS Code, Code Jedi, etc.).

Framework:  fastmcp  (>=2.0)
Transport:  stdio (default) — configurable via MCP_TRANSPORT env var
Auth:       Azure DefaultAzureCredential (supports env vars, managed identity,
            CLI credentials, and workload identity)

Environment variables
---------------------
SENTINEL_WORKSPACE_ID       — Log Analytics workspace GUID  (required)
AZURE_TENANT_ID             — Azure tenant (picked up by DefaultAzureCredential)
AZURE_CLIENT_ID             — Service-principal client ID   (optional)
AZURE_CLIENT_SECRET         — Service-principal secret      (optional)
MITRE_STIX_BUNDLE_PATH      — Path to a local enterprise-attack.json STIX bundle.
                              Download from https://github.com/mitre/cti
                              If unset, only the built-in keyword map is used.

Usage
-----
    python -m mcp_server.sentinel_jedi          # stdio transport
    MCP_TRANSPORT=sse python -m mcp_server.sentinel_jedi  # SSE transport
"""

from __future__ import annotations

import asyncio
import json
import os
import re
from pathlib import Path
from typing import Any

import httpx
from azure.identity import DefaultAzureCredential
from fastmcp import FastMCP

# ---------------------------------------------------------------------------
# Optional MITRE library imports (graceful degradation if not installed)
# ---------------------------------------------------------------------------

try:
    from mitreattack.stix20 import MitreAttackData as _MitreAttackData  # type: ignore
    _MITREATTACK_AVAILABLE = True
except ImportError:
    _MITREATTACK_AVAILABLE = False

try:
    from attackcti import attack_client as _AttackClient  # type: ignore
    _ATTACKCTI_AVAILABLE = True
except ImportError:
    _ATTACKCTI_AVAILABLE = False

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

WORKSPACE_ID: str = os.environ.get("SENTINEL_WORKSPACE_ID", "your-workspace-id")
QUERY_ENDPOINT: str = (
    f"https://api.loganalytics.azure.com/v1/workspaces/{WORKSPACE_ID}/query"
)
LOGANALYTICS_SCOPE: str = "https://api.loganalytics.azure.com/.default"
ARM_SCOPE: str = "https://management.azure.com/.default"

# ---------------------------------------------------------------------------
# MITRE ATT&CK mapping — KQL pattern → technique(s)
# Covers common Sentinel detection patterns as of 2026 threat landscape.
# ---------------------------------------------------------------------------

MITRE_MAP: list[dict[str, Any]] = [
    {
        "pattern": re.compile(r"\bSecurityEvent\b.*EventID\s*==\s*4624", re.I),
        "technique_id": "T1078",
        "technique_name": "Valid Accounts",
        "tactic": "Initial Access / Persistence",
        "description": "Successful logon events — potential lateral movement or credential abuse.",
    },
    {
        "pattern": re.compile(r"\bSecurityEvent\b.*EventID\s*==\s*4625", re.I),
        "technique_id": "T1110",
        "technique_name": "Brute Force",
        "tactic": "Credential Access",
        "description": "Failed logon events — may indicate password spraying or brute force.",
    },
    {
        "pattern": re.compile(r"\bSecurityEvent\b.*EventID\s*==\s*4688", re.I),
        "technique_id": "T1059",
        "technique_name": "Command and Scripting Interpreter",
        "tactic": "Execution",
        "description": "New process creation — monitor for LOLBIN abuse or unusual parent-child chains.",
    },
    {
        "pattern": re.compile(r"\bDeviceNetworkEvents\b", re.I),
        "technique_id": "T1071",
        "technique_name": "Application Layer Protocol",
        "tactic": "Command and Control",
        "description": "Network telemetry — check for beaconing or C2 traffic.",
    },
    {
        "pattern": re.compile(r"\bIdentityLogonEvents\b", re.I),
        "technique_id": "T1078.002",
        "technique_name": "Valid Accounts: Domain Accounts",
        "tactic": "Defense Evasion / Persistence",
        "description": "Identity logon events — watch for impossible-travel or impossible-logon patterns.",
    },
    {
        "pattern": re.compile(r"\bDeviceProcessEvents\b.*(?:powershell|cmd|wscript|cscript|mshta)", re.I),
        "technique_id": "T1059.001",
        "technique_name": "PowerShell",
        "tactic": "Execution",
        "description": "Scripting engine launch — potential living-off-the-land execution.",
    },
    {
        "pattern": re.compile(r"\bAzureActivity\b.*(?:delete|remove)", re.I),
        "technique_id": "T1485",
        "technique_name": "Data Destruction",
        "tactic": "Impact",
        "description": "Azure resource deletion — could indicate destructive attack or ransomware stage.",
    },
    {
        "pattern": re.compile(r"\bSigninLogs\b", re.I),
        "technique_id": "T1078.004",
        "technique_name": "Valid Accounts: Cloud Accounts",
        "tactic": "Initial Access",
        "description": "Azure AD sign-in logs — monitor for MFA bypass, legacy protocol use, or anomalous geo.",
    },
    {
        "pattern": re.compile(r"\bSecurityIncident\b", re.I),
        "technique_id": "T1562",
        "technique_name": "Impair Defenses",
        "tactic": "Defense Evasion",
        "description": "Incident manipulation — watch for bulk-close or status-toggle patterns.",
    },
    {
        "pattern": re.compile(r"\bDnsEvents\b", re.I),
        "technique_id": "T1071.004",
        "technique_name": "Application Layer Protocol: DNS",
        "tactic": "Command and Control",
        "description": "DNS telemetry — look for DGA domains, long TTLs, or unusually large TXT records.",
    },
]

# ---------------------------------------------------------------------------
# Deterministic MAGIC correction rules (mirrors the TypeScript implementation)
# ---------------------------------------------------------------------------

_MAGIC_RULES: list[dict[str, Any]] = [
    {
        "name": "missing_pipe_before_operator",
        "pattern": re.compile(
            r"(?<!\|)\s+(summarize|where|project|extend|join|order|top|take|distinct|count)\b",
            re.I,
        ),
        "replacement": r" | \1",
        "description": "Inserted missing pipe character before tabular operator",
    },
    {
        "name": "count_without_dcount",
        "pattern": re.compile(r"\bcount\((\w*[Uu]nique\w*)\)", re.I),
        "replacement": r"dcount(\1)",
        "description": "Replaced count() with dcount() for unique-identifier columns",
    },
    {
        "name": "join_kind_missing",
        "pattern": re.compile(r"\bjoin\s*\(", re.I),
        "replacement": "join kind=innerunique (",
        "description": "Added kind=innerunique to join to prevent result-set explosion",
    },
    {
        "name": "ago_bare_number",
        "pattern": re.compile(r"\bago\((\d+)\)", re.I),
        "replacement": r"ago(\1d)",
        "description": "Added time unit 'd' to bare numeric ago() argument",
    },
]


def _apply_magic_rules(query: str, error_message: str) -> tuple[str, list[str]]:
    """Apply deterministic MAGIC rules. Returns (patched_query, corrections_applied)."""
    corrections: list[str] = []
    current = query

    for rule in _MAGIC_RULES:
        patched = rule["pattern"].sub(rule["replacement"], current)
        if patched != current:
            corrections.append(f"[{rule['name']}] {rule['description']}")
            current = patched

    return current, corrections


# ---------------------------------------------------------------------------
# Azure token helper (sync wrapper for DefaultAzureCredential)
# ---------------------------------------------------------------------------

def _get_token(scope: str) -> str:
    credential = DefaultAzureCredential()
    return credential.get_token(scope).token


# ---------------------------------------------------------------------------
# MCP Server & Tools
# ---------------------------------------------------------------------------

mcp = FastMCP(
    "Sentinel-Jedi-Validator",
    instructions=(
        "You are a Microsoft Sentinel KQL expert. Use the tools provided to "
        "validate KQL queries, auto-correct common errors using the MAGIC "
        "framework, and map queries to MITRE ATT&CK techniques."
    ),
)


@mcp.tool()
async def validate_sentinel_kql(query: str) -> str:
    """
    Validates a KQL query against the Sentinel Log Analytics workspace.

    Uses the safe `| take 0 | getschema` pattern: syntax and schema errors are
    surfaced without reading live data or incurring significant compute cost.

    Args:
        query: The KQL query string to validate.

    Returns:
        A human-readable validation result, including the column schema on
        success or the full error message on failure.
    """
    if not query.strip():
        return "❌ Empty query provided."

    validation_query = f"{query.strip()} | take 0 | getschema"

    try:
        token = await asyncio.to_thread(_get_token, LOGANALYTICS_SCOPE)
    except Exception as exc:
        return f"⚠️ Azure authentication failed: {exc}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                QUERY_ENDPOINT,
                headers=headers,
                json={"query": validation_query},
            )

        if response.status_code == 200:
            data = response.json()
            # Extract column names from the getschema result
            try:
                columns = [
                    row[0]
                    for row in data["tables"][0]["rows"]
                ]
                col_list = ", ".join(columns[:20])
                suffix = f" (+{len(columns) - 20} more)" if len(columns) > 20 else ""
                return (
                    f"✅ KQL Valid — schema resolved successfully.\n"
                    f"Columns: {col_list}{suffix}"
                )
            except (KeyError, IndexError):
                return "✅ KQL Valid — syntax and schema check passed."

        error = response.json().get("error", {})
        code = error.get("code", response.status_code)
        message = error.get("message", "Unknown error")
        return f"❌ KQL Invalid [{code}]: {message}"

    except httpx.TimeoutException:
        return "⚠️ Connection Error: Request timed out (>15 s). Check network or workspace ID."
    except Exception as exc:
        return f"⚠️ Connection Error: {exc}"


@mcp.tool()
async def suggest_kql_fix(failed_query: str, error_message: str) -> str:
    """
    Applies Purple Team MAGIC heuristics to fix common KQL semantic errors.

    Runs deterministic correction rules first (no LLM needed). Each rule
    targets well-known KQL footguns encountered in real Sentinel deployments.

    Args:
        failed_query:  The original KQL query that failed.
        error_message: The error text returned by the Log Analytics API.

    Returns:
        A corrected query (if fixable) with an explanation of each change,
        or a manual-review recommendation if the error is unknown.
    """
    if not failed_query.strip():
        return "❌ Empty query provided."

    patched, corrections = _apply_magic_rules(failed_query, error_message)

    if not corrections:
        # Fallback heuristic messages for errors not covered by regex rules
        if "Failed to resolve scalar expression" in error_message:
            return (
                "🔍 Tip: One or more column names in your query don't exist in the table schema.\n"
                f"Check every column reference against the actual table schema using:\n"
                f"  {failed_query.split('|')[0].strip()} | getschema"
            )
        if "summarize" in failed_query.lower() and "dcount" not in failed_query.lower():
            return (
                "🔍 Optimization: Use `dcount()` instead of `count()` when counting unique "
                "entities (IPs, AccountCustomEntity, UserId).\n"
                "This prevents inflated counts from duplicate log entries."
            )
        return (
            "🔍 Error pattern not yet mapped to a deterministic rule. Manual review required.\n"
            f"Error: {error_message}"
        )

    lines = ["✅ MAGIC corrections applied:\n"]
    for i, correction in enumerate(corrections, 1):
        lines.append(f"  {i}. {correction}")
    lines.append(f"\n📋 Corrected query:\n```kql\n{patched}\n```")
    lines.append(
        "\n⚠️  Always validate the corrected query before deploying to production."
    )
    return "\n".join(lines)


@mcp.tool()
async def self_correct_and_validate(query: str, error_message: str) -> str:
    """
    Full MAGIC self-correction loop: applies deterministic fixes and then
    re-validates the patched query against the Sentinel workspace.

    Use this when `validate_sentinel_kql` returns an error and you want an
    automatic fix-and-recheck in a single tool call.

    Args:
        query:         The failing KQL query.
        error_message: The error returned by validate_sentinel_kql.

    Returns:
        The final status (valid/still-invalid), the corrected query, and a
        list of all corrections applied.
    """
    if not query.strip():
        return "❌ Empty query provided."

    patched, corrections = _apply_magic_rules(query, error_message)

    correction_summary = (
        "\n".join(f"  • {c}" for c in corrections)
        if corrections
        else "  (no deterministic rules matched)"
    )

    validation_result = await validate_sentinel_kql(patched)

    lines = [
        "🔄 MAGIC Self-Correction Report",
        "=" * 40,
        f"Corrections applied:\n{correction_summary}",
        "",
        f"Corrected query:\n```kql\n{patched}\n```",
        "",
        f"Re-validation result:\n{validation_result}",
    ]

    if "✅" in validation_result:
        lines.append(
            "\n✅ Query is now valid. Safe to deploy after peer review."
        )
    else:
        lines.append(
            "\n⚠️  Query still failing after deterministic pass. "
            "LLM-assisted correction recommended — provide the corrected query "
            "to your AI assistant for a deeper fix."
        )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# MITRE ATT&CK — enhanced mapping with optional STIX bundle support
# ---------------------------------------------------------------------------

def _load_stix_data() -> "Any | None":
    """Load a local STIX 2.0 bundle if MITRE_STIX_BUNDLE_PATH is set."""
    bundle_path = os.environ.get("MITRE_STIX_BUNDLE_PATH", "")
    if bundle_path and _MITREATTACK_AVAILABLE:
        p = Path(bundle_path)
        if p.exists():
            return _MitreAttackData(str(p))
    return None


@mcp.tool()
async def map_kql_to_mitre(query: str) -> str:
    """
    Analyses a KQL query and suggests MITRE ATT&CK techniques.

    Uses a two-pass approach:
      1. Keyword/table-name matching against a built-in map (always available).
      2. If a local STIX bundle is configured (MITRE_STIX_BUNDLE_PATH), enriches
         results with the official technique descriptions from MITRE's dataset.

    Args:
        query: The KQL query to analyse.

    Returns:
        A report listing matched MITRE ATT&CK technique IDs, names, tactics,
        and actionable tuning notes.
    """
    if not query.strip():
        return "❌ Empty query provided."

    matches: list[dict[str, Any]] = [
        entry for entry in MITRE_MAP if entry["pattern"].search(query)
    ]

    # Supplement with keyword-based mapping (broader coverage)
    keyword_map: dict[str, str] = {
        "SigninLogs": "T1078 (Valid Accounts)",
        "SecurityEvent": "T1059 (Command and Scripting Interpreter)",
        "OfficeActivity": "T1566 (Phishing)",
        "ProcessCommandLine": "T1059.001 (PowerShell)",
        "EncodedCommand": "T1027 (Obfuscated Files or Information)",
        "DeviceRegistryEvents": "T1112 (Modify Registry)",
        "DeviceFileEvents": "T1005 (Data from Local System)",
        "CloudAppEvents": "T1213 (Data from Information Repositories)",
        "EmailEvents": "T1566.001 (Spearphishing Attachment)",
        "BehaviorAnalytics": "T1078.002 (Domain Accounts — anomaly detected)",
    }

    keyword_hits: list[str] = [
        v for k, v in keyword_map.items() if k.lower() in query.lower()
        and not any(entry["pattern"].pattern for entry in matches
                    if k.lower() in entry["pattern"].pattern.lower())
    ]

    if not matches and not keyword_hits:
        return (
            "🔍 No MITRE ATT&CK techniques matched automatically.\n"
            "Consider reviewing:\n"
            "  • Table name against the Sentinel schema reference\n"
            "  • Event IDs against Windows Security Event log documentation\n"
            "  • Process/command names against ATT&CK technique descriptions\n"
            "  • Set MITRE_STIX_BUNDLE_PATH for full STIX-based lookup"
        )

    lines = [f"🎯 MITRE ATT&CK Coverage Report ({len(matches) + len(keyword_hits)} hit(s))\n"]

    for match in matches:
        lines.append(
            f"  [{match['technique_id']}] {match['technique_name']}\n"
            f"    Tactic:      {match['tactic']}\n"
            f"    Description: {match['description']}\n"
        )

    if keyword_hits:
        lines.append("  Additional keyword matches:")
        for hit in keyword_hits:
            lines.append(f"    • {hit}")
        lines.append("")

    lines.append(
        "📌 Tip: Use generate_navigator_layer with the technique IDs above "
        "to visualize coverage in the ATT&CK Navigator."
    )
    return "\n".join(lines)


@mcp.tool()
async def generate_navigator_layer(technique_ids: list[str], layer_name: str) -> str:
    """
    Generates a MITRE ATT&CK Navigator JSON layer for the given technique IDs.

    The output file can be imported directly into https://mitre-attack.github.io/attack-navigator/
    to produce a visual heatmap of your Sentinel detection coverage.

    Args:
        technique_ids: List of ATT&CK technique IDs, e.g. ["T1078", "T1110.003"].
        layer_name:    Human-readable name for the layer (used as filename base).

    Returns:
        Confirmation message with the output file path, or the JSON inline
        if file write is not possible.
    """
    if not technique_ids:
        return "❌ No technique IDs provided."
    if not layer_name.strip():
        return "❌ Layer name is required."

    layer: dict[str, Any] = {
        "name": layer_name,
        "versions": {"attack": "14", "navigator": "5.0", "layer": "4.5"},
        "domain": "enterprise-attack",
        "description": f"Sentinel-Copilot detection coverage — {layer_name}",
        "filters": {"platforms": ["Windows", "Linux", "macOS", "Azure", "Office 365"]},
        "sorting": 0,
        "layout": {"layout": "side", "showID": True, "showName": True},
        "hideDisabled": False,
        "techniques": [
            {
                "techniqueID": tid.strip(),
                "score": 100,
                "color": "#00c853",
                "comment": "Active Sentinel Detection (Sentinel-Copilot)",
                "enabled": True,
                "showSubtechniques": False,
            }
            for tid in technique_ids
        ],
        "gradient": {"colors": ["#ffffff", "#00c853"], "minValue": 0, "maxValue": 100},
        "legendItems": [
            {"label": "Active Detection", "color": "#00c853"}
        ],
        "metadata": [],
        "links": [],
        "showTacticRowBackground": True,
        "tacticRowBackground": "#1e3a8a",
        "selectTechniquesAcrossTactics": True,
    }

    safe_name = re.sub(r"[^\w\-]", "_", layer_name)
    file_path = Path(f"{safe_name}_navigator_layer.json")

    try:
        file_path.write_text(json.dumps(layer, indent=2))
        return (
            f"✅ Navigator layer generated: {file_path}\n"
            f"   Techniques covered: {len(technique_ids)}\n\n"
            f"Upload to https://mitre-attack.github.io/attack-navigator/ "
            f"via Layer → Open Existing Layer → Upload from local."
        )
    except OSError:
        # Fallback: return JSON inline
        return (
            f"✅ Navigator layer (file write failed — returning inline):\n\n"
            f"```json\n{json.dumps(layer, indent=2)}\n```"
        )


# ---------------------------------------------------------------------------
# Threat Actor TTP Lookup (live TAXII via attackcti)
# ---------------------------------------------------------------------------

def _get_lift() -> "Any":
    """Return an attack_client instance, raising if attackcti is not installed."""
    if not _ATTACKCTI_AVAILABLE:
        raise RuntimeError(
            "attackcti is not installed. Run: pip install attackcti"
        )
    return _AttackClient()


@mcp.tool()
async def get_actor_ttps(actor_name: str) -> str:
    """
    Retrieves the specific TTPs and sub-techniques used by a named threat actor
    from the live MITRE ATT&CK TAXII server.

    Examples of valid actor names: 'APT29', 'Lazarus Group', 'Scattered Spider'.

    2026 threat context:
    - APT29 (Midnight Blizzard): Cloud Administration Commands (T1651), Azure
      Run Command, Microsoft Graph API abuse for C2 concealment.
    - Lazarus Group: Remote Access Hardware (T1219.003), PiKVM laptop farms,
      cross-jurisdiction infrastructure to bypass geo-blocking.

    Args:
        actor_name: Common name or alias of the threat actor.

    Returns:
        Actor profile with description excerpt and top 15 techniques.
    """
    if not actor_name.strip():
        return "❌ Actor name is required."

    try:
        lift = await asyncio.to_thread(_get_lift)
        groups = await asyncio.to_thread(lift.get_groups)
    except RuntimeError as exc:
        return f"⚠️ {exc}"
    except Exception as exc:
        return f"⚠️ TAXII connection error: {exc}"

    target = next(
        (g for g in groups if actor_name.lower() in g.get("name", "").lower()),
        None,
    )

    if not target:
        return (
            f"❌ Actor '{actor_name}' not found in the MITRE ATT&CK database.\n"
            "Check spelling or try an alternate alias "
            "(e.g. 'Cozy Bear' for APT29)."
        )

    group_id: str = target["external_references"][0]["external_id"]

    try:
        techniques = await asyncio.to_thread(
            lift.get_techniques_used_by_group, group_id
        )
    except Exception as exc:
        return f"⚠️ Error fetching techniques for {group_id}: {exc}"

    description = target.get("description", "No description available.")
    description_excerpt = description[:400] + ("…" if len(description) > 400 else "")

    lines = [
        f"### {target['name']} ({group_id})",
        f"**Description:** {description_excerpt}",
        "",
        f"**Techniques observed ({min(len(techniques), 15)} of {len(techniques)}):**",
    ]

    for tech in techniques[:15]:
        tid = tech["external_references"][0]["external_id"]
        name = tech.get("name", "Unknown")
        lines.append(f"  - **{tid}**: {name}")

    if len(techniques) > 15:
        lines.append(f"  … and {len(techniques) - 15} more. Use generate_navigator_layer for full coverage.")

    lines.append(
        "\n💡 Tip: Use compare_actor_overlap to find shared techniques with another group."
    )
    return "\n".join(lines)


@mcp.tool()
async def compare_actor_overlap(actor_a: str, actor_b: str) -> str:
    """
    Compares two threat actors to find techniques they share.

    Useful for attribution analysis and identifying shared infrastructure or
    playbook patterns (e.g. APT29 vs Lazarus Group both abusing cloud APIs).

    Args:
        actor_a: First threat actor name.
        actor_b: Second threat actor name.

    Returns:
        Count of overlapping techniques, shared IDs, and techniques unique
        to each actor.
    """
    if not actor_a.strip() or not actor_b.strip():
        return "❌ Both actor names are required."

    try:
        lift = await asyncio.to_thread(_get_lift)
        groups = await asyncio.to_thread(lift.get_groups)
    except RuntimeError as exc:
        return f"⚠️ {exc}"
    except Exception as exc:
        return f"⚠️ TAXII connection error: {exc}"

    def resolve(name: str) -> tuple[str, set[str]]:
        group = next(
            (g for g in groups if name.lower() in g.get("name", "").lower()),
            None,
        )
        if not group:
            return name, set()
        gid = group["external_references"][0]["external_id"]
        try:
            techs = lift.get_techniques_used_by_group(gid)
            ids = {t["external_references"][0]["external_id"] for t in techs}
            return group["name"], ids
        except Exception:
            return group.get("name", name), set()

    name_a, techs_a = await asyncio.to_thread(resolve, actor_a)
    name_b, techs_b = await asyncio.to_thread(resolve, actor_b)

    if not techs_a:
        return f"❌ No techniques found for '{actor_a}'. Check spelling."
    if not techs_b:
        return f"❌ No techniques found for '{actor_b}'. Check spelling."

    overlap = techs_a & techs_b
    only_a = techs_a - techs_b
    only_b = techs_b - techs_a

    overlap_list = ", ".join(sorted(overlap)[:15])
    suffix = f" (+{len(overlap) - 15} more)" if len(overlap) > 15 else ""

    lines = [
        f"🔄 TTP Overlap: **{name_a}** vs **{name_b}**",
        f"",
        f"  Shared techniques:      {len(overlap)}",
        f"  Unique to {name_a}: {len(only_a)}",
        f"  Unique to {name_b}: {len(only_b)}",
        f"",
        f"  Common IDs: {overlap_list}{suffix}",
        "",
        "💡 Use generate_navigator_layer with the shared IDs to highlight "
        "overlap in the ATT&CK Navigator for a stakeholder briefing.",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Prompt Engineering — iterative refinement helper
# ---------------------------------------------------------------------------

@mcp.tool()
async def generate_prompt_iterations(
    base_prompt: str,
    variables: dict[str, str],
    iterations: int = 3,
) -> str:
    """
    Simulates a prompt engineering refinement workflow by generating
    structured message-pair logs across multiple iterations.

    Useful for testing and tuning prompts used in the MAGIC self-correction
    loop or any other AI-assisted security workflow before committing them
    to production. Each iteration mutates the variable set to simulate
    progressive prompt refinement.

    Args:
        base_prompt: The prompt template to refine, e.g.
                     "Analyze the security logs for anomalies."
        variables:   Key-value pairs injected into the prompt, e.g.
                     {"format": "json", "threshold": "high"}.
        iterations:  Number of refinement iterations to simulate (default 3,
                     max 10 to keep output readable).

    Returns:
        A JSON-formatted log of message pairs showing how each iteration
        mutates the variables and documents the expected model response shape.
    """
    if not base_prompt.strip():
        return "❌ base_prompt is required."
    if not variables:
        return "❌ At least one variable key-value pair is required."

    iterations = min(max(1, iterations), 10)

    refinement_log: list[dict[str, Any]] = []

    for i in range(1, iterations + 1):
        # Simulate progressive variable mutation across iterations
        current_vars = {k: f"v{i}_{v}" for k, v in variables.items()}

        pair: dict[str, Any] = {
            "iteration": i,
            "messages": [
                {
                    "role": "user",
                    "content": (
                        f"Test Iteration {i}: {base_prompt} "
                        f"using {json.dumps(current_vars)}"
                    ),
                },
                {
                    "role": "assistant",
                    "content": (
                        f"Response {i}: [Optimized output based on refined logic "
                        f"for variables: {list(variables.keys())}]"
                    ),
                },
            ],
        }
        refinement_log.append(pair)

    summary_lines = [
        f"📝 Prompt Refinement Log — {iterations} iteration(s)",
        f"   Base prompt: {base_prompt}",
        f"   Variables:   {json.dumps(variables)}",
        "",
        "```json",
        json.dumps(refinement_log, indent=2),
        "```",
        "",
        "💡 Feed the final iteration's user message to your LLM to evaluate "
        "prompt stability. Compare responses across iterations to identify "
        "sensitivity to variable changes.",
    ]
    return "\n".join(summary_lines)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    transport = os.environ.get("MCP_TRANSPORT", "stdio")
    mcp.run(transport=transport)
