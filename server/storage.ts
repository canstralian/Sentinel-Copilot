import { eq, ilike, and, sql, desc, count, gte, isNull, isNotNull, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  assets,
  vulnerabilities,
  activityLogs,
  jiraConfig,
  calculateRiskScore,
  type User,
  type InsertUser,
  type Asset,
  type InsertAsset,
  type Vulnerability,
  type InsertVulnerability,
  type ActivityLog,
  type InsertActivityLog,
  type JiraConfig,
  type InsertJiraConfig,
  type DashboardMetrics,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAssets(filters?: { type?: string; search?: string; page?: number; pageSize?: number }): Promise<{ assets: Asset[]; total: number }>;
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;

  getVulnerabilities(filters?: { 
    severity?: string; 
    status?: string; 
    search?: string; 
    limit?: number;
    hasJira?: boolean;
    assignee?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ vulnerabilities: Vulnerability[]; total: number }>;
  getVulnerability(id: string): Promise<Vulnerability | undefined>;
  createVulnerability(vuln: InsertVulnerability): Promise<Vulnerability>;
  updateVulnerability(id: string, updates: Partial<Vulnerability>): Promise<Vulnerability | undefined>;
  bulkUpdateVulnerabilities(ids: string[], updates: Partial<Vulnerability>): Promise<number>;
  importVulnerabilities(vulns: InsertVulnerability[]): Promise<number>;

  getActivityLogs(filters?: { entityType?: string; entityId?: string; limit?: number }): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  getJiraConfig(): Promise<JiraConfig | undefined>;
  saveJiraConfig(config: InsertJiraConfig): Promise<JiraConfig>;

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

  async getAssets(filters?: { type?: string; search?: string; page?: number; pageSize?: number }): Promise<{ assets: Asset[]; total: number }> {
    const conditions = [];
    
    if (filters?.type) {
      conditions.push(eq(assets.type, filters.type));
    }
    if (filters?.search) {
      conditions.push(ilike(assets.name, `%${filters.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [countResult] = await db.select({ count: count() }).from(assets).where(whereClause);
    const total = Number(countResult?.count ?? 0);
    
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    
    let query = db.select().from(assets);
    if (whereClause) {
      query = query.where(whereClause) as typeof query;
    }
    const result = await query.limit(pageSize).offset(offset);
    
    return { assets: result, total };
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

  async getVulnerabilities(filters?: { 
    severity?: string; 
    status?: string; 
    search?: string; 
    limit?: number;
    hasJira?: boolean;
    assignee?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ vulnerabilities: Vulnerability[]; total: number }> {
    const conditions = [];
    
    if (filters?.severity) {
      conditions.push(eq(vulnerabilities.severity, filters.severity));
    }
    if (filters?.status) {
      conditions.push(eq(vulnerabilities.status, filters.status));
    }
    if (filters?.search) {
      conditions.push(ilike(vulnerabilities.title, `%${filters.search}%`));
    }
    if (filters?.hasJira === true) {
      conditions.push(isNotNull(vulnerabilities.jiraKey));
    } else if (filters?.hasJira === false) {
      conditions.push(isNull(vulnerabilities.jiraKey));
    }
    if (filters?.assignee) {
      conditions.push(eq(vulnerabilities.assignee, filters.assignee));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const [countResult] = await db.select({ count: count() }).from(vulnerabilities).where(whereClause);
    const total = Number(countResult?.count ?? 0);

    let query = db.select().from(vulnerabilities);
    
    if (whereClause) {
      query = query.where(whereClause) as typeof query;
    }
    
    query = query.orderBy(desc(vulnerabilities.riskScore), desc(vulnerabilities.createdAt)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    } else if (filters?.page !== undefined && filters?.pageSize !== undefined) {
      const offset = (filters.page - 1) * filters.pageSize;
      query = query.limit(filters.pageSize).offset(offset) as typeof query;
    }

    const result = await query;
    return { vulnerabilities: result, total };
  }

  async getVulnerability(id: string): Promise<Vulnerability | undefined> {
    const [vuln] = await db.select().from(vulnerabilities).where(eq(vulnerabilities.id, id));
    return vuln || undefined;
  }

  async createVulnerability(vuln: InsertVulnerability): Promise<Vulnerability> {
    const riskScore = calculateRiskScore({
      severity: vuln.severity,
      exploitAvailable: vuln.exploitAvailable || false,
    });
    
    const [created] = await db.insert(vulnerabilities).values({
      ...vuln,
      riskScore,
    }).returning();
    return created;
  }

  async updateVulnerability(id: string, updates: Partial<Vulnerability>): Promise<Vulnerability | undefined> {
    const updateData: Partial<Vulnerability> = {
      ...updates,
      updatedAt: new Date(),
    };
    
    if (updates.status === "resolved" && !updates.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    
    const [updated] = await db.update(vulnerabilities)
      .set(updateData)
      .where(eq(vulnerabilities.id, id))
      .returning();
    return updated || undefined;
  }

  async bulkUpdateVulnerabilities(ids: string[], updates: Partial<Vulnerability>): Promise<number> {
    if (ids.length === 0) return 0;
    
    const updateData: Partial<Vulnerability> = {
      ...updates,
      updatedAt: new Date(),
    };
    
    if (updates.status === "resolved") {
      updateData.resolvedAt = new Date();
    }
    
    const result = await db.update(vulnerabilities)
      .set(updateData)
      .where(inArray(vulnerabilities.id, ids))
      .returning();
    
    return result.length;
  }

  async importVulnerabilities(vulns: InsertVulnerability[]): Promise<number> {
    if (vulns.length === 0) return 0;
    
    const vulnsWithScore = vulns.map(vuln => ({
      ...vuln,
      riskScore: calculateRiskScore({
        severity: vuln.severity,
        exploitAvailable: vuln.exploitAvailable || false,
      }),
    }));
    
    const result = await db.insert(vulnerabilities).values(vulnsWithScore).returning();
    return result.length;
  }

  async getActivityLogs(filters?: { entityType?: string; entityId?: string; limit?: number }): Promise<ActivityLog[]> {
    const conditions = [];
    
    if (filters?.entityType) {
      conditions.push(eq(activityLogs.entityType, filters.entityType));
    }
    if (filters?.entityId) {
      conditions.push(eq(activityLogs.entityId, filters.entityId));
    }

    let query = db.select().from(activityLogs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    query = query.orderBy(desc(activityLogs.timestamp)) as typeof query;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }

    return await query;
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [created] = await db.insert(activityLogs).values(log).returning();
    return created;
  }

  async getJiraConfig(): Promise<JiraConfig | undefined> {
    const [config] = await db.select().from(jiraConfig).limit(1);
    return config || undefined;
  }

  async saveJiraConfig(config: InsertJiraConfig): Promise<JiraConfig> {
    const existing = await this.getJiraConfig();
    
    if (existing) {
      const [updated] = await db.update(jiraConfig)
        .set({
          ...config,
          isConfigured: true,
          updatedAt: new Date(),
        })
        .where(eq(jiraConfig.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(jiraConfig)
        .values({
          ...config,
          isConfigured: true,
        })
        .returning();
      return created;
    }
  }

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [vulnCounts] = await db.select({
      total: count(),
      open: sql<number>`count(*) filter (where ${vulnerabilities.status} = 'open')`,
      inProgress: sql<number>`count(*) filter (where ${vulnerabilities.status} = 'in_progress')`,
      critical: sql<number>`count(*) filter (where ${vulnerabilities.severity} = 'critical' and ${vulnerabilities.status} in ('open', 'in_progress'))`,
      high: sql<number>`count(*) filter (where ${vulnerabilities.severity} = 'high' and ${vulnerabilities.status} in ('open', 'in_progress'))`,
      medium: sql<number>`count(*) filter (where ${vulnerabilities.severity} = 'medium' and ${vulnerabilities.status} in ('open', 'in_progress'))`,
      low: sql<number>`count(*) filter (where ${vulnerabilities.severity} = 'low' and ${vulnerabilities.status} in ('open', 'in_progress'))`,
      resolvedThisWeek: sql<number>`count(*) filter (where ${vulnerabilities.status} = 'resolved' and ${vulnerabilities.resolvedAt} >= ${oneWeekAgo})`,
      withJira: sql<number>`count(*) filter (where ${vulnerabilities.jiraKey} is not null)`,
      overdue: sql<number>`count(*) filter (where ${vulnerabilities.dueDate} < now() and ${vulnerabilities.status} in ('open', 'in_progress'))`,
    }).from(vulnerabilities);

    const [assetCounts] = await db.select({
      total: count(),
    }).from(assets);

    const openVulns = Number(vulnCounts?.open ?? 0) + Number(vulnCounts?.inProgress ?? 0);

    return {
      totalVulnerabilities: Number(vulnCounts?.total ?? 0),
      openVulnerabilities: openVulns,
      criticalVulns: Number(vulnCounts?.critical ?? 0),
      highVulns: Number(vulnCounts?.high ?? 0),
      mediumVulns: Number(vulnCounts?.medium ?? 0),
      lowVulns: Number(vulnCounts?.low ?? 0),
      resolvedThisWeek: Number(vulnCounts?.resolvedThisWeek ?? 0),
      avgTimeToRemediate: 0,
      vulnsWithJira: Number(vulnCounts?.withJira ?? 0),
      overdueVulns: Number(vulnCounts?.overdue ?? 0),
      totalAssets: Number(assetCounts?.total ?? 0),
      assetsWithVulns: 0,
    };
  }
}

export const storage = new DatabaseStorage();
