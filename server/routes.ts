import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { logger } from "./logger";
import { 
  insertAssetSchema, 
  insertVulnerabilitySchema,
  updateVulnerabilitySchema,
  insertActivityLogSchema,
  insertJiraConfigSchema,
  type Severity,
} from "@shared/schema";
import { ZodError, z } from "zod";

const updateAssetSchema = insertAssetSchema.partial();

function handleZodError(res: Response, error: ZodError) {
  const errors = error.errors.map(e => ({
    field: e.path.join('.'),
    message: e.message
  }));
  logger.validation(false, { errors });
  res.status(400).json({ error: "Validation failed", details: errors });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Dashboard metrics
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      logger.storage("Fetching dashboard metrics");
      const metrics = await storage.getDashboardMetrics();
      logger.debug("API", "Dashboard metrics retrieved", { 
        totalVulnerabilities: metrics.totalVulnerabilities,
        openVulnerabilities: metrics.openVulnerabilities 
      });
      res.json(metrics);
    } catch (error) {
      logger.error("API", "Error fetching dashboard metrics", { error });
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Assets
  app.get("/api/assets", async (req, res) => {
    try {
      const { type, search, page, pageSize } = req.query;
      const filters = {
        type: type as string | undefined,
        search: search as string | undefined,
        page: parseInt(page as string) || 1,
        pageSize: parseInt(pageSize as string) || 20,
      };
      logger.storage("Fetching assets", { filters });
      const result = await storage.getAssets(filters);
      
      logger.debug("API", "Assets retrieved", { 
        total: result.total, 
        page: filters.page, 
        pageSize: filters.pageSize,
        returned: result.assets.length 
      });
      res.json(result);
    } catch (error) {
      logger.error("API", "Error fetching assets", { error });
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:id", async (req, res) => {
    try {
      logger.storage("Fetching asset by ID", { id: req.params.id });
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        logger.warn("API", "Asset not found", { id: req.params.id });
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      logger.error("API", "Error fetching asset", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", async (req, res) => {
    try {
      logger.debug("API", "Creating asset", { name: req.body.name });
      const validatedData = insertAssetSchema.parse(req.body);
      logger.validation(true, { schema: "insertAssetSchema" });
      const asset = await storage.createAsset(validatedData);
      
      await storage.createActivityLog({
        entityType: "asset",
        entityId: asset.id,
        action: "created",
        details: `Asset "${asset.name}" created`,
      });
      
      logger.audit("Asset created", { id: asset.id, name: asset.name, type: asset.type });
      res.status(201).json(asset);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      logger.error("API", "Error creating asset", { error });
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  app.patch("/api/assets/:id", async (req, res) => {
    try {
      logger.debug("API", "Updating asset", { id: req.params.id, updates: Object.keys(req.body) });
      const validatedData = updateAssetSchema.parse(req.body);
      logger.validation(true, { schema: "updateAssetSchema" });
      const asset = await storage.updateAsset(req.params.id, validatedData);
      if (!asset) {
        logger.warn("API", "Asset not found for update", { id: req.params.id });
        return res.status(404).json({ error: "Asset not found" });
      }
      
      await storage.createActivityLog({
        entityType: "asset",
        entityId: asset.id,
        action: "updated",
        details: `Asset "${asset.name}" updated`,
      });
      
      logger.audit("Asset updated", { id: asset.id, name: asset.name });
      res.json(asset);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      logger.error("API", "Error updating asset", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      logger.debug("API", "Deleting asset", { id: req.params.id });
      const deleted = await storage.deleteAsset(req.params.id);
      if (!deleted) {
        logger.warn("API", "Asset not found for deletion", { id: req.params.id });
        return res.status(404).json({ error: "Asset not found" });
      }
      
      await storage.createActivityLog({
        entityType: "asset",
        entityId: req.params.id,
        action: "deleted",
        details: "Asset deleted",
      });
      
      logger.audit("Asset deleted", { id: req.params.id });
      res.status(204).send();
    } catch (error) {
      logger.error("API", "Error deleting asset", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // Vulnerabilities
  app.get("/api/vulnerabilities", async (req, res) => {
    try {
      const { severity, status, search, page, pageSize, limit, hasJira, assignee } = req.query;
      const filters = {
        severity: severity as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        hasJira: hasJira === "true" ? true : hasJira === "false" ? false : undefined,
        assignee: assignee as string | undefined,
        page: parseInt(page as string) || 1,
        pageSize: parseInt(pageSize as string) || 20,
      };
      logger.storage("Fetching vulnerabilities", { filters });
      const result = await storage.getVulnerabilities(filters);
      
      logger.debug("API", "Vulnerabilities retrieved", { 
        total: result.total, 
        page: filters.page,
        returned: result.vulnerabilities.length 
      });
      res.json(result);
    } catch (error) {
      logger.error("API", "Error fetching vulnerabilities", { error });
      res.status(500).json({ error: "Failed to fetch vulnerabilities" });
    }
  });

  app.get("/api/vulnerabilities/:id", async (req, res) => {
    try {
      logger.storage("Fetching vulnerability by ID", { id: req.params.id });
      const vuln = await storage.getVulnerability(req.params.id);
      if (!vuln) {
        logger.warn("API", "Vulnerability not found", { id: req.params.id });
        return res.status(404).json({ error: "Vulnerability not found" });
      }
      res.json(vuln);
    } catch (error) {
      logger.error("API", "Error fetching vulnerability", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to fetch vulnerability" });
    }
  });

  app.post("/api/vulnerabilities", async (req, res) => {
    try {
      logger.debug("API", "Creating vulnerability", { title: req.body.title });
      const validatedData = insertVulnerabilitySchema.parse(req.body);
      logger.validation(true, { schema: "insertVulnerabilitySchema" });
      const vuln = await storage.createVulnerability(validatedData);
      
      await storage.createActivityLog({
        entityType: "vulnerability",
        entityId: vuln.id,
        action: "created",
        details: `Vulnerability "${vuln.title}" created`,
      });
      
      logger.audit("Vulnerability created", { id: vuln.id, title: vuln.title });
      res.status(201).json(vuln);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      logger.error("API", "Error creating vulnerability", { error });
      res.status(500).json({ error: "Failed to create vulnerability" });
    }
  });

  app.patch("/api/vulnerabilities/:id", async (req, res) => {
    try {
      logger.debug("API", "Updating vulnerability", { id: req.params.id, updates: req.body });
      const validatedData = updateVulnerabilitySchema.parse(req.body);
      logger.validation(true, { schema: "updateVulnerabilitySchema" });
      const vuln = await storage.updateVulnerability(req.params.id, validatedData);
      if (!vuln) {
        logger.warn("API", "Vulnerability not found for update", { id: req.params.id });
        return res.status(404).json({ error: "Vulnerability not found" });
      }
      
      const changes = Object.keys(validatedData).join(", ");
      await storage.createActivityLog({
        entityType: "vulnerability",
        entityId: vuln.id,
        action: "updated",
        details: `Updated: ${changes}`,
      });
      
      logger.audit("Vulnerability updated", { id: vuln.id, status: vuln.status });
      res.json(vuln);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      logger.error("API", "Error updating vulnerability", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to update vulnerability" });
    }
  });

  // Bulk update vulnerabilities
  app.post("/api/vulnerabilities/bulk-update", async (req, res) => {
    try {
      const { ids, updates } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "IDs must be a non-empty array" });
      }
      
      const validatedData = updateVulnerabilitySchema.parse(updates);
      const count = await storage.bulkUpdateVulnerabilities(ids, validatedData);
      
      await storage.createActivityLog({
        entityType: "vulnerability",
        entityId: ids.join(","),
        action: "bulk_updated",
        details: `Bulk updated ${count} vulnerabilities`,
      });
      
      logger.audit("Bulk vulnerability update", { count, updates: Object.keys(validatedData) });
      res.json({ updated: count });
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      logger.error("API", "Error bulk updating vulnerabilities", { error });
      res.status(500).json({ error: "Failed to bulk update vulnerabilities" });
    }
  });

  // Import vulnerabilities from CSV
  app.post("/api/vulnerabilities/import", async (req, res) => {
    try {
      const { data } = req.body as { data: Array<Record<string, string>> };
      
      if (!Array.isArray(data)) {
        logger.warn("API", "Import failed - data is not an array");
        return res.status(400).json({ error: "Data must be an array" });
      }

      logger.info("API", "Starting vulnerability import", { recordCount: data.length });
      
      const vulns = data.map((row) => ({
        title: row.title || row.name || row.vulnerability || "Unknown Vulnerability",
        description: row.description || row.synopsis || "",
        cve: row.cve || row.cve_id || "",
        cwe: row.cwe || row.cwe_id || "",
        severity: (row.severity?.toLowerCase() || "medium") as Severity,
        cvssScore: parseFloat(row.cvss_score || row.cvss || "0") || undefined,
        assetName: row.asset_name || row.host || row.ip || "",
        source: "csv_import" as const,
        scannerFindingId: row.plugin_id || row.finding_id || row.id || "",
        exploitAvailable: row.exploit_available === "true" || row.exploit === "true" || row.exploitable === "true",
      }));
      
      const count = await storage.importVulnerabilities(vulns);
      
      await storage.createActivityLog({
        entityType: "import",
        entityId: "csv_import",
        action: "imported",
        details: `Imported ${count} vulnerabilities from CSV`,
      });
      
      logger.audit("Vulnerabilities imported", { count, totalRecords: data.length });
      res.json({ imported: count });
    } catch (error) {
      logger.error("API", "Import error", { error });
      res.status(500).json({ error: "Failed to import vulnerabilities" });
    }
  });

  // Activity Logs
  app.get("/api/activity", async (req, res) => {
    try {
      const { entityType, entityId, limit } = req.query;
      const filters = {
        entityType: entityType as string,
        entityId: entityId as string,
        limit: limit ? parseInt(limit as string) : 50,
      };
      logger.storage("Fetching activity logs", { filters });
      const logs = await storage.getActivityLogs(filters);
      logger.debug("API", "Activity logs retrieved", { count: logs.length });
      res.json(logs);
    } catch (error) {
      logger.error("API", "Error fetching activity logs", { error });
      res.status(500).json({ error: "Failed to fetch activity logs" });
    }
  });

  // Jira Configuration
  app.get("/api/jira/config", async (req, res) => {
    try {
      const config = await storage.getJiraConfig();
      res.json(config || { isConfigured: false });
    } catch (error) {
      logger.error("API", "Error fetching Jira config", { error });
      res.status(500).json({ error: "Failed to fetch Jira configuration" });
    }
  });

  app.post("/api/jira/config", async (req, res) => {
    try {
      const validatedData = insertJiraConfigSchema.parse(req.body);
      const config = await storage.saveJiraConfig(validatedData);
      
      await storage.createActivityLog({
        entityType: "jira_config",
        entityId: config.id,
        action: "configured",
        details: `Jira configured for project ${config.projectKey}`,
      });
      
      logger.audit("Jira config saved", { projectKey: config.projectKey });
      res.json(config);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      logger.error("API", "Error saving Jira config", { error });
      res.status(500).json({ error: "Failed to save Jira configuration" });
    }
  });

  // Create Jira ticket for vulnerability
  app.post("/api/vulnerabilities/:id/jira", async (req, res) => {
    try {
      const vuln = await storage.getVulnerability(req.params.id);
      if (!vuln) {
        return res.status(404).json({ error: "Vulnerability not found" });
      }

      const jiraConfig = await storage.getJiraConfig();
      if (!jiraConfig?.isConfigured) {
        return res.status(400).json({ error: "Jira is not configured" });
      }

      // For now, we simulate Jira ticket creation
      // In production, this would call the Jira API
      const jiraKey = `${jiraConfig.projectKey}-${Math.floor(Math.random() * 10000)}`;
      const jiraUrl = `${jiraConfig.baseUrl}/browse/${jiraKey}`;
      
      const updated = await storage.updateVulnerability(req.params.id, {
        jiraKey,
        jiraStatus: "To Do",
        jiraUrl,
      });

      await storage.createActivityLog({
        entityType: "vulnerability",
        entityId: req.params.id,
        action: "jira_created",
        details: `Jira ticket ${jiraKey} created`,
      });

      logger.audit("Jira ticket created", { vulnId: req.params.id, jiraKey });
      res.json({ jiraKey, jiraUrl, vulnerability: updated });
    } catch (error) {
      logger.error("API", "Error creating Jira ticket", { error });
      res.status(500).json({ error: "Failed to create Jira ticket" });
    }
  });

  logger.info("ROUTES", "All API routes registered successfully", {
    endpoints: [
      "GET /api/dashboard/metrics",
      "GET/POST /api/assets",
      "GET/PATCH/DELETE /api/assets/:id",
      "GET/POST /api/vulnerabilities",
      "GET/PATCH /api/vulnerabilities/:id",
      "POST /api/vulnerabilities/import",
      "POST /api/vulnerabilities/bulk-update",
      "POST /api/vulnerabilities/:id/jira",
      "GET /api/activity",
      "GET/POST /api/jira/config",
    ]
  });

  return httpServer;
}
