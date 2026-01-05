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

// Assets table
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  exposure: text("exposure").notNull(),
  authModel: text("auth_model").notNull(),
  provider: text("provider").notNull().default(""),
  region: text("region").notNull().default(""),
  techStack: text("tech_stack").array().notNull().default(sql`'{}'::text[]`),
  inScope: boolean("in_scope").notNull().default(true),
  authorized: boolean("authorized").notNull().default(false),
  authorizationId: varchar("authorization_id"),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// Vulnerabilities table
export const vulnerabilities = pgTable("vulnerabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  assetId: varchar("asset_id").notNull(),
  assetType: text("asset_type").notNull(),
  exposure: text("exposure").notNull(),
  authModel: text("auth_model").notNull(),
  provider: text("provider").notNull().default(""),
  region: text("region").notNull().default(""),
  techStack: text("tech_stack").array().notNull().default(sql`'{}'::text[]`),
  vulnClass: text("vuln_class").notNull(),
  cwe: text("cwe").notNull(),
  severity: text("severity").notNull(),
  confidence: real("confidence").notNull(),
  signalSource: text("signal_source").notNull(),
  symptoms: text("symptoms").notNull(),
  attackPhase: text("attack_phase").notNull(),
  dataExposure: text("data_exposure").notNull().default(""),
  privilegeGain: text("privilege_gain").notNull().default(""),
  blastRadius: text("blast_radius").notNull().default(""),
  noAuth: boolean("no_auth").notNull().default(false),
  rateLimited: boolean("rate_limited").notNull().default(false),
  recommendedActions: text("recommended_actions").array().notNull().default(sql`'{}'::text[]`),
  exploitable: boolean("exploitable").notNull().default(false),
  falsePositive: boolean("false_positive").notNull().default(false),
  status: text("status").notNull().default("open"),
  assignee: text("assignee"),
  remediationNotes: text("remediation_notes"),
});

export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertVulnerability = typeof vulnerabilities.$inferInsert;

// Authorizations table
export const authorizations = pgTable("authorizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  scope: text("scope").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  authorizedBy: text("authorized_by").notNull(),
  status: text("status").notNull().default("pending"),
  targetAssets: text("target_assets").array().notNull().default(sql`'{}'::text[]`),
  restrictions: text("restrictions").array().notNull().default(sql`'{}'::text[]`),
  documentUrl: text("document_url"),
});

export type Authorization = typeof authorizations.$inferSelect;
export type InsertAuthorization = typeof authorizations.$inferInsert;

// Action Logs table
export const actionLogs = pgTable("action_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  action: text("action").notNull(),
  command: text("command"),
  intent: text("intent").notNull(),
  riskLevel: text("risk_level").notNull(),
  targetAsset: text("target_asset").notNull(),
  requiresApproval: boolean("requires_approval").notNull().default(false),
  approved: boolean("approved").notNull().default(false),
  approvedBy: text("approved_by"),
  approvalTimestamp: timestamp("approval_timestamp"),
  rollbackProcedure: text("rollback_procedure"),
  outcome: text("outcome").default("pending"),
  notes: text("notes"),
});

export type ActionLog = typeof actionLogs.$inferSelect;
export type InsertActionLog = typeof actionLogs.$inferInsert;

// Security Controls table
export const securityControls = pgTable("security_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  framework: text("framework").notNull(),
  controlId: text("control_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("planned"),
  linkedVulnerabilities: text("linked_vulnerabilities").array().notNull().default(sql`'{}'::text[]`),
});

export type SecurityControl = typeof securityControls.$inferSelect;
export type InsertSecurityControl = typeof securityControls.$inferInsert;

// Type definitions for enums (for type safety in the application)
export type Severity = "critical" | "high" | "medium" | "low" | "info";
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
export type ExposureType = "internet_facing" | "internal" | "partner_exposed";
export type AuthModel = "none" | "basic_auth" | "oauth2" | "jwt" | "session_cookie" | "sso_saml";
export type AttackPhase = 
  | "reconnaissance" 
  | "initial_access" 
  | "execution" 
  | "persistence" 
  | "privilege_escalation" 
  | "lateral_movement" 
  | "exfiltration"
  | "exploitation"
  | "post_exploitation";

// Dashboard metrics interface
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

// Test Plans interface (not stored in DB for now)
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

// Zod validation schemas for API requests
export const insertAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["web_application", "api", "cloud_storage", "database", "kubernetes_cluster", "container", "iam_role", "ci_cd_pipeline", "message_queue"]),
  exposure: z.enum(["internet_facing", "internal", "partner_exposed"]),
  authModel: z.enum(["none", "basic_auth", "oauth2", "jwt", "session_cookie", "sso_saml"]),
  provider: z.string().default(""),
  region: z.string().default(""),
  techStack: z.array(z.string()).default([]),
  inScope: z.boolean().default(true),
  authorized: z.boolean().default(false),
  authorizationId: z.string().optional(),
});

export const insertVulnerabilitySchema = z.object({
  assetId: z.string(),
  assetType: z.enum(["web_application", "api", "cloud_storage", "database", "kubernetes_cluster", "container", "iam_role", "ci_cd_pipeline", "message_queue"]),
  exposure: z.enum(["internet_facing", "internal", "partner_exposed"]),
  authModel: z.enum(["none", "basic_auth", "oauth2", "jwt", "session_cookie", "sso_saml"]),
  provider: z.string().default(""),
  region: z.string().default(""),
  techStack: z.array(z.string()).default([]),
  vulnClass: z.string(),
  cwe: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  confidence: z.number().min(0).max(100),
  signalSource: z.string(),
  symptoms: z.string(),
  attackPhase: z.enum(["reconnaissance", "initial_access", "execution", "persistence", "privilege_escalation", "lateral_movement", "exfiltration", "exploitation", "post_exploitation"]),
  dataExposure: z.string().default(""),
  privilegeGain: z.string().default(""),
  blastRadius: z.string().default(""),
  noAuth: z.boolean().default(false),
  rateLimited: z.boolean().default(false),
  recommendedActions: z.array(z.string()).default([]),
  exploitable: z.boolean().default(false),
  falsePositive: z.boolean().default(false),
});

export const updateVulnerabilitySchema = z.object({
  status: z.enum(["open", "in_progress", "remediated", "accepted", "false_positive"]).optional(),
  assignee: z.string().optional(),
  remediationNotes: z.string().optional(),
});

export const insertAuthorizationSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scope: z.string().min(1, "Scope is required"),
  startDate: z.string(),
  endDate: z.string(),
  authorizedBy: z.string().min(1, "Authorizer is required"),
  targetAssets: z.array(z.string()).default([]),
  restrictions: z.array(z.string()).default([]),
  documentUrl: z.string().optional(),
});

export const insertActionLogSchema = z.object({
  action: z.string().min(1, "Action is required"),
  command: z.string().optional(),
  intent: z.string().min(1, "Intent is required"),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  targetAsset: z.string().min(1, "Target asset is required"),
  requiresApproval: z.boolean().default(false),
  rollbackProcedure: z.string().optional(),
  notes: z.string().optional(),
});

export const insertSecurityControlSchema = z.object({
  framework: z.enum(["NIST", "ISO27001", "CIS"]),
  controlId: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  category: z.string().min(1),
  status: z.enum(["implemented", "partial", "planned", "not_applicable"]),
  linkedVulnerabilities: z.array(z.string()).default([]),
});

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
