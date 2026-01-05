import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { DataTable } from "@/components/data-table";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Terminal,
  RotateCcw,
  FileText,
  User,
} from "lucide-react";
import type { ActionLog } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Actions() {
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<ActionLog | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [actionToApprove, setActionToApprove] = useState<ActionLog | null>(null);
  const { toast } = useToast();

  const queryParams = new URLSearchParams({
    ...(riskFilter !== "all" && { risk: riskFilter }),
    ...(approvalFilter !== "all" && { approval: approvalFilter }),
  }).toString();
  
  const { data: actions, isLoading } = useQuery<ActionLog[]>({
    queryKey: [`/api/actions${queryParams ? `?${queryParams}` : ""}`],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      return apiRequest("PATCH", `/api/actions/${id}/approve`, { approved });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setApproveDialogOpen(false);
      setActionToApprove(null);
      toast({
        title: "Action approved",
        description: "The action has been approved successfully.",
      });
    },
  });

  const getRiskBadgeClass = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "bg-severity-critical text-white";
      case "high":
        return "bg-severity-high text-white";
      case "medium":
        return "bg-severity-medium text-slate-900";
      case "low":
        return "bg-severity-low text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getOutcomeIcon = (outcome?: string) => {
    switch (outcome) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-severity-low" />;
      case "failure":
        return <XCircle className="h-4 w-4 text-severity-critical" />;
      case "rolled_back":
        return <RotateCcw className="h-4 w-4 text-severity-medium" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const columns = [
    {
      key: "timestamp",
      header: "Time",
      className: "w-36",
      render: (item: ActionLog) => (
        <div className="text-sm">
          <div className="font-medium">
            {format(new Date(item.timestamp), "MMM d, HH:mm")}
          </div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(item.timestamp), "yyyy")}
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (item: ActionLog) => (
        <div>
          <div className="font-medium">{item.action}</div>
          <div className="text-xs text-muted-foreground truncate max-w-xs">
            {item.intent}
          </div>
        </div>
      ),
    },
    {
      key: "targetAsset",
      header: "Target",
      className: "text-sm",
      render: (item: ActionLog) => (
        <Badge variant="outline" className="font-mono text-xs">
          {item.targetAsset}
        </Badge>
      ),
    },
    {
      key: "riskLevel",
      header: "Risk",
      render: (item: ActionLog) => (
        <Badge className={getRiskBadgeClass(item.riskLevel)}>
          {item.riskLevel.charAt(0).toUpperCase() + item.riskLevel.slice(1)}
        </Badge>
      ),
    },
    {
      key: "approval",
      header: "Approval",
      render: (item: ActionLog) =>
        item.requiresApproval ? (
          item.approved ? (
            <div className="flex items-center gap-1.5 text-severity-low">
              <CheckCircle className="h-4 w-4" />
              <div className="text-xs">
                <div>Approved</div>
                {item.approvedBy && (
                  <div className="text-muted-foreground">{item.approvedBy}</div>
                )}
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setActionToApprove(item);
                setApproveDialogOpen(true);
              }}
              data-testid={`button-approve-${item.id}`}
            >
              <Shield className="h-3 w-3 mr-1" />
              Approve
            </Button>
          )
        ) : (
          <span className="text-xs text-muted-foreground">Not required</span>
        ),
    },
    {
      key: "outcome",
      header: "Outcome",
      render: (item: ActionLog) => (
        <div className="flex items-center gap-1.5">
          {getOutcomeIcon(item.outcome)}
          <span className="text-sm capitalize">{item.outcome || "Pending"}</span>
        </div>
      ),
    },
  ];

  const filteredData = actions?.filter((action) => {
    if (riskFilter !== "all" && action.riskLevel !== riskFilter) return false;
    if (approvalFilter === "pending" && (!action.requiresApproval || action.approved)) return false;
    if (approvalFilter === "approved" && (!action.requiresApproval || !action.approved)) return false;
    return true;
  }) || [];

  const pendingApprovals = actions?.filter((a) => a.requiresApproval && !a.approved).length || 0;

  return (
    <div className="p-5 space-y-6">
      <PageHeader
        title="Action Log"
        description="Track all proposed actions, approvals, and outcomes"
      />

      {/* Pending Approvals Alert */}
      {pendingApprovals > 0 && (
        <Card className="border-severity-medium/50 bg-severity-medium/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-severity-medium/20">
              <AlertTriangle className="h-5 w-5 text-severity-medium" />
            </div>
            <div className="flex-1">
              <div className="font-medium">
                {pendingApprovals} action{pendingApprovals > 1 ? "s" : ""} pending approval
              </div>
              <div className="text-sm text-muted-foreground">
                Review and approve actions before they can be executed
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApprovalFilter("pending")}
              data-testid="button-show-pending"
            >
              View Pending
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Risk Level:</Label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-32" data-testid="select-risk-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm whitespace-nowrap">Approval:</Label>
              <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                <SelectTrigger className="w-36" data-testid="select-approval-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={columns}
        keyField="id"
        onRowClick={setSelectedAction}
        isLoading={isLoading}
        emptyMessage="No actions logged yet"
      />

      {/* Action Detail Sheet */}
      <Sheet open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedAction && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Action Details
                </SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  {selectedAction.id}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Timestamp</Label>
                    <div className="mt-1 text-sm">
                      {format(new Date(selectedAction.timestamp), "PPpp")}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Risk Level</Label>
                    <div className="mt-1">
                      <Badge className={getRiskBadgeClass(selectedAction.riskLevel)}>
                        {selectedAction.riskLevel}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Action</Label>
                  <p className="mt-1 font-medium">{selectedAction.action}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Intent</Label>
                  <p className="mt-1 text-sm">{selectedAction.intent}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Target Asset</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="font-mono">
                      {selectedAction.targetAsset}
                    </Badge>
                  </div>
                </div>

                {selectedAction.command && (
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Terminal className="h-3 w-3" />
                      Command
                    </Label>
                    <pre className="mt-2 p-3 rounded-md bg-muted text-sm font-mono overflow-x-auto">
                      {selectedAction.command}
                    </pre>
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Approval Status</Label>
                  <div className="mt-2">
                    {selectedAction.requiresApproval ? (
                      selectedAction.approved ? (
                        <div className="flex items-center gap-3 p-3 rounded-md bg-severity-low/10">
                          <CheckCircle className="h-5 w-5 text-severity-low" />
                          <div>
                            <div className="font-medium text-severity-low">Approved</div>
                            {selectedAction.approvedBy && (
                              <div className="text-xs text-muted-foreground">
                                By {selectedAction.approvedBy}
                                {selectedAction.approvalTimestamp && (
                                  <> at {format(new Date(selectedAction.approvalTimestamp), "PPp")}</>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-3 rounded-md bg-severity-medium/10">
                          <Clock className="h-5 w-5 text-severity-medium" />
                          <div className="flex-1">
                            <div className="font-medium text-severity-medium">Pending Approval</div>
                            <div className="text-xs text-muted-foreground">
                              This action requires approval before execution
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              setActionToApprove(selectedAction);
                              setApproveDialogOpen(true);
                            }}
                            data-testid="button-approve-detail"
                          >
                            Approve
                          </Button>
                        </div>
                      )
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No approval required for this action
                      </div>
                    )}
                  </div>
                </div>

                {selectedAction.rollbackProcedure && (
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      Rollback Procedure
                    </Label>
                    <div className="mt-2 p-3 rounded-md bg-muted text-sm">
                      {selectedAction.rollbackProcedure}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Outcome</Label>
                  <div className="mt-2 flex items-center gap-2">
                    {getOutcomeIcon(selectedAction.outcome)}
                    <span className="capitalize">
                      {selectedAction.outcome || "Pending"}
                    </span>
                  </div>
                </div>

                {selectedAction.notes && (
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Notes
                    </Label>
                    <p className="mt-1 text-sm">{selectedAction.notes}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Action</AlertDialogTitle>
            <AlertDialogDescription>
              {actionToApprove && (
                <>
                  Are you sure you want to approve this action?
                  <div className="mt-4 p-3 rounded-md bg-muted">
                    <div className="font-medium">{actionToApprove.action}</div>
                    <div className="text-sm mt-1">{actionToApprove.intent}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getRiskBadgeClass(actionToApprove.riskLevel)}>
                        {actionToApprove.riskLevel} risk
                      </Badge>
                    </div>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (actionToApprove) {
                  approveMutation.mutate({ id: actionToApprove.id, approved: true });
                }
              }}
              data-testid="button-confirm-approve"
            >
              Approve Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
