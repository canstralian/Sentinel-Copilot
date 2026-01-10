import { db } from "./db";
import { assets, vulnerabilities, activityLogs } from "@shared/schema";
import { count } from "drizzle-orm";

export async function seedDatabase() {
  const [assetCount] = await db.select({ count: count() }).from(assets);
  
  if (assetCount.count > 0) {
    console.log("Database already has data, skipping seed");
    return;
  }

  console.log("Seeding database with sample data...");

  const sampleAssets = [
    { name: "Web Server - Production", type: "server", criticality: "critical", environment: "production", owner: "DevOps Team", ipAddress: "10.0.1.100", hostname: "web-prod-01" },
    { name: "Database Server - MySQL", type: "database", criticality: "critical", environment: "production", owner: "DBA Team", ipAddress: "10.0.1.101", hostname: "db-prod-01" },
    { name: "Customer Portal", type: "application", criticality: "high", environment: "production", owner: "Engineering", hostname: "portal.example.com" },
    { name: "API Gateway", type: "network", criticality: "high", environment: "production", owner: "Platform Team", ipAddress: "10.0.1.10", hostname: "api-gw-01" },
    { name: "AWS S3 Storage", type: "cloud", criticality: "medium", environment: "production", owner: "Cloud Team" },
    { name: "Developer Workstations", type: "endpoint", criticality: "medium", environment: "development", owner: "IT Support" },
    { name: "Kubernetes Cluster", type: "container", criticality: "high", environment: "production", owner: "Platform Team", hostname: "k8s-prod.internal" },
    { name: "Staging Server", type: "server", criticality: "low", environment: "staging", owner: "QA Team", ipAddress: "10.0.2.100", hostname: "staging-01" },
  ];

  const createdAssets = await db.insert(assets).values(sampleAssets).returning();
  console.log(`Created ${createdAssets.length} assets`);

  const sampleVulns = [
    { 
      title: "Apache Log4j Remote Code Execution (Log4Shell)", 
      description: "Critical remote code execution vulnerability in Apache Log4j library allowing unauthenticated attackers to execute arbitrary code.", 
      cve: "CVE-2021-44228", 
      cwe: "CWE-502", 
      severity: "critical", 
      cvssScore: 10.0,
      assetId: createdAssets[0].id,
      assetName: "Web Server - Production",
      source: "nessus",
      exploitAvailable: true,
      status: "open",
      riskScore: 95,
    },
    { 
      title: "SQL Injection in User Authentication", 
      description: "SQL injection vulnerability in login form allows attackers to bypass authentication and access sensitive data.", 
      cve: null, 
      cwe: "CWE-89", 
      severity: "critical", 
      cvssScore: 9.8,
      assetId: createdAssets[2].id,
      assetName: "Customer Portal",
      source: "manual",
      exploitAvailable: true,
      status: "in_progress",
      assignee: "John Smith",
      riskScore: 90,
    },
    { 
      title: "OpenSSL Heartbleed Vulnerability", 
      description: "Memory disclosure vulnerability in OpenSSL allows reading sensitive server memory.", 
      cve: "CVE-2014-0160", 
      cwe: "CWE-126", 
      severity: "high", 
      cvssScore: 7.5,
      assetId: createdAssets[0].id,
      assetName: "Web Server - Production",
      source: "qualys",
      exploitAvailable: true,
      status: "open",
      riskScore: 75,
    },
    { 
      title: "MySQL Default Credentials", 
      description: "Database server using default administrator credentials.", 
      cve: null, 
      cwe: "CWE-798", 
      severity: "high", 
      cvssScore: 8.1,
      assetId: createdAssets[1].id,
      assetName: "Database Server - MySQL",
      source: "tenable",
      exploitAvailable: true,
      status: "open",
      riskScore: 80,
    },
    { 
      title: "Cross-Site Scripting (XSS) in Search", 
      description: "Reflected XSS vulnerability in search functionality allows script injection.", 
      cve: null, 
      cwe: "CWE-79", 
      severity: "medium", 
      cvssScore: 6.1,
      assetId: createdAssets[2].id,
      assetName: "Customer Portal",
      source: "manual",
      exploitAvailable: false,
      status: "open",
      riskScore: 45,
    },
    { 
      title: "S3 Bucket Public Access Enabled", 
      description: "AWS S3 bucket is configured with public read access exposing sensitive data.", 
      cve: null, 
      cwe: "CWE-284", 
      severity: "high", 
      cvssScore: 7.5,
      assetId: createdAssets[4].id,
      assetName: "AWS S3 Storage",
      source: "crowdstrike",
      exploitAvailable: true,
      status: "resolved",
      riskScore: 0,
    },
    { 
      title: "Kubernetes API Server Misconfiguration", 
      description: "Kubernetes API server allows unauthenticated access to sensitive endpoints.", 
      cve: null, 
      cwe: "CWE-306", 
      severity: "high", 
      cvssScore: 8.2,
      assetId: createdAssets[6].id,
      assetName: "Kubernetes Cluster",
      source: "manual",
      exploitAvailable: false,
      status: "open",
      riskScore: 65,
    },
    { 
      title: "Outdated TLS Version", 
      description: "Server supports TLS 1.0 which has known vulnerabilities.", 
      cve: null, 
      cwe: "CWE-327", 
      severity: "medium", 
      cvssScore: 5.3,
      assetId: createdAssets[3].id,
      assetName: "API Gateway",
      source: "nessus",
      exploitAvailable: false,
      status: "open",
      riskScore: 35,
    },
    { 
      title: "Missing Security Headers", 
      description: "Web server missing critical security headers (HSTS, X-Frame-Options, CSP).", 
      cve: null, 
      cwe: "CWE-693", 
      severity: "low", 
      cvssScore: 3.7,
      assetId: createdAssets[2].id,
      assetName: "Customer Portal",
      source: "qualys",
      exploitAvailable: false,
      status: "accepted",
      riskScore: 15,
    },
    { 
      title: "Information Disclosure via Error Messages", 
      description: "Application reveals sensitive internal information in error messages.", 
      cve: null, 
      cwe: "CWE-209", 
      severity: "low", 
      cvssScore: 4.3,
      assetId: createdAssets[2].id,
      assetName: "Customer Portal",
      source: "manual",
      exploitAvailable: false,
      status: "open",
      riskScore: 20,
    },
  ];

  await db.insert(vulnerabilities).values(sampleVulns);
  console.log(`Created ${sampleVulns.length} vulnerabilities`);

  const sampleActivity = [
    { entityType: "vulnerability", entityId: sampleVulns[0].title, action: "created", details: "Vulnerability imported from Nessus scan" },
    { entityType: "vulnerability", entityId: sampleVulns[1].title, action: "updated", details: "Status changed to in_progress, assigned to John Smith" },
    { entityType: "asset", entityId: createdAssets[0].id, action: "created", details: "Asset Web Server - Production created" },
    { entityType: "import", entityId: "nessus_scan_001", action: "imported", details: "Imported 10 vulnerabilities from Nessus scan" },
  ];

  await db.insert(activityLogs).values(sampleActivity);
  console.log(`Created ${sampleActivity.length} activity logs`);

  console.log("Database seeding completed!");
}
