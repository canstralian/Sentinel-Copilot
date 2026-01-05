import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Severity levels
export type Severity = "critical" | "high" | "medium" | "low" | "info";

// Asset types
export type AssetType = 
  | "web_application" 
  | "api" 
  | "cloud_storage" 
  | "database" 
  | "kubernetes_cluster" 
  | "container" 
  | "iam_role" 
  | "ci_cd_pipeline" 
  | "message_queue";

// Exposure types
export type ExposureType = "internet_facing" | "internal" | "partner_exposed";

// Auth models
export type AuthModel = "none" | "basic_auth" | "oauth2" | "jwt" | "session_cookie" | "sso_saml";

// Attack phases
export type AttackPhase = 
  | "reconnaissance" 
  | "initial_access" 
  | "execution" 
  | "persistence" 
  | "privilege_escalation" 
  | "lateral_movement" 
  | "exfiltration";

// Assets
export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  exposure: ExposureType;
  authModel: AuthModel;
  provider: string;
  region: string;
  techStack: string[];
  inScope: boolean;
  authorized: boolean;
  authorizationId?: string;
}

export interface InsertAsset {
  name: string;
  type: AssetType;
  exposure: ExposureType;
  authModel: AuthModel;
  provider: string;
  region: string;
  techStack: string[];
  inScope: boolean;
  authorized: boolean;
  authorizationId?: string;
}

// Vulnerabilities / Findings
export interface Vulnerability {
  id: string;
  createdAt: string;
  assetId: string;
  assetType: AssetType;
  exposure: ExposureType;
  authModel: AuthModel;
  provider: string;
  region: string;
  techStack: string[];
  vulnClass: string;
  cwe: string;
  severity: Severity;
  confidence: number;
  signalSource: string;
  symptoms: string;
  attackPhase: AttackPhase;
  dataExposure: string;
  privilegeGain: string;
  blastRadius: string;
  noAuth: boolean;
  rateLimited: boolean;
  recommendedActions: string[];
  exploitable: boolean;
  falsePositive: boolean;
  status: "open" | "in_progress" | "remediated" | "accepted" | "false_positive";
  assignee?: string;
  remediationNotes?: string;
}

export interface InsertVulnerability {
  assetId: string;
  assetType: AssetType;
  exposure: ExposureType;
  authModel: AuthModel;
  provider: string;
  region: string;
  techStack: string[];
  vulnClass: string;
  cwe: string;
  severity: Severity;
  confidence: number;
  signalSource: string;
  symptoms: string;
  attackPhase: AttackPhase;
  dataExposure: string;
  privilegeGain: string;
  blastRadius: string;
  noAuth: boolean;
  rateLimited: boolean;
  recommendedActions: string[];
  exploitable: boolean;
  falsePositive: boolean;
}

// Authorizations
export interface Authorization {
  id: string;
  title: string;
  scope: string;
  startDate: string;
  endDate: string;
  authorizedBy: string;
  status: "active" | "expired" | "pending" | "revoked";
  targetAssets: string[];
  restrictions: string[];
  documentUrl?: string;
}

export interface InsertAuthorization {
  title: string;
  scope: string;
  startDate: string;
  endDate: string;
  authorizedBy: string;
  targetAssets: string[];
  restrictions: string[];
  documentUrl?: string;
}

// Action Logs
export interface ActionLog {
  id: string;
  timestamp: string;
  action: string;
  command?: string;
  intent: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  targetAsset: string;
  requiresApproval: boolean;
  approved: boolean;
  approvedBy?: string;
  approvalTimestamp?: string;
  rollbackProcedure?: string;
  outcome?: "pending" | "success" | "failure" | "rolled_back";
  notes?: string;
}

export interface InsertActionLog {
  action: string;
  command?: string;
  intent: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  targetAsset: string;
  requiresApproval: boolean;
  rollbackProcedure?: string;
  notes?: string;
}

// Security Controls
export interface SecurityControl {
  id: string;
  framework: "NIST" | "ISO27001" | "CIS";
  controlId: string;
  title: string;
  description: string;
  category: string;
  status: "implemented" | "partial" | "planned" | "not_applicable";
  linkedVulnerabilities: string[];
}

export interface InsertSecurityControl {
  framework: "NIST" | "ISO27001" | "CIS";
  controlId: string;
  title: string;
  description: string;
  category: string;
  status: "implemented" | "partial" | "planned" | "not_applicable";
  linkedVulnerabilities: string[];
}

// Test Plans
export interface TestPlan {
  id: string;
  title: string;
  description: string;
  targetVulnerability: string;
  steps: TestStep[];
  rollbackProcedure: string;
  estimatedImpact: "none" | "low" | "medium";
  status: "draft" | "approved" | "in_progress" | "completed" | "cancelled";
  authorizationId: string;
}

export interface TestStep {
  order: number;
  action: string;
  expectedResult: string;
  evidenceRequired: boolean;
}

export interface InsertTestPlan {
  title: string;
  description: string;
  targetVulnerability: string;
  steps: TestStep[];
  rollbackProcedure: string;
  estimatedImpact: "none" | "low" | "medium";
  authorizationId: string;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalAssets: number;
  inScopeAssets: number;
  totalVulnerabilities: number;
  criticalVulns: number;
  highVulns: number;
  mediumVulns: number;
  lowVulns: number;
  openFindings: number;
  remediatedFindings: number;
  activeAuthorizations: number;
  pendingApprovals: number;
  controlsCoverage: number;
}

// CSV import schema for vulnerabilities
export const vulnerabilityCsvSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  environment: z.string(),
  asset_type: z.string(),
  exposure: z.string(),
  auth_model: z.string(),
  provider: z.string().optional(),
  region: z.string().optional(),
  tech_stack: z.string(),
  vuln_class: z.string(),
  cwe: z.string(),
  severity: z.string(),
  confidence: z.string(),
  signal_source: z.string(),
  symptoms: z.string(),
  attack_phase: z.string(),
  data_exposure: z.string(),
  privilege_gain: z.string(),
  blast_radius: z.string(),
  no_auth: z.string(),
  rate_limited: z.string(),
  recommended_actions: z.string(),
  exploitable: z.string(),
  false_positive: z.string(),
});

export type VulnerabilityCsvRow = z.infer<typeof vulnerabilityCsvSchema>;
