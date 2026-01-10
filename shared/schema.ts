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

// Assets table - simplified for vulnerability context
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  criticality: text("criticality").notNull().default("medium"),
  environment: text("environment").notNull().default("production"),
  owner: text("owner"),
  ipAddress: text("ip_address"),
  hostname: text("hostname"),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

// Vulnerabilities table - enhanced for Jira integration and prioritization
export const vulnerabilities = pgTable("vulnerabilities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  
  // Core vulnerability info
  title: text("title").notNull(),
  description: text("description"),
  cve: text("cve"),
  cwe: text("cwe"),
  severity: text("severity").notNull(),
  cvssScore: real("cvss_score"),
  
  // Asset reference
  assetId: varchar("asset_id"),
  assetName: text("asset_name"),
  
  // Scanner info
  source: text("source").notNull().default("manual"),
  scannerFindingId: text("scanner_finding_id"),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  
  // Prioritization
  riskScore: integer("risk_score").notNull().default(0),
  exploitAvailable: boolean("exploit_available").notNull().default(false),
  
  // Status tracking
  status: text("status").notNull().default("open"),
  assignee: text("assignee"),
  dueDate: timestamp("due_date"),
  
  // Jira integration
  jiraKey: text("jira_key"),
  jiraStatus: text("jira_status"),
  jiraUrl: text("jira_url"),
  
  // Remediation
  remediationNotes: text("remediation_notes"),
  resolvedAt: timestamp("resolved_at"),
});

export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type InsertVulnerability = typeof vulnerabilities.$inferInsert;

// Activity Log - for tracking vulnerability changes
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  userId: varchar("user_id"),
  userName: text("user_name"),
});

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// Jira Configuration
export const jiraConfig = pgTable("jira_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  baseUrl: text("base_url").notNull(),
  projectKey: text("project_key").notNull(),
  issueType: text("issue_type").notNull().default("Bug"),
  apiEmail: text("api_email"),
  isConfigured: boolean("is_configured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type JiraConfig = typeof jiraConfig.$inferSelect;
export type InsertJiraConfig = typeof jiraConfig.$inferInsert;

// Type definitions
export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type AssetType = "server" | "application" | "database" | "network" | "cloud" | "endpoint" | "container" | "other";
export type AssetCriticality = "critical" | "high" | "medium" | "low";
export type Environment = "production" | "staging" | "development" | "testing";
export type VulnStatus = "open" | "in_progress" | "resolved" | "accepted" | "false_positive";
export type VulnSource = "nessus" | "qualys" | "rapid7" | "tenable" | "crowdstrike" | "manual" | "csv_import" | "other";

// Dashboard metrics interface - focused on vulnerabilities
export interface DashboardMetrics {
  totalVulnerabilities: number;
  openVulnerabilities: number;
  criticalVulns: number;
  highVulns: number;
  mediumVulns: number;
  lowVulns: number;
  resolvedThisWeek: number;
  avgTimeToRemediate: number;
  vulnsWithJira: number;
  overdueVulns: number;
  totalAssets: number;
  assetsWithVulns: number;
}

// Zod validation schemas
export const insertAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["server", "application", "database", "network", "cloud", "endpoint", "container", "other"]),
  criticality: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  environment: z.enum(["production", "staging", "development", "testing"]).default("production"),
  owner: z.string().optional(),
  ipAddress: z.string().optional(),
  hostname: z.string().optional(),
});

export const insertVulnerabilitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  cve: z.string().optional(),
  cwe: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  cvssScore: z.number().min(0).max(10).optional(),
  assetId: z.string().optional(),
  assetName: z.string().optional(),
  source: z.enum(["nessus", "qualys", "rapid7", "tenable", "crowdstrike", "manual", "csv_import", "other"]).default("manual"),
  scannerFindingId: z.string().optional(),
  exploitAvailable: z.boolean().default(false),
});

export const updateVulnerabilitySchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "accepted", "false_positive"]).optional(),
  assignee: z.string().optional().nullable(),
  remediationNotes: z.string().optional(),
  jiraKey: z.string().optional(),
  jiraStatus: z.string().optional(),
  jiraUrl: z.string().optional(),
  dueDate: z.string().optional(),
});

export const insertActivityLogSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  action: z.string().min(1),
  details: z.string().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
});

export const insertJiraConfigSchema = z.object({
  baseUrl: z.string().url("Must be a valid URL"),
  projectKey: z.string().min(1, "Project key is required"),
  issueType: z.string().default("Bug"),
  apiEmail: z.string().email().optional(),
});

// CSV import schema for vulnerabilities
export const vulnerabilityImportSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  cve: z.string().optional(),
  cwe: z.string().optional(),
  severity: z.string(),
  cvss_score: z.string().optional(),
  asset_name: z.string().optional(),
  source: z.string().optional(),
  exploit_available: z.string().optional(),
});

export type VulnerabilityImportRow = z.infer<typeof vulnerabilityImportSchema>;

// Helper function to calculate risk score
export function calculateRiskScore(vuln: {
  severity: string;
  exploitAvailable: boolean;
  assetCriticality?: string;
  daysOpen?: number;
}): number {
  let score = 0;
  
  // Base score from severity
  switch (vuln.severity) {
    case "critical": score = 40; break;
    case "high": score = 30; break;
    case "medium": score = 20; break;
    case "low": score = 10; break;
    default: score = 5;
  }
  
  // Exploit available adds weight
  if (vuln.exploitAvailable) {
    score += 25;
  }
  
  // Asset criticality multiplier
  if (vuln.assetCriticality) {
    switch (vuln.assetCriticality) {
      case "critical": score *= 1.5; break;
      case "high": score *= 1.25; break;
      case "medium": score *= 1.0; break;
      case "low": score *= 0.75; break;
    }
  }
  
  // Age factor - older vulns are more risky
  if (vuln.daysOpen) {
    if (vuln.daysOpen > 90) score += 20;
    else if (vuln.daysOpen > 30) score += 10;
    else if (vuln.daysOpen > 7) score += 5;
  }
  
  return Math.min(Math.round(score), 100);
}
