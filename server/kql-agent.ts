/**
 * KQL Self-Correction Agent (Phase 2)
 *
 * Implements the MAGIC (Multi-Agent Guideline Iterative Correction) framework
 * for KQL query validation and self-healing against Microsoft Sentinel / Log Analytics.
 *
 * Validation strategy: append `| take 0 | getschema` to catch syntax errors
 * without executing the full query or touching live data.
 */

import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KqlValidationResult {
  status: "valid" | "invalid";
  schema?: unknown;
  errorCode?: string;
  errorMessage?: string;
}

export interface KqlCorrectionResult {
  correctedQuery: string;
  corrections: string[];
  iterationsUsed: number;
}

export interface KqlDeployResult {
  ruleId: string;
  ruleName: string;
  status: "deployed" | "failed";
  message?: string;
}

export interface SentinelConfig {
  workspaceId: string;
  /** Bearer token or token-provider callback */
  accessToken: string | (() => Promise<string>);
  /** Subscription ID required for rule deployment */
  subscriptionId?: string;
  /** Resource group required for rule deployment */
  resourceGroup?: string;
  /** Workspace name required for rule deployment */
  workspaceName?: string;
}

interface LogAnalyticsError {
  code: string;
  message: string;
  innererror?: { code: string; message: string };
}

interface LogAnalyticsErrorResponse {
  error: LogAnalyticsError;
}

// ---------------------------------------------------------------------------
// MAGIC correction rules applied before any LLM call (deterministic pass)
// ---------------------------------------------------------------------------

type CorrectionRule = {
  name: string;
  test: (query: string, errorMsg: string) => boolean;
  fix: (query: string) => { query: string; description: string };
};

const DETERMINISTIC_RULES: CorrectionRule[] = [
  {
    name: "missing_pipe_before_operator",
    test: (_q, err) =>
      err.toLowerCase().includes("syntaxerror") ||
      err.toLowerCase().includes("failed to resolve scalar expression"),
    fix: (query) => {
      // Insert pipe before bare operators like summarize / where / project / extend
      const fixed = query.replace(
        /(?<!\|)\s+(summarize|where|project|extend|join|order|top|take|distinct|count)\b/gi,
        " | $1"
      );
      return {
        query: fixed,
        description: "Inserted missing pipe character before tabular operator",
      };
    },
  },
  {
    name: "count_without_dcount",
    test: (_q, err) =>
      err.toLowerCase().includes("count") &&
      err.toLowerCase().includes("accountcustom"),
    fix: (query) => {
      const fixed = query.replace(/\bcount\((\w*[Uu]nique\w*)\)/g, "dcount($1)");
      return {
        query: fixed,
        description:
          "Replaced count() with dcount() for unique-identifier columns",
      };
    },
  },
  {
    name: "join_kind_missing",
    test: (query) =>
      /\bjoin\s*\(/i.test(query) && !/\bjoin\s+kind\s*=/i.test(query),
    fix: (query) => {
      const fixed = query.replace(/\bjoin\s*\(/gi, "join kind=innerunique (");
      return {
        query: fixed,
        description:
          "Added kind=innerunique to join to prevent result-set explosion",
      };
    },
  },
  {
    name: "ago_wrong_unit",
    test: (_q, err) => err.toLowerCase().includes("ago"),
    fix: (query) => {
      // Replace bare numbers in ago() with 'd' suffix if no unit present
      const fixed = query.replace(/\bago\((\d+)\)/gi, "ago($1d)");
      return {
        query: fixed,
        description: "Added time unit 'd' to bare numeric ago() argument",
      };
    },
  },
];

// ---------------------------------------------------------------------------
// KQLJediSentinel class
// ---------------------------------------------------------------------------

export class KQLJediSentinel {
  private readonly workspaceId: string;
  private readonly queryEndpoint: string;
  private readonly config: SentinelConfig;

  /** Max correction iterations before giving up */
  static readonly MAX_ITERATIONS = 3;

  constructor(config: SentinelConfig) {
    this.config = config;
    this.workspaceId = config.workspaceId;
    this.queryEndpoint = `https://api.loganalytics.azure.com/v1/workspaces/${config.workspaceId}/query`;
  }

  // -------------------------------------------------------------------------
  // Token acquisition
  // -------------------------------------------------------------------------

  private async getToken(): Promise<string> {
    const { accessToken } = this.config;
    return typeof accessToken === "function" ? accessToken() : accessToken;
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  /**
   * Validates KQL syntax by running `| take 0 | getschema`.
   * This is safe: it returns schema information without touching live row data.
   */
  async validateKql(query: string): Promise<KqlValidationResult> {
    const validationQuery = `${query.trim()} | take 0 | getschema`;

    logger.debug("KQL", "Validating query", {
      workspaceId: this.workspaceId,
      queryLength: query.length,
    });

    let token: string;
    try {
      token = await this.getToken();
    } catch (err) {
      logger.error("KQL", "Failed to acquire access token", { err });
      return {
        status: "invalid",
        errorCode: "AUTH_FAILED",
        errorMessage: "Unable to acquire Azure access token",
      };
    }

    let response: Response;
    try {
      response = await fetch(this.queryEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: validationQuery }),
      });
    } catch (networkErr) {
      logger.error("KQL", "Network error during validation", { networkErr });
      return {
        status: "invalid",
        errorCode: "NETWORK_ERROR",
        errorMessage: String(networkErr),
      };
    }

    if (response.ok) {
      const schema = await response.json();
      logger.debug("KQL", "Query validation passed");
      return { status: "valid", schema };
    }

    const body = (await response.json()) as Partial<LogAnalyticsErrorResponse>;
    const err = body.error ?? { code: String(response.status), message: response.statusText };

    logger.warn("KQL", "Query validation failed", {
      code: err.code,
      message: err.message,
    });

    return {
      status: "invalid",
      errorCode: err.code,
      errorMessage: err.message,
    };
  }

  // -------------------------------------------------------------------------
  // Deterministic self-correction (MAGIC pass 1)
  // -------------------------------------------------------------------------

  /**
   * Applies deterministic MAGIC correction rules to a failed query.
   * Returns the patched query and a list of correction descriptions applied.
   *
   * This is the "fast path" — no LLM call required for well-known footguns.
   */
  applyDeterministicCorrections(
    query: string,
    errorMessage: string
  ): { query: string; corrections: string[] } {
    let current = query;
    const corrections: string[] = [];

    for (const rule of DETERMINISTIC_RULES) {
      if (rule.test(current, errorMessage)) {
        const result = rule.fix(current);
        if (result.query !== current) {
          corrections.push(`[${rule.name}] ${result.description}`);
          current = result.query;
        }
      }
    }

    return { query: current, corrections };
  }

  // -------------------------------------------------------------------------
  // LLM-assisted correction prompt builder (MAGIC pass 2)
  // -------------------------------------------------------------------------

  /**
   * Builds a structured prompt for an LLM-based correction agent.
   * Wire this into your preferred model (e.g., claude-sonnet-4-6, GPT-4o)
   * by passing the returned prompt string to your AI SDK.
   *
   * The prompt follows MAGIC principles:
   *   1. Provide full context (query + error)
   *   2. Enumerate correction rules explicitly
   *   3. Constrain output to only the corrected KQL string
   */
  buildCorrectionPrompt(failedQuery: string, errorMessage: string): string {
    return `You are a Microsoft Sentinel KQL expert. Fix the query below.

### FAILED KQL QUERY:
\`\`\`kql
${failedQuery}
\`\`\`

### ERROR RETURNED:
${errorMessage}

### CORRECTION RULES (MAGIC framework):
1. **Syntax**: Resolve any "Failed to resolve scalar expression" or SyntaxError.
   Always separate tabular operators with a pipe character ( | ).
2. **Unique counts**: Use \`dcount()\` instead of \`count()\` when counting unique identifiers
   (e.g., AccountCustomEntity, UserId, DeviceId).
3. **Join safety**: Any \`join\` must specify \`kind=innerunique\` unless a specific
   join kind is required, to prevent result-set explosion.
4. **Time functions**: \`ago()\` arguments must include a time unit (e.g., \`ago(1d)\`, \`ago(7d)\`).
5. **Summarize**: \`summarize\` must have at least one aggregation expression.
6. **Project**: Column names in \`project\` must exist in the preceding table expression.

### OUTPUT RULES:
- Output ONLY the corrected KQL query string.
- Do NOT include explanations, markdown code fences, or any other text.
- If the query cannot be fixed, output the word UNFIXABLE on a single line.`;
  }

  // -------------------------------------------------------------------------
  // Full self-correction loop
  // -------------------------------------------------------------------------

  /**
   * Full MAGIC self-correction loop:
   *   1. Apply deterministic rules (fast path)
   *   2. Re-validate
   *   3. If still failing, build LLM prompt and call `llmCorrector`
   *   4. Repeat up to MAX_ITERATIONS
   *
   * @param failedQuery   Original KQL that failed validation
   * @param errorMessage  Error message returned from validate_kql
   * @param llmCorrector  Optional async function that accepts a prompt and
   *                      returns the corrected KQL string. Omit to use only
   *                      deterministic rules.
   */
  async selfCorrect(
    failedQuery: string,
    errorMessage: string,
    llmCorrector?: (prompt: string) => Promise<string>
  ): Promise<KqlCorrectionResult> {
    let current = failedQuery;
    let currentError = errorMessage;
    const allCorrections: string[] = [];
    let iterations = 0;

    while (iterations < KQLJediSentinel.MAX_ITERATIONS) {
      iterations++;

      // --- Pass 1: Deterministic rules ---
      const { query: patched, corrections } = this.applyDeterministicCorrections(
        current,
        currentError
      );

      if (corrections.length > 0) {
        allCorrections.push(...corrections);
        current = patched;
        logger.debug("KQL", "Deterministic corrections applied", { corrections, iteration: iterations });
      }

      // --- Validate the patched query ---
      const validation = await this.validateKql(current);

      if (validation.status === "valid") {
        logger.info("KQL", "Query self-corrected successfully", {
          iterations,
          corrections: allCorrections.length,
        });
        break;
      }

      currentError = validation.errorMessage ?? "Unknown error";

      // --- Pass 2: LLM correction ---
      if (!llmCorrector) {
        logger.warn("KQL", "No LLM corrector provided; stopping after deterministic pass");
        break;
      }

      const prompt = this.buildCorrectionPrompt(current, currentError);

      let llmResult: string;
      try {
        llmResult = (await llmCorrector(prompt)).trim();
      } catch (err) {
        logger.error("KQL", "LLM corrector threw an error", { err, iteration: iterations });
        break;
      }

      if (llmResult === "UNFIXABLE") {
        logger.warn("KQL", "LLM marked query as UNFIXABLE", { iteration: iterations });
        break;
      }

      allCorrections.push(`[llm_pass_${iterations}] LLM correction applied`);
      current = llmResult;
    }

    return {
      correctedQuery: current,
      corrections: allCorrections,
      iterationsUsed: iterations,
    };
  }

  // -------------------------------------------------------------------------
  // Deployment to Sentinel Analytics Rules
  // -------------------------------------------------------------------------

  /**
   * Deploys a verified KQL query as a Sentinel Scheduled Analytics Rule.
   * Uses the ARM API version 2023-02-01.
   * Requires subscriptionId, resourceGroup, and workspaceName in config.
   */
  async deployToSentinel(
    verifiedQuery: string,
    ruleName: string,
    options: {
      displayName?: string;
      description?: string;
      severity?: "High" | "Medium" | "Low" | "Informational";
      queryFrequency?: string; // ISO 8601 duration, e.g. "PT1H"
      queryPeriod?: string;    // ISO 8601 duration, e.g. "P1D"
      triggerThreshold?: number;
    } = {}
  ): Promise<KqlDeployResult> {
    const { subscriptionId, resourceGroup, workspaceName } = this.config;

    if (!subscriptionId || !resourceGroup || !workspaceName) {
      return {
        ruleId: "",
        ruleName,
        status: "failed",
        message:
          "deployToSentinel requires subscriptionId, resourceGroup, and workspaceName in config",
      };
    }

    const ruleId = ruleName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const endpoint =
      `https://management.azure.com/subscriptions/${subscriptionId}` +
      `/resourceGroups/${resourceGroup}` +
      `/providers/Microsoft.OperationalInsights/workspaces/${workspaceName}` +
      `/providers/Microsoft.SecurityInsights/alertRules/${ruleId}` +
      `?api-version=2023-02-01`;

    logger.info("KQL", "Deploying analytics rule", { ruleName, ruleId });

    let token: string;
    try {
      token = await this.getToken();
    } catch {
      return { ruleId, ruleName, status: "failed", message: "Token acquisition failed" };
    }

    const body = {
      kind: "Scheduled",
      properties: {
        displayName: options.displayName ?? ruleName,
        description: options.description ?? "",
        severity: options.severity ?? "Medium",
        enabled: true,
        query: verifiedQuery,
        queryFrequency: options.queryFrequency ?? "PT1H",
        queryPeriod: options.queryPeriod ?? "P1D",
        triggerOperator: "GreaterThan",
        triggerThreshold: options.triggerThreshold ?? 0,
        suppressionDuration: "PT1H",
        suppressionEnabled: false,
      },
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      return {
        ruleId,
        ruleName,
        status: "failed",
        message: `Network error: ${String(networkErr)}`,
      };
    }

    if (response.ok) {
      logger.audit("KQL", "Analytics rule deployed", { ruleId, ruleName });
      return { ruleId, ruleName, status: "deployed" };
    }

    const errBody = (await response.json().catch(() => ({}))) as Partial<LogAnalyticsErrorResponse>;
    const msg = errBody.error?.message ?? response.statusText;

    logger.error("KQL", "Rule deployment failed", { ruleId, statusCode: response.status, msg });
    return { ruleId, ruleName, status: "failed", message: msg };
  }
}
