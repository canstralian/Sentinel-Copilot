import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import type { InsertAsset, InsertAuthorization, InsertActionLog, Severity, AssetType, ExposureType, AuthModel, AttackPhase } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Dashboard metrics
  app.get("/api/dashboard/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard metrics" });
    }
  });

  // Assets
  app.get("/api/assets", async (req, res) => {
    try {
      const { type, scope, search, page, pageSize } = req.query;
      const assets = await storage.getAssets({
        type: type as string,
        scope: scope as string,
        search: search as string,
      });
      
      const p = parseInt(page as string) || 1;
      const ps = parseInt(pageSize as string) || 20;
      const start = (p - 1) * ps;
      const paginatedAssets = assets.slice(start, start + ps);
      
      res.json({ assets: paginatedAssets, total: assets.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch assets" });
    }
  });

  app.get("/api/assets/:id", async (req, res) => {
    try {
      const asset = await storage.getAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch asset" });
    }
  });

  app.post("/api/assets", async (req, res) => {
    try {
      const asset = await storage.createAsset(req.body as InsertAsset);
      res.status(201).json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to create asset" });
    }
  });

  app.patch("/api/assets/:id", async (req, res) => {
    try {
      const asset = await storage.updateAsset(req.params.id, req.body);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.json(asset);
    } catch (error) {
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  app.delete("/api/assets/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAsset(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Asset not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete asset" });
    }
  });

  // Vulnerabilities
  app.get("/api/vulnerabilities", async (req, res) => {
    try {
      const { severity, status, search, page, pageSize, limit } = req.query;
      const vulns = await storage.getVulnerabilities({
        severity: severity as string,
        status: status as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      const p = parseInt(page as string) || 1;
      const ps = parseInt(pageSize as string) || 20;
      const start = (p - 1) * ps;
      const paginatedVulns = vulns.slice(start, start + ps);
      
      res.json({ vulnerabilities: paginatedVulns, total: vulns.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vulnerabilities" });
    }
  });

  app.get("/api/vulnerabilities/:id", async (req, res) => {
    try {
      const vuln = await storage.getVulnerability(req.params.id);
      if (!vuln) {
        return res.status(404).json({ error: "Vulnerability not found" });
      }
      res.json(vuln);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vulnerability" });
    }
  });

  app.patch("/api/vulnerabilities/:id", async (req, res) => {
    try {
      const vuln = await storage.updateVulnerability(req.params.id, req.body);
      if (!vuln) {
        return res.status(404).json({ error: "Vulnerability not found" });
      }
      res.json(vuln);
    } catch (error) {
      res.status(500).json({ error: "Failed to update vulnerability" });
    }
  });

  // Import vulnerabilities from CSV
  app.post("/api/vulnerabilities/import", async (req, res) => {
    try {
      const { data } = req.body as { data: Array<Record<string, string>> };
      
      const vulns = data.map((row) => {
        const techStack = row.tech_stack ? row.tech_stack.split(",").map((s: string) => s.trim()) : [];
        const recommendedActions = row.recommended_actions ? row.recommended_actions.split("|").map((s: string) => s.trim()) : [];
        
        return {
          assetId: row.id,
          assetType: row.asset_type as AssetType,
          exposure: row.exposure as ExposureType,
          authModel: row.auth_model as AuthModel,
          provider: row.provider || "",
          region: row.region || "",
          techStack,
          vulnClass: row.vuln_class,
          cwe: row.cwe,
          severity: row.severity as Severity,
          confidence: parseFloat(row.confidence) || 0,
          signalSource: row.signal_source,
          symptoms: row.symptoms,
          attackPhase: row.attack_phase as AttackPhase,
          dataExposure: row.data_exposure,
          privilegeGain: row.privilege_gain,
          blastRadius: row.blast_radius,
          noAuth: row.no_auth === "True",
          rateLimited: row.rate_limited === "True",
          recommendedActions,
          exploitable: row.exploitable === "True",
          falsePositive: row.false_positive === "True",
        };
      });
      
      const count = await storage.importVulnerabilities(vulns);
      res.json({ imported: count });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Failed to import vulnerabilities" });
    }
  });

  // Authorizations
  app.get("/api/authorizations", async (req, res) => {
    try {
      const { status } = req.query;
      const auths = await storage.getAuthorizations({
        status: status as string,
      });
      res.json(auths);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch authorizations" });
    }
  });

  app.get("/api/authorizations/:id", async (req, res) => {
    try {
      const auth = await storage.getAuthorization(req.params.id);
      if (!auth) {
        return res.status(404).json({ error: "Authorization not found" });
      }
      res.json(auth);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch authorization" });
    }
  });

  app.post("/api/authorizations", async (req, res) => {
    try {
      const auth = await storage.createAuthorization(req.body as InsertAuthorization);
      res.status(201).json(auth);
    } catch (error) {
      res.status(500).json({ error: "Failed to create authorization" });
    }
  });

  app.patch("/api/authorizations/:id", async (req, res) => {
    try {
      const auth = await storage.updateAuthorization(req.params.id, req.body);
      if (!auth) {
        return res.status(404).json({ error: "Authorization not found" });
      }
      res.json(auth);
    } catch (error) {
      res.status(500).json({ error: "Failed to update authorization" });
    }
  });

  // Action Logs
  app.get("/api/actions", async (req, res) => {
    try {
      const { risk, approval, limit } = req.query;
      let actions = await storage.getActions({
        risk: risk as string,
        approval: approval as string,
      });
      
      if (limit) {
        actions = actions.slice(0, parseInt(limit as string));
      }
      
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch actions" });
    }
  });

  app.get("/api/actions/:id", async (req, res) => {
    try {
      const action = await storage.getAction(req.params.id);
      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }
      res.json(action);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch action" });
    }
  });

  app.post("/api/actions", async (req, res) => {
    try {
      const action = await storage.createAction(req.body as InsertActionLog);
      res.status(201).json(action);
    } catch (error) {
      res.status(500).json({ error: "Failed to create action" });
    }
  });

  app.patch("/api/actions/:id/approve", async (req, res) => {
    try {
      const { approved } = req.body;
      if (approved) {
        const action = await storage.approveAction(req.params.id, "Security Admin");
        if (!action) {
          return res.status(404).json({ error: "Action not found" });
        }
        res.json(action);
      } else {
        res.status(400).json({ error: "Invalid approval status" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to approve action" });
    }
  });

  // Security Controls
  app.get("/api/controls", async (req, res) => {
    try {
      const { framework, status } = req.query;
      const controls = await storage.getControls({
        framework: framework as string,
        status: status as string,
      });
      res.json(controls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch controls" });
    }
  });

  app.get("/api/controls/:id", async (req, res) => {
    try {
      const control = await storage.getControl(req.params.id);
      if (!control) {
        return res.status(404).json({ error: "Control not found" });
      }
      res.json(control);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch control" });
    }
  });

  return httpServer;
}
