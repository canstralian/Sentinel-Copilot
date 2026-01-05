import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { logger } from "./logger";
import { 
  insertAssetSchema, 
  insertAuthorizationSchema, 
  insertActionLogSchema,
  updateVulnerabilitySchema,
  type AssetType, 
  type ExposureType, 
  type AuthModel, 
  type AttackPhase,
  type Severity 
} from "@shared/schema";
import { ZodError } from "zod";

function handleZodError(res: any, error: ZodError) {
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
        totalAssets: metrics.totalAssets,
        openFindings: metrics.openFindings 
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
      const { type, scope, search, page, pageSize } = req.query;
      const filters = {
        type: type as string,
        scope: scope as string,
        search: search as string,
      };
      logger.storage("Fetching assets", { filters });
      const assets = await storage.getAssets(filters);
      
      const p = parseInt(page as string) || 1;
      const ps = parseInt(pageSize as string) || 20;
      const start = (p - 1) * ps;
      const paginatedAssets = assets.slice(start, start + ps);
      
      logger.debug("API", "Assets retrieved", { 
        total: assets.length, 
        page: p, 
        pageSize: ps,
        returned: paginatedAssets.length 
      });
      res.json({ assets: paginatedAssets, total: assets.length });
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
      const asset = await storage.updateAsset(req.params.id, req.body);
      if (!asset) {
        logger.warn("API", "Asset not found for update", { id: req.params.id });
        return res.status(404).json({ error: "Asset not found" });
      }
      logger.audit("Asset updated", { id: asset.id, name: asset.name });
      res.json(asset);
    } catch (error) {
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
      const { severity, status, search, page, pageSize, limit } = req.query;
      const filters = {
        severity: severity as string,
        status: status as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
      };
      logger.storage("Fetching vulnerabilities", { filters });
      const vulns = await storage.getVulnerabilities(filters);
      
      const p = parseInt(page as string) || 1;
      const ps = parseInt(pageSize as string) || 20;
      const start = (p - 1) * ps;
      const paginatedVulns = vulns.slice(start, start + ps);
      
      logger.debug("API", "Vulnerabilities retrieved", { 
        total: vulns.length, 
        page: p,
        returned: paginatedVulns.length 
      });
      res.json({ vulnerabilities: paginatedVulns, total: vulns.length });
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

  // Import vulnerabilities from CSV
  app.post("/api/vulnerabilities/import", async (req, res) => {
    try {
      const { data } = req.body as { data: Array<Record<string, string>> };
      
      if (!Array.isArray(data)) {
        logger.warn("API", "Import failed - data is not an array");
        return res.status(400).json({ error: "Data must be an array" });
      }

      logger.info("API", "Starting vulnerability import", { recordCount: data.length });
      
      const vulns = data.map((row) => {
        const techStack = row.tech_stack ? row.tech_stack.split(",").map((s: string) => s.trim()) : [];
        const recommendedActions = row.recommended_actions ? row.recommended_actions.split("|").map((s: string) => s.trim()) : [];
        
        return {
          assetId: row.id || "",
          assetType: (row.asset_type || "web_application") as AssetType,
          exposure: (row.exposure || "internal") as ExposureType,
          authModel: (row.auth_model || "none") as AuthModel,
          provider: row.provider || "",
          region: row.region || "",
          techStack,
          vulnClass: row.vuln_class || "Unknown",
          cwe: row.cwe || "CWE-000",
          severity: (row.severity || "medium") as Severity,
          confidence: parseFloat(row.confidence) || 0.5,
          signalSource: row.signal_source || "manual",
          symptoms: row.symptoms || "",
          attackPhase: (row.attack_phase || "reconnaissance") as AttackPhase,
          dataExposure: row.data_exposure || "",
          privilegeGain: row.privilege_gain || "",
          blastRadius: row.blast_radius || "",
          noAuth: row.no_auth === "True",
          rateLimited: row.rate_limited === "True",
          recommendedActions,
          exploitable: row.exploitable === "True",
          falsePositive: row.false_positive === "True",
        };
      });
      
      const count = await storage.importVulnerabilities(vulns);
      logger.audit("Vulnerabilities imported", { count, totalRecords: data.length });
      res.json({ imported: count });
    } catch (error) {
      logger.error("API", "Import error", { error });
      res.status(500).json({ error: "Failed to import vulnerabilities" });
    }
  });

  // Authorizations
  app.get("/api/authorizations", async (req, res) => {
    try {
      const { status } = req.query;
      logger.storage("Fetching authorizations", { status });
      const auths = await storage.getAuthorizations({
        status: status as string,
      });
      logger.debug("API", "Authorizations retrieved", { count: auths.length });
      res.json(auths);
    } catch (error) {
      logger.error("API", "Error fetching authorizations", { error });
      res.status(500).json({ error: "Failed to fetch authorizations" });
    }
  });

  app.get("/api/authorizations/:id", async (req, res) => {
    try {
      logger.storage("Fetching authorization by ID", { id: req.params.id });
      const auth = await storage.getAuthorization(req.params.id);
      if (!auth) {
        logger.warn("API", "Authorization not found", { id: req.params.id });
        return res.status(404).json({ error: "Authorization not found" });
      }
      res.json(auth);
    } catch (error) {
      logger.error("API", "Error fetching authorization", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to fetch authorization" });
    }
  });

  app.post("/api/authorizations", async (req, res) => {
    try {
      logger.debug("API", "Creating authorization", { title: req.body.title });
      const validatedData = insertAuthorizationSchema.parse(req.body);
      logger.validation(true, { schema: "insertAuthorizationSchema" });
      const auth = await storage.createAuthorization(validatedData);
      logger.audit("Authorization created", { 
        id: auth.id, 
        title: auth.title,
        scope: auth.scope,
        startDate: auth.startDate,
        endDate: auth.endDate 
      });
      res.status(201).json(auth);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      logger.error("API", "Error creating authorization", { error });
      res.status(500).json({ error: "Failed to create authorization" });
    }
  });

  app.patch("/api/authorizations/:id", async (req, res) => {
    try {
      logger.debug("API", "Updating authorization", { id: req.params.id, updates: Object.keys(req.body) });
      const auth = await storage.updateAuthorization(req.params.id, req.body);
      if (!auth) {
        logger.warn("API", "Authorization not found for update", { id: req.params.id });
        return res.status(404).json({ error: "Authorization not found" });
      }
      logger.audit("Authorization updated", { id: auth.id, title: auth.title });
      res.json(auth);
    } catch (error) {
      logger.error("API", "Error updating authorization", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to update authorization" });
    }
  });

  // Action Logs
  app.get("/api/actions", async (req, res) => {
    try {
      const { risk, approval, limit } = req.query;
      const filters = { risk: risk as string, approval: approval as string };
      logger.storage("Fetching actions", { filters });
      let actions = await storage.getActions(filters);
      
      if (limit) {
        actions = actions.slice(0, parseInt(limit as string));
      }
      
      logger.debug("API", "Actions retrieved", { count: actions.length });
      res.json(actions);
    } catch (error) {
      logger.error("API", "Error fetching actions", { error });
      res.status(500).json({ error: "Failed to fetch actions" });
    }
  });

  app.get("/api/actions/:id", async (req, res) => {
    try {
      logger.storage("Fetching action by ID", { id: req.params.id });
      const action = await storage.getAction(req.params.id);
      if (!action) {
        logger.warn("API", "Action not found", { id: req.params.id });
        return res.status(404).json({ error: "Action not found" });
      }
      res.json(action);
    } catch (error) {
      logger.error("API", "Error fetching action", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to fetch action" });
    }
  });

  app.post("/api/actions", async (req, res) => {
    try {
      logger.debug("API", "Creating action", { actionType: req.body.actionType });
      const validatedData = insertActionLogSchema.parse(req.body);
      logger.validation(true, { schema: "insertActionLogSchema" });
      const action = await storage.createAction(validatedData);
      logger.audit("Action created", { 
        id: action.id, 
        actionType: action.actionType,
        riskLevel: action.riskLevel 
      });
      res.status(201).json(action);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      logger.error("API", "Error creating action", { error });
      res.status(500).json({ error: "Failed to create action" });
    }
  });

  app.patch("/api/actions/:id/approve", async (req, res) => {
    try {
      const { approved } = req.body;
      logger.debug("API", "Processing action approval", { id: req.params.id, approved });
      if (approved) {
        const action = await storage.approveAction(req.params.id, "Security Admin");
        if (!action) {
          logger.warn("API", "Action not found for approval", { id: req.params.id });
          return res.status(404).json({ error: "Action not found" });
        }
        logger.audit("Action approved", { 
          id: action.id, 
          actionType: action.actionType,
          approvedBy: action.approvedBy 
        });
        res.json(action);
      } else {
        logger.warn("API", "Invalid approval status received", { id: req.params.id, approved });
        res.status(400).json({ error: "Invalid approval status" });
      }
    } catch (error) {
      logger.error("API", "Error approving action", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to approve action" });
    }
  });

  // Security Controls
  app.get("/api/controls", async (req, res) => {
    try {
      const { framework, status } = req.query;
      const filters = { framework: framework as string, status: status as string };
      logger.storage("Fetching controls", { filters });
      const controls = await storage.getControls(filters);
      logger.debug("API", "Controls retrieved", { count: controls.length });
      res.json(controls);
    } catch (error) {
      logger.error("API", "Error fetching controls", { error });
      res.status(500).json({ error: "Failed to fetch controls" });
    }
  });

  app.get("/api/controls/:id", async (req, res) => {
    try {
      logger.storage("Fetching control by ID", { id: req.params.id });
      const control = await storage.getControl(req.params.id);
      if (!control) {
        logger.warn("API", "Control not found", { id: req.params.id });
        return res.status(404).json({ error: "Control not found" });
      }
      res.json(control);
    } catch (error) {
      logger.error("API", "Error fetching control", { id: req.params.id, error });
      res.status(500).json({ error: "Failed to fetch control" });
    }
  });

  logger.info("ROUTES", "All API routes registered successfully", {
    endpoints: [
      "GET/POST /api/assets",
      "GET/PATCH/DELETE /api/assets/:id",
      "GET/PATCH /api/vulnerabilities",
      "POST /api/vulnerabilities/import",
      "GET/POST /api/authorizations",
      "GET/PATCH /api/authorizations/:id",
      "GET/POST /api/actions",
      "PATCH /api/actions/:id/approve",
      "GET /api/controls",
      "GET /api/dashboard/metrics"
    ]
  });

  return httpServer;
}
