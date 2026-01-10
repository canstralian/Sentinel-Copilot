import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useTheme } from "@/components/theme-provider";
import {
  Moon,
  Sun,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { JiraConfig } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const { data: jiraConfig, isLoading: jiraLoading } = useQuery<JiraConfig>({
    queryKey: ["/api/jira/config"],
  });

  const [jiraForm, setJiraForm] = useState({
    baseUrl: "",
    projectKey: "",
    issueType: "Bug",
    apiEmail: "",
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof jiraForm) => {
      return apiRequest("POST", "/api/jira/config", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jira/config"] });
      toast({
        title: "Jira configuration saved",
        description: "Your Jira integration is now configured.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Please check your configuration and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveJira = () => {
    saveMutation.mutate(jiraForm);
  };

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your vulnerability management platform"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Moon className="h-4 w-4" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ExternalLink className="h-4 w-4" />
                  Jira Integration
                </CardTitle>
                <CardDescription>
                  Connect to Jira to create remediation tickets
                </CardDescription>
              </div>
              {jiraConfig?.isConfigured ? (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Not Configured
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="jira-url">Jira Base URL</Label>
              <Input
                id="jira-url"
                placeholder="https://your-company.atlassian.net"
                value={jiraForm.baseUrl || jiraConfig?.baseUrl || ""}
                onChange={(e) => setJiraForm({ ...jiraForm, baseUrl: e.target.value })}
                className="mt-1"
                data-testid="input-jira-url"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jira-project">Project Key</Label>
                <Input
                  id="jira-project"
                  placeholder="SEC"
                  value={jiraForm.projectKey || jiraConfig?.projectKey || ""}
                  onChange={(e) => setJiraForm({ ...jiraForm, projectKey: e.target.value })}
                  className="mt-1"
                  data-testid="input-jira-project"
                />
              </div>
              <div>
                <Label htmlFor="jira-issue-type">Issue Type</Label>
                <Input
                  id="jira-issue-type"
                  placeholder="Bug"
                  value={jiraForm.issueType || jiraConfig?.issueType || "Bug"}
                  onChange={(e) => setJiraForm({ ...jiraForm, issueType: e.target.value })}
                  className="mt-1"
                  data-testid="input-jira-issue-type"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="jira-email">API Email (optional)</Label>
              <Input
                id="jira-email"
                type="email"
                placeholder="your-email@company.com"
                value={jiraForm.apiEmail || jiraConfig?.apiEmail || ""}
                onChange={(e) => setJiraForm({ ...jiraForm, apiEmail: e.target.value })}
                className="mt-1"
                data-testid="input-jira-email"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Used for Jira API authentication. Store your API token securely.
              </p>
            </div>
            <Separator />
            <Button 
              onClick={handleSaveJira} 
              disabled={saveMutation.isPending || !jiraForm.baseUrl || !jiraForm.projectKey}
              data-testid="button-save-jira"
            >
              {saveMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Import Sources</CardTitle>
            <CardDescription>
              VulnTracker supports importing vulnerabilities from various scanner formats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-md">
                <div className="font-medium">Nessus</div>
                <p className="text-xs text-muted-foreground mt-1">CSV export supported</p>
              </div>
              <div className="p-4 border rounded-md">
                <div className="font-medium">Qualys</div>
                <p className="text-xs text-muted-foreground mt-1">CSV export supported</p>
              </div>
              <div className="p-4 border rounded-md">
                <div className="font-medium">Rapid7</div>
                <p className="text-xs text-muted-foreground mt-1">CSV export supported</p>
              </div>
              <div className="p-4 border rounded-md">
                <div className="font-medium">Tenable</div>
                <p className="text-xs text-muted-foreground mt-1">CSV export supported</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Export your scan results as CSV and use the Import feature on the Vulnerabilities page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
