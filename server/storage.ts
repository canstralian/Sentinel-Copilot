import { eq, ilike, and, sql, desc, count } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  assets,
  vulnerabilities,
  authorizations,
  actionLogs,
  securityControls,
  type User,
  type InsertUser,
  type Asset,
  type InsertAsset,
  type Vulnerability,
  type InsertVulnerability,
  type Authorization,
  type InsertAuthorization,
  type ActionLog,
  type InsertActionLog,
  type SecurityControl,
  type InsertSecurityControl,
  type DashboardMetrics,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAssets(filters?: { type?: string; scope?: string; search?: string }): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;

  getVulnerabilities(filters?: { severity?: string; status?: string; search?: string; limit?: number }): Promise<Vulnerability[]>;
  getVulnerability(id: string): Promise<Vulnerability | undefined>;
  createVulnerability(vuln: InsertVulnerability): Promise<Vulnerability>;
  updateVulnerability(id: string, updates: Partial<Vulnerability>): Promise<Vulnerability | undefined>;
  importVulnerabilities(vulns: InsertVulnerability[]): Promise<number>;

  getAuthorizations(filters?: { status?: string }): Promise<Authorization[]>;
  getAuthorization(id: string): Promise<Authorization | undefined>;
  createAuthorization(auth: InsertAuthorization): Promise<Authorization>;
  updateAuthorization(id: string, updates: Partial<Authorization>): Promise<Authorization | undefined>;

  getActions(filters?: { risk?: string; approval?: string }): Promise<ActionLog[]>;
  getAction(id: string): Promise<ActionLog | undefined>;
  createAction(action: InsertActionLog): Promise<ActionLog>;
  approveAction(id: string, approvedBy: string): Promise<ActionLog | undefined>;

  getControls(filters?: { framework?: string; status?: string }): Promise<SecurityControl[]>;
  getControl(id: string): Promise<SecurityControl | undefined>;
  createControl(control: InsertSecurityControl): Promise<SecurityControl>;

  getDashboardMetrics(): Promise<DashboardMetrics>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAssets(filters?: { type?: string; scope?: string; search?: string }): Promise<Asset[]> {
    const conditions = [];
    
    if (filters?.type) {
      conditions.push(eq(assets.type, filters.type));
    }
    if (filters?.scope === "in_scope") {
      conditions.push(eq(assets.inScope, true));
    } else if (filters?.scope === "out_of_scope") {
      conditions.push(eq(assets.inScope, false));
    }
    if (filters?.search) {
      conditions.push(ilike(assets.name, `%${filters.search}%`));
    }

    if (conditions.length > 0) {
      return await db.select().from(assets).where(and(...conditions));
    }
    return await db.select().from(assets);
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const [asset] = await db.select().from(assets).where(eq(assets.id, id));
    return asset || undefined;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [created] = await db.insert(assets).values(asset).returning();
    return created;
  }

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | undefined> {
    const [updated] = await db.update(assets).set(updates).where(eq(assets.id, id)).returning();
    return updated || undefined;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const result = await db.delete(assets).where(eq(assets.id, id)).returning();
    return result.length > 0;
  }

  async getVulnerabilities(filters?: { severity?: string; status?: string; search?: string; limit?: number }): Promise<Vulnerability[]> {
    const conditions = [];
    
    if (filters?.severity) {
      conditions.push(eq(vulnerabilities.severity, filters.severity));
    }
    if (filters?.status) {
      conditions.push(eq(vulnerabilities.status, filters.status));
    }
    if (filters?.search) {
      conditions.push(ilike(vulnerabilities.vulnClass, `%${filters.search}%`));
    }

    let query = db.select().from(vulnerabilities);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    query = query.orderBy(desc(vulnerabilities.createdAt)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    return await query;
  }

  async getVulnerability(id: string): Promise<Vulnerability | undefined> {
    const [vuln] = await db.select().from(vulnerabilities).where(eq(vulnerabilities.id, id));
    return vuln || undefined;
  }

  async createVulnerability(vuln: InsertVulnerability): Promise<Vulnerability> {
    const [created] = await db.insert(vulnerabilities).values(vuln).returning();
    return created;
  }

  async updateVulnerability(id: string, updates: Partial<Vulnerability>): Promise<Vulnerability | undefined> {
    const [updated] = await db.update(vulnerabilities).set(updates).where(eq(vulnerabilities.id, id)).returning();
    return updated || undefined;
  }

  async importVulnerabilities(vulns: InsertVulnerability[]): Promise<number> {
    if (vulns.length === 0) return 0;
    const result = await db.insert(vulnerabilities).values(vulns).returning();
    return result.length;
  }

  async getAuthorizations(filters?: { status?: string }): Promise<Authorization[]> {
    if (filters?.status) {
      return await db.select().from(authorizations).where(eq(authorizations.status, filters.status));
    }
    return await db.select().from(authorizations);
  }

  async getAuthorization(id: string): Promise<Authorization | undefined> {
    const [auth] = await db.select().from(authorizations).where(eq(authorizations.id, id));
    return auth || undefined;
  }

  async createAuthorization(auth: InsertAuthorization): Promise<Authorization> {
    const [created] = await db.insert(authorizations).values(auth).returning();
    return created;
  }

  async updateAuthorization(id: string, updates: Partial<Authorization>): Promise<Authorization | undefined> {
    const [updated] = await db.update(authorizations).set(updates).where(eq(authorizations.id, id)).returning();
    return updated || undefined;
  }

  async getActions(filters?: { risk?: string; approval?: string }): Promise<ActionLog[]> {
    const conditions = [];
    
    if (filters?.risk) {
      conditions.push(eq(actionLogs.riskLevel, filters.risk));
    }
    if (filters?.approval === "pending") {
      conditions.push(and(eq(actionLogs.requiresApproval, true), eq(actionLogs.approved, false)));
    } else if (filters?.approval === "approved") {
      conditions.push(eq(actionLogs.approved, true));
    }

    if (conditions.length > 0) {
      return await db.select().from(actionLogs).where(and(...conditions)).orderBy(desc(actionLogs.timestamp));
    }
    return await db.select().from(actionLogs).orderBy(desc(actionLogs.timestamp));
  }

  async getAction(id: string): Promise<ActionLog | undefined> {
    const [action] = await db.select().from(actionLogs).where(eq(actionLogs.id, id));
    return action || undefined;
  }

  async createAction(action: InsertActionLog): Promise<ActionLog> {
    const [created] = await db.insert(actionLogs).values(action).returning();
    return created;
  }

  async approveAction(id: string, approvedBy: string): Promise<ActionLog | undefined> {
    const [updated] = await db.update(actionLogs).set({
      approved: true,
      approvedBy,
      approvalTimestamp: new Date(),
    }).where(eq(actionLogs.id, id)).returning();
    return updated || undefined;
  }

  async getControls(filters?: { framework?: string; status?: string }): Promise<SecurityControl[]> {
    const conditions = [];
    
    if (filters?.framework) {
      conditions.push(eq(securityControls.framework, filters.framework));
    }
    if (filters?.status) {
      conditions.push(eq(securityControls.status, filters.status));
    }

    if (conditions.length > 0) {
      return await db.select().from(securityControls).where(and(...conditions));
    }
    return await db.select().from(securityControls);
  }

  async getControl(id: string): Promise<SecurityControl | undefined> {
    const [control] = await db.select().from(securityControls).where(eq(securityControls.id, id));
    return control || undefined;
  }

  async createControl(control: InsertSecurityControl): Promise<SecurityControl> {
    const [created] = await db.insert(securityControls).values(control).returning();
    return created;
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [assetCounts] = await db.select({
      total: count(),
      inScope: sql<number>`count(*) filter (where ${assets.inScope} = true)`,
    }).from(assets);

    const [vulnCounts] = await db.select({
      total: count(),
      critical: sql<number>`count(*) filter (where ${vulnerabilities.severity} = 'critical')`,
      high: sql<number>`count(*) filter (where ${vulnerabilities.severity} = 'high')`,
      medium: sql<number>`count(*) filter (where ${vulnerabilities.severity} = 'medium')`,
      low: sql<number>`count(*) filter (where ${vulnerabilities.severity} = 'low')`,
      open: sql<number>`count(*) filter (where ${vulnerabilities.status} = 'open')`,
      remediated: sql<number>`count(*) filter (where ${vulnerabilities.status} = 'remediated')`,
    }).from(vulnerabilities);

    const [authCounts] = await db.select({
      active: sql<number>`count(*) filter (where ${authorizations.status} = 'active')`,
    }).from(authorizations);

    const [actionCounts] = await db.select({
      pending: sql<number>`count(*) filter (where ${actionLogs.requiresApproval} = true and ${actionLogs.approved} = false)`,
    }).from(actionLogs);

    const [controlCounts] = await db.select({
      total: count(),
      implemented: sql<number>`count(*) filter (where ${securityControls.status} = 'implemented')`,
    }).from(securityControls);

    const totalControls = Number(controlCounts?.total ?? 0);
    const implementedControls = Number(controlCounts?.implemented ?? 0);

    return {
      totalAssets: Number(assetCounts?.total ?? 0),
      inScopeAssets: Number(assetCounts?.inScope ?? 0),
      totalVulnerabilities: Number(vulnCounts?.total ?? 0),
      criticalVulns: Number(vulnCounts?.critical ?? 0),
      highVulns: Number(vulnCounts?.high ?? 0),
      mediumVulns: Number(vulnCounts?.medium ?? 0),
      lowVulns: Number(vulnCounts?.low ?? 0),
      openFindings: Number(vulnCounts?.open ?? 0),
      remediatedFindings: Number(vulnCounts?.remediated ?? 0),
      activeAuthorizations: Number(authCounts?.active ?? 0),
      pendingApprovals: Number(actionCounts?.pending ?? 0),
      controlsCoverage: totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0,
    };
  }
}

export const storage = new DatabaseStorage();
