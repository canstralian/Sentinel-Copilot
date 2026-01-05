import { randomUUID } from "crypto";
import type {
  User, InsertUser,
  Asset, InsertAsset,
  Vulnerability, InsertVulnerability,
  Authorization, InsertAuthorization,
  ActionLog, InsertActionLog,
  SecurityControl, InsertSecurityControl,
  DashboardMetrics,
  Severity,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Assets
  getAssets(filters?: { type?: string; scope?: string; search?: string }): Promise<Asset[]>;
  getAsset(id: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | undefined>;
  deleteAsset(id: string): Promise<boolean>;

  // Vulnerabilities
  getVulnerabilities(filters?: { severity?: string; status?: string; search?: string; limit?: number }): Promise<Vulnerability[]>;
  getVulnerability(id: string): Promise<Vulnerability | undefined>;
  createVulnerability(vuln: InsertVulnerability): Promise<Vulnerability>;
  updateVulnerability(id: string, updates: Partial<Vulnerability>): Promise<Vulnerability | undefined>;
  importVulnerabilities(vulns: InsertVulnerability[]): Promise<number>;

  // Authorizations
  getAuthorizations(filters?: { status?: string }): Promise<Authorization[]>;
  getAuthorization(id: string): Promise<Authorization | undefined>;
  createAuthorization(auth: InsertAuthorization): Promise<Authorization>;
  updateAuthorization(id: string, updates: Partial<Authorization>): Promise<Authorization | undefined>;

  // Action Logs
  getActions(filters?: { risk?: string; approval?: string }): Promise<ActionLog[]>;
  getAction(id: string): Promise<ActionLog | undefined>;
  createAction(action: InsertActionLog): Promise<ActionLog>;
  approveAction(id: string, approvedBy: string): Promise<ActionLog | undefined>;

  // Security Controls
  getControls(filters?: { framework?: string; status?: string }): Promise<SecurityControl[]>;
  getControl(id: string): Promise<SecurityControl | undefined>;
  createControl(control: InsertSecurityControl): Promise<SecurityControl>;

  // Dashboard
  getDashboardMetrics(): Promise<DashboardMetrics>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private assets: Map<string, Asset>;
  private vulnerabilities: Map<string, Vulnerability>;
  private authorizations: Map<string, Authorization>;
  private actions: Map<string, ActionLog>;
  private controls: Map<string, SecurityControl>;

  constructor() {
    this.users = new Map();
    this.assets = new Map();
    this.vulnerabilities = new Map();
    this.authorizations = new Map();
    this.actions = new Map();
    this.controls = new Map();
    this.seedData();
  }

  private seedData() {
    // Seed comprehensive sample assets
    const sampleAssets: InsertAsset[] = [
      {
        name: "Customer Portal",
        type: "web_application",
        exposure: "internet_facing",
        authModel: "oauth2",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["React", "Node.js", "PostgreSQL"],
        inScope: true,
        authorized: true,
      },
      {
        name: "Payment API",
        type: "api",
        exposure: "internet_facing",
        authModel: "jwt",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["Express", "MongoDB"],
        inScope: true,
        authorized: true,
      },
      {
        name: "Admin Dashboard",
        type: "web_application",
        exposure: "internal",
        authModel: "sso_saml",
        provider: "Azure",
        region: "eastus",
        techStack: ["Vue.js", "Python", "MySQL"],
        inScope: true,
        authorized: true,
      },
      {
        name: "User Data Bucket",
        type: "cloud_storage",
        exposure: "internal",
        authModel: "none",
        provider: "AWS",
        region: "us-west-2",
        techStack: ["S3"],
        inScope: true,
        authorized: false,
      },
      {
        name: "Analytics Database",
        type: "database",
        exposure: "internal",
        authModel: "basic_auth",
        provider: "GCP",
        region: "us-central1",
        techStack: ["BigQuery"],
        inScope: true,
        authorized: true,
      },
      {
        name: "Production K8s Cluster",
        type: "kubernetes_cluster",
        exposure: "partner_exposed",
        authModel: "jwt",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["EKS", "Istio"],
        inScope: true,
        authorized: true,
      },
      {
        name: "CI/CD Pipeline",
        type: "ci_cd_pipeline",
        exposure: "internal",
        authModel: "oauth2",
        provider: "GitHub",
        region: "global",
        techStack: ["GitHub Actions", "Docker"],
        inScope: true,
        authorized: true,
      },
      {
        name: "Notification Service",
        type: "message_queue",
        exposure: "internal",
        authModel: "basic_auth",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["SQS", "SNS"],
        inScope: false,
        authorized: false,
      },
      {
        name: "Identity Service",
        type: "api",
        exposure: "internet_facing",
        authModel: "oauth2",
        provider: "Azure",
        region: "westeurope",
        techStack: ["C#", ".NET Core", "SQL Server"],
        inScope: true,
        authorized: true,
      },
      {
        name: "Logging Container",
        type: "container",
        exposure: "internal",
        authModel: "none",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["Elasticsearch", "Kibana"],
        inScope: true,
        authorized: true,
      },
      {
        name: "Service Account Role",
        type: "iam_role",
        exposure: "internal",
        authModel: "none",
        provider: "AWS",
        region: "global",
        techStack: ["IAM"],
        inScope: true,
        authorized: true,
      },
      {
        name: "Mobile App Backend",
        type: "api",
        exposure: "internet_facing",
        authModel: "jwt",
        provider: "GCP",
        region: "us-west1",
        techStack: ["Go", "Cloud Run", "Firestore"],
        inScope: true,
        authorized: true,
      },
    ];

    for (const asset of sampleAssets) {
      this.createAsset(asset);
    }

    // Seed comprehensive sample vulnerabilities
    const sampleVulns: InsertVulnerability[] = [
      {
        assetId: "ASSET-00000001",
        assetType: "web_application",
        exposure: "internet_facing",
        authModel: "oauth2",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["React", "Node.js", "PostgreSQL"],
        vulnClass: "SQL Injection",
        cwe: "CWE-89",
        severity: "critical",
        confidence: 95,
        signalSource: "Manual Testing",
        symptoms: "User input directly concatenated in SQL query without parameterization",
        attackPhase: "exploitation",
        dataExposure: "Full database access including PII",
        privilegeGain: "Database admin",
        blastRadius: "All customer records",
        noAuth: false,
        rateLimited: false,
        recommendedActions: ["Use parameterized queries", "Implement input validation", "Apply WAF rules"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000002",
        assetType: "api",
        exposure: "internet_facing",
        authModel: "jwt",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["Express", "MongoDB"],
        vulnClass: "Broken Authentication",
        cwe: "CWE-287",
        severity: "critical",
        confidence: 90,
        signalSource: "Automated Scan",
        symptoms: "JWT tokens not properly validated, allowing token forgery",
        attackPhase: "exploitation",
        dataExposure: "Payment card data",
        privilegeGain: "Any user account",
        blastRadius: "All API endpoints",
        noAuth: false,
        rateLimited: true,
        recommendedActions: ["Implement proper JWT validation", "Use strong signing keys", "Add token expiration"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000003",
        assetType: "web_application",
        exposure: "internal",
        authModel: "sso_saml",
        provider: "Azure",
        region: "eastus",
        techStack: ["Vue.js", "Python", "MySQL"],
        vulnClass: "Cross-Site Scripting (XSS)",
        cwe: "CWE-79",
        severity: "high",
        confidence: 85,
        signalSource: "Manual Testing",
        symptoms: "Reflected XSS in search parameter",
        attackPhase: "exploitation",
        dataExposure: "Session cookies, CSRF tokens",
        privilegeGain: "Session hijacking",
        blastRadius: "Admin users",
        noAuth: false,
        rateLimited: false,
        recommendedActions: ["Encode output", "Implement CSP headers", "Use HttpOnly cookies"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000004",
        assetType: "cloud_storage",
        exposure: "internal",
        authModel: "none",
        provider: "AWS",
        region: "us-west-2",
        techStack: ["S3"],
        vulnClass: "Insecure Cloud Configuration",
        cwe: "CWE-284",
        severity: "high",
        confidence: 100,
        signalSource: "Cloud Security Scan",
        symptoms: "S3 bucket publicly accessible without authentication",
        attackPhase: "reconnaissance",
        dataExposure: "User documents and profile images",
        privilegeGain: "Read access to all bucket contents",
        blastRadius: "All stored user data",
        noAuth: true,
        rateLimited: false,
        recommendedActions: ["Enable bucket policy restrictions", "Block public access", "Enable access logging"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000006",
        assetType: "kubernetes_cluster",
        exposure: "partner_exposed",
        authModel: "jwt",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["EKS", "Istio"],
        vulnClass: "Container Escape",
        cwe: "CWE-250",
        severity: "critical",
        confidence: 75,
        signalSource: "Penetration Test",
        symptoms: "Privileged container with host path mounts",
        attackPhase: "post_exploitation",
        dataExposure: "Host system files",
        privilegeGain: "Root on host node",
        blastRadius: "Entire cluster",
        noAuth: false,
        rateLimited: false,
        recommendedActions: ["Remove privileged flag", "Use read-only root filesystem", "Implement pod security policies"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000007",
        assetType: "ci_cd_pipeline",
        exposure: "internal",
        authModel: "oauth2",
        provider: "GitHub",
        region: "global",
        techStack: ["GitHub Actions", "Docker"],
        vulnClass: "Secrets Exposure",
        cwe: "CWE-798",
        severity: "high",
        confidence: 100,
        signalSource: "Code Review",
        symptoms: "API keys hardcoded in workflow files",
        attackPhase: "reconnaissance",
        dataExposure: "AWS credentials, API tokens",
        privilegeGain: "Deploy access",
        blastRadius: "Production environment",
        noAuth: false,
        rateLimited: false,
        recommendedActions: ["Use GitHub secrets", "Rotate exposed credentials", "Implement secret scanning"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000009",
        assetType: "api",
        exposure: "internet_facing",
        authModel: "oauth2",
        provider: "Azure",
        region: "westeurope",
        techStack: ["C#", ".NET Core", "SQL Server"],
        vulnClass: "Broken Access Control",
        cwe: "CWE-639",
        severity: "high",
        confidence: 90,
        signalSource: "Manual Testing",
        symptoms: "IDOR vulnerability allowing access to other users data",
        attackPhase: "exploitation",
        dataExposure: "User PII and preferences",
        privilegeGain: "Access to any user account",
        blastRadius: "All registered users",
        noAuth: false,
        rateLimited: true,
        recommendedActions: ["Implement proper authorization checks", "Use indirect object references", "Add audit logging"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000010",
        assetType: "container",
        exposure: "internal",
        authModel: "none",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["Elasticsearch", "Kibana"],
        vulnClass: "Missing Authentication",
        cwe: "CWE-306",
        severity: "medium",
        confidence: 100,
        signalSource: "Infrastructure Scan",
        symptoms: "Kibana dashboard accessible without authentication",
        attackPhase: "reconnaissance",
        dataExposure: "Application logs with user data",
        privilegeGain: "Read access to logs",
        blastRadius: "Log data exposure",
        noAuth: true,
        rateLimited: false,
        recommendedActions: ["Enable authentication", "Restrict network access", "Mask sensitive log data"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000011",
        assetType: "iam_role",
        exposure: "internal",
        authModel: "none",
        provider: "AWS",
        region: "global",
        techStack: ["IAM"],
        vulnClass: "Excessive Permissions",
        cwe: "CWE-250",
        severity: "medium",
        confidence: 85,
        signalSource: "Cloud Security Scan",
        symptoms: "Service account has Administrator access policy attached",
        attackPhase: "post_exploitation",
        dataExposure: "Full AWS account access",
        privilegeGain: "AWS Administrator",
        blastRadius: "Entire AWS account",
        noAuth: false,
        rateLimited: false,
        recommendedActions: ["Apply least privilege principle", "Use resource-based policies", "Enable access analyzer"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000012",
        assetType: "api",
        exposure: "internet_facing",
        authModel: "jwt",
        provider: "GCP",
        region: "us-west1",
        techStack: ["Go", "Cloud Run", "Firestore"],
        vulnClass: "Server-Side Request Forgery",
        cwe: "CWE-918",
        severity: "high",
        confidence: 80,
        signalSource: "Bug Bounty",
        symptoms: "URL parameter not validated allowing internal network requests",
        attackPhase: "exploitation",
        dataExposure: "Internal services metadata",
        privilegeGain: "Access to internal APIs",
        blastRadius: "Internal network",
        noAuth: false,
        rateLimited: true,
        recommendedActions: ["Validate and sanitize URLs", "Use allowlists", "Block internal IP ranges"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000001",
        assetType: "web_application",
        exposure: "internet_facing",
        authModel: "oauth2",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["React", "Node.js", "PostgreSQL"],
        vulnClass: "Cross-Site Request Forgery",
        cwe: "CWE-352",
        severity: "medium",
        confidence: 85,
        signalSource: "Automated Scan",
        symptoms: "State-changing requests lack CSRF tokens",
        attackPhase: "exploitation",
        dataExposure: "Account modifications",
        privilegeGain: "Perform actions as victim",
        blastRadius: "All authenticated users",
        noAuth: false,
        rateLimited: false,
        recommendedActions: ["Implement CSRF tokens", "Use SameSite cookies", "Validate Origin header"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000005",
        assetType: "database",
        exposure: "internal",
        authModel: "basic_auth",
        provider: "GCP",
        region: "us-central1",
        techStack: ["BigQuery"],
        vulnClass: "Weak Credentials",
        cwe: "CWE-521",
        severity: "low",
        confidence: 100,
        signalSource: "Credential Audit",
        symptoms: "Database using default credentials",
        attackPhase: "exploitation",
        dataExposure: "Analytics data",
        privilegeGain: "Database read access",
        blastRadius: "Analytics dataset",
        noAuth: false,
        rateLimited: false,
        recommendedActions: ["Change default credentials", "Implement password policy", "Enable MFA"],
        exploitable: true,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000002",
        assetType: "api",
        exposure: "internet_facing",
        authModel: "jwt",
        provider: "AWS",
        region: "us-east-1",
        techStack: ["Express", "MongoDB"],
        vulnClass: "Information Disclosure",
        cwe: "CWE-200",
        severity: "low",
        confidence: 95,
        signalSource: "Manual Testing",
        symptoms: "Verbose error messages expose stack traces",
        attackPhase: "reconnaissance",
        dataExposure: "Internal paths and versions",
        privilegeGain: "None",
        blastRadius: "Information leakage",
        noAuth: true,
        rateLimited: false,
        recommendedActions: ["Implement custom error pages", "Log errors server-side only", "Remove debug mode"],
        exploitable: false,
        falsePositive: false,
      },
      {
        assetId: "ASSET-00000003",
        assetType: "web_application",
        exposure: "internal",
        authModel: "sso_saml",
        provider: "Azure",
        region: "eastus",
        techStack: ["Vue.js", "Python", "MySQL"],
        vulnClass: "Security Misconfiguration",
        cwe: "CWE-16",
        severity: "info",
        confidence: 100,
        signalSource: "Configuration Review",
        symptoms: "Missing security headers (X-Frame-Options, X-Content-Type-Options)",
        attackPhase: "reconnaissance",
        dataExposure: "None directly",
        privilegeGain: "None",
        blastRadius: "Clickjacking potential",
        noAuth: false,
        rateLimited: false,
        recommendedActions: ["Add security headers", "Implement helmet middleware", "Configure CSP"],
        exploitable: false,
        falsePositive: false,
      },
    ];

    for (const vuln of sampleVulns) {
      this.createVulnerability(vuln);
    }

    // Seed some sample security controls
    const sampleControls: InsertSecurityControl[] = [
      {
        framework: "NIST",
        controlId: "AC-2",
        title: "Account Management",
        description: "Manage system accounts, group memberships, privileges, and associated access authorizations.",
        category: "Access Control",
        status: "implemented",
        linkedVulnerabilities: [],
      },
      {
        framework: "NIST",
        controlId: "AC-3",
        title: "Access Enforcement",
        description: "Enforce approved authorizations for logical access to information and system resources.",
        category: "Access Control",
        status: "implemented",
        linkedVulnerabilities: [],
      },
      {
        framework: "NIST",
        controlId: "AC-7",
        title: "Unsuccessful Logon Attempts",
        description: "Enforce a limit of consecutive invalid logon attempts by a user.",
        category: "Access Control",
        status: "partial",
        linkedVulnerabilities: [],
      },
      {
        framework: "NIST",
        controlId: "AU-2",
        title: "Audit Events",
        description: "Identify events that require auditing and maintain a list of auditable events.",
        category: "Audit and Accountability",
        status: "implemented",
        linkedVulnerabilities: [],
      },
      {
        framework: "NIST",
        controlId: "AU-3",
        title: "Content of Audit Records",
        description: "Ensure audit records contain required content including event type, date/time, and success/failure.",
        category: "Audit and Accountability",
        status: "implemented",
        linkedVulnerabilities: [],
      },
      {
        framework: "ISO27001",
        controlId: "A.9.1.1",
        title: "Access Control Policy",
        description: "An access control policy shall be established, documented and reviewed based on business and information security requirements.",
        category: "Access Control",
        status: "implemented",
        linkedVulnerabilities: [],
      },
      {
        framework: "ISO27001",
        controlId: "A.9.2.1",
        title: "User Registration and De-registration",
        description: "A formal user registration and de-registration process shall be implemented to enable assignment of access rights.",
        category: "Access Control",
        status: "implemented",
        linkedVulnerabilities: [],
      },
      {
        framework: "ISO27001",
        controlId: "A.12.4.1",
        title: "Event Logging",
        description: "Event logs recording user activities, exceptions, faults and information security events shall be produced, kept and regularly reviewed.",
        category: "Operations Security",
        status: "partial",
        linkedVulnerabilities: [],
      },
      {
        framework: "CIS",
        controlId: "CIS-1",
        title: "Inventory and Control of Enterprise Assets",
        description: "Actively manage all enterprise assets connected to the infrastructure.",
        category: "Asset Management",
        status: "implemented",
        linkedVulnerabilities: [],
      },
      {
        framework: "CIS",
        controlId: "CIS-2",
        title: "Inventory and Control of Software Assets",
        description: "Actively manage all software on the network so that only authorized software is installed and can execute.",
        category: "Asset Management",
        status: "partial",
        linkedVulnerabilities: [],
      },
      {
        framework: "CIS",
        controlId: "CIS-3",
        title: "Data Protection",
        description: "Develop processes and technical controls to identify, classify, securely handle, retain, and dispose of data.",
        category: "Data Protection",
        status: "planned",
        linkedVulnerabilities: [],
      },
      {
        framework: "CIS",
        controlId: "CIS-7",
        title: "Continuous Vulnerability Management",
        description: "Continuously acquire, assess, and take action on new information in order to identify vulnerabilities and remediate.",
        category: "Vulnerability Management",
        status: "implemented",
        linkedVulnerabilities: [],
      },
    ];

    for (const control of sampleControls) {
      this.createControl(control);
    }

    // Seed sample authorizations
    const sampleAuths: InsertAuthorization[] = [
      {
        title: "Q1 2026 Penetration Test",
        scope: "All internet-facing web applications and APIs in production environment",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        authorizedBy: "John Smith, CISO",
        targetAssets: ["Customer Portal", "Payment API", "Identity Service"],
        restrictions: [
          "No denial of service testing",
          "No production database modifications",
          "Testing only during business hours",
        ],
        documentUrl: "https://example.com/auth-doc.pdf",
      },
      {
        title: "Cloud Infrastructure Security Assessment",
        scope: "AWS and Azure cloud resources including storage, compute, and networking",
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        authorizedBy: "Sarah Chen, VP Engineering",
        targetAssets: ["User Data Bucket", "Production K8s Cluster", "Service Account Role"],
        restrictions: [
          "No data exfiltration beyond proof of concept",
          "No modifications to IAM policies",
          "Coordinate with DevOps team before testing",
        ],
        documentUrl: "https://example.com/cloud-auth.pdf",
      },
      {
        title: "Mobile Backend API Testing",
        scope: "Mobile application backend services and APIs",
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        authorizedBy: "Michael Torres, CTO",
        targetAssets: ["Mobile App Backend"],
        restrictions: [
          "No testing against production user accounts",
          "Rate limiting must be respected",
          "Report critical findings within 4 hours",
        ],
      },
      {
        title: "Internal Network Vulnerability Scan",
        scope: "Internal network infrastructure and services",
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        authorizedBy: "John Smith, CISO",
        targetAssets: ["Admin Dashboard", "Analytics Database", "Logging Container"],
        restrictions: [
          "Scanning only during maintenance windows",
          "No active exploitation without approval",
        ],
      },
    ];

    for (const auth of sampleAuths) {
      this.createAuthorization(auth);
    }

    // Seed sample action logs
    const sampleActions: InsertActionLog[] = [
      {
        action: "Nmap Port Scan",
        command: "nmap -sV -sC 192.168.1.0/24",
        intent: "Identify open ports and running services on target network",
        riskLevel: "low",
        targetAsset: "192.168.1.0/24",
        requiresApproval: false,
        rollbackProcedure: "N/A - passive scan",
      },
      {
        action: "SQL Injection Test",
        command: "sqlmap -u 'https://target.com/api?id=1' --batch",
        intent: "Test for SQL injection vulnerabilities in API endpoint",
        riskLevel: "medium",
        targetAsset: "Customer Portal",
        requiresApproval: true,
        rollbackProcedure: "Stop scan immediately if data modification detected",
      },
      {
        action: "Privilege Escalation Check",
        command: "sudo -l && id && whoami",
        intent: "Verify current user privileges and check for misconfigured sudo permissions",
        riskLevel: "high",
        targetAsset: "app-server-01",
        requiresApproval: true,
        rollbackProcedure: "Disconnect session immediately if unauthorized access gained",
      },
      {
        action: "S3 Bucket Permission Audit",
        command: "aws s3api get-bucket-acl --bucket user-data-bucket",
        intent: "Check for misconfigured bucket permissions and public access",
        riskLevel: "low",
        targetAsset: "User Data Bucket",
        requiresApproval: false,
        rollbackProcedure: "N/A - read-only operation",
      },
      {
        action: "JWT Token Forgery Test",
        command: "python3 jwt_attack.py --target https://api.example.com",
        intent: "Test JWT implementation for common vulnerabilities",
        riskLevel: "high",
        targetAsset: "Payment API",
        requiresApproval: true,
        rollbackProcedure: "Invalidate all active sessions if compromise detected",
      },
      {
        action: "Container Security Scan",
        command: "trivy image --severity HIGH,CRITICAL app:latest",
        intent: "Identify vulnerabilities in container images",
        riskLevel: "low",
        targetAsset: "Logging Container",
        requiresApproval: false,
        rollbackProcedure: "N/A - offline analysis",
      },
      {
        action: "Cross-Site Scripting Probe",
        command: "xsstrike -u 'https://admin.example.com/search?q=test'",
        intent: "Test for XSS vulnerabilities in admin dashboard",
        riskLevel: "medium",
        targetAsset: "Admin Dashboard",
        requiresApproval: true,
        rollbackProcedure: "Clear test data from logs after testing",
      },
      {
        action: "Kubernetes RBAC Review",
        command: "kubectl auth can-i --list --as=system:serviceaccount:default:app",
        intent: "Review permissions granted to service accounts",
        riskLevel: "low",
        targetAsset: "Production K8s Cluster",
        requiresApproval: false,
        rollbackProcedure: "N/A - read-only check",
      },
      {
        action: "GitHub Actions Secret Extraction",
        command: "gh secret list --repo org/app",
        intent: "Verify secrets are properly protected in CI/CD pipeline",
        riskLevel: "critical",
        targetAsset: "CI/CD Pipeline",
        requiresApproval: true,
        rollbackProcedure: "Rotate all exposed secrets immediately",
      },
      {
        action: "SSRF Vulnerability Test",
        command: "curl 'https://mobile-api.example.com/fetch?url=http://169.254.169.254'",
        intent: "Test for server-side request forgery to cloud metadata",
        riskLevel: "high",
        targetAsset: "Mobile App Backend",
        requiresApproval: true,
        rollbackProcedure: "Block metadata endpoint access if vulnerability confirmed",
      },
    ];

    for (const action of sampleActions) {
      this.createAction(action);
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Assets
  async getAssets(filters?: { type?: string; scope?: string; search?: string }): Promise<Asset[]> {
    let assets = Array.from(this.assets.values());
    
    if (filters?.type && filters.type !== "all") {
      assets = assets.filter((a) => a.type === filters.type);
    }
    if (filters?.scope && filters.scope !== "all") {
      if (filters.scope === "in_scope") {
        assets = assets.filter((a) => a.inScope);
      } else if (filters.scope === "out_of_scope") {
        assets = assets.filter((a) => !a.inScope);
      }
    }
    if (filters?.search) {
      const query = filters.search.toLowerCase();
      assets = assets.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.type.toLowerCase().includes(query) ||
          a.provider.toLowerCase().includes(query)
      );
    }
    
    return assets;
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    return this.assets.get(id);
  }

  async createAsset(insertAsset: InsertAsset): Promise<Asset> {
    const id = `ASSET-${randomUUID().slice(0, 8).toUpperCase()}`;
    const asset: Asset = { ...insertAsset, id };
    this.assets.set(id, asset);
    return asset;
  }

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset | undefined> {
    const asset = this.assets.get(id);
    if (!asset) return undefined;
    const updated = { ...asset, ...updates };
    this.assets.set(id, updated);
    return updated;
  }

  async deleteAsset(id: string): Promise<boolean> {
    return this.assets.delete(id);
  }

  // Vulnerabilities
  async getVulnerabilities(filters?: { severity?: string; status?: string; search?: string; limit?: number }): Promise<Vulnerability[]> {
    let vulns = Array.from(this.vulnerabilities.values());
    
    if (filters?.severity && filters.severity !== "all") {
      vulns = vulns.filter((v) => v.severity === filters.severity);
    }
    if (filters?.status && filters.status !== "all") {
      vulns = vulns.filter((v) => v.status === filters.status);
    }
    if (filters?.search) {
      const query = filters.search.toLowerCase();
      vulns = vulns.filter(
        (v) =>
          v.vulnClass.toLowerCase().includes(query) ||
          v.cwe.toLowerCase().includes(query) ||
          v.assetType.toLowerCase().includes(query)
      );
    }
    
    // Sort by severity (critical first) and then by date
    const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    vulns.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    if (filters?.limit) {
      vulns = vulns.slice(0, filters.limit);
    }
    
    return vulns;
  }

  async getVulnerability(id: string): Promise<Vulnerability | undefined> {
    return this.vulnerabilities.get(id);
  }

  async createVulnerability(insertVuln: InsertVulnerability): Promise<Vulnerability> {
    const id = `VULN-${randomUUID().slice(0, 8).toUpperCase()}`;
    const vuln: Vulnerability = {
      ...insertVuln,
      id,
      createdAt: new Date().toISOString(),
      status: "open",
    };
    this.vulnerabilities.set(id, vuln);
    return vuln;
  }

  async updateVulnerability(id: string, updates: Partial<Vulnerability>): Promise<Vulnerability | undefined> {
    const vuln = this.vulnerabilities.get(id);
    if (!vuln) return undefined;
    const updated = { ...vuln, ...updates };
    this.vulnerabilities.set(id, updated);
    return updated;
  }

  async importVulnerabilities(vulns: InsertVulnerability[]): Promise<number> {
    let count = 0;
    for (const vuln of vulns) {
      await this.createVulnerability(vuln);
      count++;
    }
    return count;
  }

  // Authorizations
  async getAuthorizations(filters?: { status?: string }): Promise<Authorization[]> {
    let auths = Array.from(this.authorizations.values());
    
    if (filters?.status && filters.status !== "all") {
      auths = auths.filter((a) => a.status === filters.status);
    }
    
    // Check for expired authorizations
    const now = new Date();
    for (const auth of auths) {
      if (auth.status === "active" && new Date(auth.endDate) < now) {
        auth.status = "expired";
        this.authorizations.set(auth.id, auth);
      }
    }
    
    return auths;
  }

  async getAuthorization(id: string): Promise<Authorization | undefined> {
    return this.authorizations.get(id);
  }

  async createAuthorization(insertAuth: InsertAuthorization): Promise<Authorization> {
    const id = `AUTH-${randomUUID().slice(0, 8).toUpperCase()}`;
    const auth: Authorization = {
      ...insertAuth,
      id,
      status: new Date(insertAuth.startDate) > new Date() ? "pending" : "active",
    };
    this.authorizations.set(id, auth);
    return auth;
  }

  async updateAuthorization(id: string, updates: Partial<Authorization>): Promise<Authorization | undefined> {
    const auth = this.authorizations.get(id);
    if (!auth) return undefined;
    const updated = { ...auth, ...updates };
    this.authorizations.set(id, updated);
    return updated;
  }

  // Action Logs
  async getActions(filters?: { risk?: string; approval?: string }): Promise<ActionLog[]> {
    let actions = Array.from(this.actions.values());
    
    if (filters?.risk && filters.risk !== "all") {
      actions = actions.filter((a) => a.riskLevel === filters.risk);
    }
    if (filters?.approval === "pending") {
      actions = actions.filter((a) => a.requiresApproval && !a.approved);
    } else if (filters?.approval === "approved") {
      actions = actions.filter((a) => a.requiresApproval && a.approved);
    }
    
    // Sort by timestamp descending
    actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return actions;
  }

  async getAction(id: string): Promise<ActionLog | undefined> {
    return this.actions.get(id);
  }

  async createAction(insertAction: InsertActionLog): Promise<ActionLog> {
    const id = `ACT-${randomUUID().slice(0, 8).toUpperCase()}`;
    const action: ActionLog = {
      ...insertAction,
      id,
      timestamp: new Date().toISOString(),
      approved: false,
      outcome: "pending",
    };
    this.actions.set(id, action);
    return action;
  }

  async approveAction(id: string, approvedBy: string): Promise<ActionLog | undefined> {
    const action = this.actions.get(id);
    if (!action) return undefined;
    const updated: ActionLog = {
      ...action,
      approved: true,
      approvedBy,
      approvalTimestamp: new Date().toISOString(),
    };
    this.actions.set(id, updated);
    return updated;
  }

  // Security Controls
  async getControls(filters?: { framework?: string; status?: string }): Promise<SecurityControl[]> {
    let controls = Array.from(this.controls.values());
    
    if (filters?.framework && filters.framework !== "all") {
      controls = controls.filter((c) => c.framework === filters.framework);
    }
    if (filters?.status && filters.status !== "all") {
      controls = controls.filter((c) => c.status === filters.status);
    }
    
    return controls;
  }

  async getControl(id: string): Promise<SecurityControl | undefined> {
    return this.controls.get(id);
  }

  async createControl(insertControl: InsertSecurityControl): Promise<SecurityControl> {
    const id = `CTRL-${randomUUID().slice(0, 8).toUpperCase()}`;
    const control: SecurityControl = { ...insertControl, id };
    this.controls.set(id, control);
    return control;
  }

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const assets = Array.from(this.assets.values());
    const vulns = Array.from(this.vulnerabilities.values());
    const auths = Array.from(this.authorizations.values());
    const actions = Array.from(this.actions.values());
    const controls = Array.from(this.controls.values());

    const implementedControls = controls.filter((c) => c.status === "implemented").length;
    const totalControls = controls.length;

    return {
      totalAssets: assets.length,
      inScopeAssets: assets.filter((a) => a.inScope).length,
      totalVulnerabilities: vulns.length,
      criticalVulns: vulns.filter((v) => v.severity === "critical").length,
      highVulns: vulns.filter((v) => v.severity === "high").length,
      mediumVulns: vulns.filter((v) => v.severity === "medium").length,
      lowVulns: vulns.filter((v) => v.severity === "low").length,
      openFindings: vulns.filter((v) => v.status === "open").length,
      remediatedFindings: vulns.filter((v) => v.status === "remediated").length,
      activeAuthorizations: auths.filter((a) => a.status === "active").length,
      pendingApprovals: actions.filter((a) => a.requiresApproval && !a.approved).length,
      controlsCoverage: totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0,
    };
  }
}

export const storage = new MemStorage();
