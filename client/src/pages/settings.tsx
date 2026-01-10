import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  Database,
  Key,
  Globe,
  Moon,
  Sun,
  Upload,
  RefreshCw,
} from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your security platform preferences"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-4 w-4" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Switch between light and dark mode
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  data-testid="button-theme-light"
                >
                  <Sun className="h-4 w-4 mr-1" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  data-testid="button-theme-dark"
                >
                  <Moon className="h-4 w-4 mr-1" />
                  Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how you receive alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Critical Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified for critical vulnerabilities
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-critical-alerts" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Authorization Expiry</Label>
                <p className="text-sm text-muted-foreground">
                  Warn before authorizations expire
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-auth-expiry" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Pending Approvals</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when actions need approval
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-pending-approvals" />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
            <CardDescription>
              Security and access settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Two-Factor Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Add an extra layer of security
                </p>
              </div>
              <Switch data-testid="switch-2fa" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Session Timeout</Label>
                <p className="text-sm text-muted-foreground">
                  Auto-logout after inactivity
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-session-timeout" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Audit Logging</Label>
                <p className="text-sm text-muted-foreground">
                  Log all user actions
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-audit-logging" />
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Data Management
            </CardTitle>
            <CardDescription>
              Import and export your security data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-medium">Import Vulnerabilities</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Upload CSV files with vulnerability data
              </p>
              <Button variant="outline" size="sm" data-testid="button-import-data">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
            <Separator />
            <div>
              <Label className="font-medium">Sync Integrations</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Refresh data from connected tools
              </p>
              <Button variant="outline" size="sm" data-testid="button-sync-data">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage API access for integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-medium">API Key</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  type="password"
                  value="••••••••••••••••••••"
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-api-key"
                />
                <Button variant="outline" size="sm" data-testid="button-regenerate-key">
                  Regenerate
                </Button>
              </div>
            </div>
            <Separator />
            <div>
              <Label className="font-medium">Webhook URL</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="https://your-webhook.example.com/security"
                  className="text-sm"
                  data-testid="input-webhook-url"
                />
                <Button variant="outline" size="sm" data-testid="button-save-webhook">
                  Save
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Integrations
            </CardTitle>
            <CardDescription>
              Connect with external security tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <IntegrationItem
              name="SIEM Integration"
              description="Send alerts to your SIEM"
              connected={false}
            />
            <Separator />
            <IntegrationItem
              name="Ticketing System"
              description="Auto-create tickets for findings"
              connected={true}
            />
            <Separator />
            <IntegrationItem
              name="Vulnerability Scanner"
              description="Import scan results automatically"
              connected={true}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function IntegrationItem({
  name,
  description,
  connected,
}: {
  name: string;
  description: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="font-medium">{name}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button
        variant={connected ? "outline" : "default"}
        size="sm"
        data-testid={`button-integration-${name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {connected ? "Configure" : "Connect"}
      </Button>
    </div>
  );
}
