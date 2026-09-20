"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Zap,
  Play,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Bot,
  Layers,
  Clock,
  Tag,
  UserCheck,
  CheckSquare,
  Bell,
  Activity,
  Briefcase,
  Receipt,
  FileText,
  HelpCircle,
  Info,
  Check,
} from "lucide-react";
import {
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowActionType,
  ConditionOperator,
  ConditionMatchGroup,
  ActionFailurePolicy,
  WORKFLOW_TRIGGERS,
  WORKFLOW_ACTIONS,
  WorkflowConditionInput,
  WorkflowActionInput,
} from "@/lib/validations/automations";
import {
  createWorkflowAction,
  updateWorkflowAction,
  activateWorkflowAction,
  triggerTestWorkflowAction,
} from "@/lib/actions/automations-actions";
import { Role } from "@prisma/client";

interface WorkspaceUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface PipelineStageItem {
  id: string;
  name: string;
  order: number;
}

interface WorkflowBuilderClientProps {
  initialWorkflow?: {
    id: string;
    name: string;
    description?: string | null;
    status: WorkflowStatus;
    triggerType: WorkflowTriggerType;
    conditionMatch: ConditionMatchGroup;
    conditions: WorkflowConditionInput[];
    actions: WorkflowActionInput[];
    createdAt?: string;
  } | null;
  workspaceUsers: WorkspaceUser[];
  pipelineStages: PipelineStageItem[];
  currentUserRole: Role;
}

export function WorkflowBuilderClient({
  initialWorkflow,
  workspaceUsers,
  pipelineStages,
  currentUserRole,
}: WorkflowBuilderClientProps) {
  const router = useRouter();
  const isEditing = !!initialWorkflow?.id;

  // Form State
  const [name, setName] = React.useState(initialWorkflow?.name || "");
  const [description, setDescription] = React.useState(initialWorkflow?.description || "");
  const [status, setStatus] = React.useState<WorkflowStatus>(
    initialWorkflow?.status || WorkflowStatus.DRAFT
  );
  const [triggerType, setTriggerType] = React.useState<WorkflowTriggerType>(
    initialWorkflow?.triggerType || WorkflowTriggerType.LEAD_CREATED
  );
  const [conditionMatch, setConditionMatch] = React.useState<ConditionMatchGroup>(
    initialWorkflow?.conditionMatch || ConditionMatchGroup.ALL
  );
  const [conditions, setConditions] = React.useState<WorkflowConditionInput[]>(
    initialWorkflow?.conditions || []
  );
  const [actions, setActions] = React.useState<WorkflowActionInput[]>(
    initialWorkflow?.actions && initialWorkflow.actions.length > 0
      ? initialWorkflow.actions
      : [
          {
            id: Math.random().toString(36).substring(2, 9),
            type: WorkflowActionType.CREATE_TASK,
            config: {
              taskTitle: "Follow up with {{lead.name}}",
              taskDescription: "Inbound lead inquiry from {{lead.company}}",
              taskPriority: "HIGH",
              dueDaysOffset: 1,
            },
            failurePolicy: ActionFailurePolicy.STOP_WORKFLOW,
          },
        ]
  );

  // UI state
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [simulationResult, setSimulationResult] = React.useState<any | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);
  const [feedback, setFeedback] = React.useState<{ type: "success" | "error"; message: string } | null>(null);

  // Selected trigger metadata
  const currentTriggerDescriptor = React.useMemo(() => {
    return (
      WORKFLOW_TRIGGERS.find((t) => t.type === triggerType) || WORKFLOW_TRIGGERS[0]
    );
  }, [triggerType]);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Condition Helpers
  const handleAddCondition = () => {
    const defaultField = currentTriggerDescriptor.availableFields[0]?.field || "lead.source";
    setConditions((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        field: defaultField,
        operator: ConditionOperator.EQUALS,
        value: "",
      },
    ]);
  };

  const handleUpdateCondition = (index: number, updates: Partial<WorkflowConditionInput>) => {
    setConditions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleRemoveCondition = (index: number) => {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  // Action Helpers
  const handleAddAction = (type: WorkflowActionType = WorkflowActionType.SEND_NOTIFICATION) => {
    setActions((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        type,
        config: getDefaultActionConfig(type),
        failurePolicy: ActionFailurePolicy.STOP_WORKFLOW,
      },
    ]);
  };

  const handleUpdateAction = (index: number, updates: Partial<WorkflowActionInput>) => {
    setActions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleUpdateActionConfig = (index: number, key: string, value: any) => {
    setActions((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        config: {
          ...next[index].config,
          [key]: value,
        },
      };
      return next;
    });
  };

  const handleRemoveAction = (index: number) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveAction = (index: number, direction: "up" | "down") => {
    setActions((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  const getDefaultActionConfig = (type: WorkflowActionType): Record<string, any> => {
    switch (type) {
      case WorkflowActionType.ASSIGN_LEAD:
        return { assigneeId: workspaceUsers[0]?.id || "" };
      case WorkflowActionType.UPDATE_LEAD_STATUS:
        return { status: "CONTACTED" };
      case WorkflowActionType.UPDATE_LEAD_SOURCE:
        return { source: "FACEBOOK" };
      case WorkflowActionType.CREATE_TASK:
        return {
          taskTitle: "Follow up with {{lead.name}}",
          taskDescription: "Review inbound details for {{lead.company}}",
          taskPriority: "HIGH",
          dueDaysOffset: 1,
        };
      case WorkflowActionType.SEND_NOTIFICATION:
        return {
          title: "New CRM Lead Alert",
          message: "Lead {{lead.name}} from {{lead.company}} received.",
        };
      case WorkflowActionType.CREATE_ACTIVITY:
        return {
          title: "Workflow Action Executed",
          description: "Automated trigger logged by workflow engine.",
        };
      case WorkflowActionType.ADD_TAG:
        return { tag: "Automated" };
      case WorkflowActionType.REMOVE_TAG:
        return { tag: "New" };
      case WorkflowActionType.UPDATE_DEAL_STAGE:
        return { stageId: pipelineStages[0]?.id || "" };
      case WorkflowActionType.ASSIGN_DEAL:
        return { assigneeId: workspaceUsers[0]?.id || "" };
      case WorkflowActionType.CREATE_INVOICE:
        return {};
      case WorkflowActionType.SEND_INVOICE:
        return {};
      case WorkflowActionType.DELAY:
        return { duration: 1, unit: "HOURS" };
      default:
        return {};
    }
  };

  // Comprehensive Client Validation
  const validateWorkflow = (): boolean => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push("Workflow name is required");
    } else if (name.trim().length < 3) {
      errors.push("Workflow name must be at least 3 characters");
    }

    if (!triggerType) {
      errors.push("A trigger event must be selected");
    }

    if (actions.length === 0) {
      errors.push("At least one action is required to activate a workflow");
    }

    // Validate individual conditions
    conditions.forEach((c, i) => {
      if (!c.field) {
        errors.push(`Condition #${i + 1} is missing a field`);
      }
      if (
        c.operator !== ConditionOperator.IS_EMPTY &&
        c.operator !== ConditionOperator.IS_NOT_EMPTY &&
        !c.value?.trim()
      ) {
        errors.push(`Condition #${i + 1} requires a comparison value`);
      }
    });

    // Validate individual actions
    actions.forEach((a, i) => {
      if (a.type === WorkflowActionType.CREATE_TASK && !a.config.taskTitle?.trim()) {
        errors.push(`Action #${i + 1} (Create Task) requires a Task Title`);
      }
      if (a.type === WorkflowActionType.SEND_NOTIFICATION && !a.config.title?.trim()) {
        errors.push(`Action #${i + 1} (Notification) requires a Title`);
      }
      if (a.type === WorkflowActionType.ADD_TAG && !a.config.tag?.trim()) {
        errors.push(`Action #${i + 1} (Add Tag) requires a tag name`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Save / Activate Handler
  const handleSave = async (targetStatus?: WorkflowStatus) => {
    const isValid = validateWorkflow();
    if (!isValid) {
      showFeedback("error", "Please correct the validation errors before saving");
      return;
    }

    setIsSaving(true);
    try {
      const finalStatus = targetStatus || status;

      if (isEditing) {
        const res = await updateWorkflowAction({
          id: initialWorkflow!.id,
          name: name.trim(),
          description: description.trim(),
          triggerType,
          conditionMatch,
          conditions,
          actions,
          status: finalStatus,
        });

        if (res.success) {
          setStatus(finalStatus);
          showFeedback("success", `Workflow updated successfully (${finalStatus})`);
          router.push("/app/automations");
        } else {
          showFeedback("error", res.error || "Failed to update workflow");
        }
      } else {
        const res = await createWorkflowAction({
          name: name.trim(),
          description: description.trim(),
          triggerType,
          triggerConfig: {},
          conditionMatch,
          conditions,
          actions,
          status: finalStatus,
        });

        if (res.success && res.data) {
          showFeedback("success", `Workflow created successfully (${finalStatus})`);
          router.push("/app/automations");
        } else {
          showFeedback("error", res.error || "Failed to create workflow");
        }
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to save workflow");
    } finally {
      setIsSaving(false);
    }
  };

  // Run Test Simulation
  const handleRunSimulation = async () => {
    if (!initialWorkflow?.id) {
      showFeedback("error", "Save workflow as draft first to run live simulations");
      return;
    }

    setIsSimulating(true);
    setSimulationResult(null);

    try {
      const res = await triggerTestWorkflowAction({
        workflowId: initialWorkflow.id,
      });

      if (res.success && res.data) {
        setSimulationResult(res.data);
        showFeedback("success", `Simulation complete: ${res.data.status}`);
      } else {
        showFeedback("error", res.error || "Simulation failed");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Simulation failed");
    } finally {
      setIsSimulating(false);
    }
  };

  // Variable helper pill click
  const appendVariableToField = (token: string, actionIndex: number, configKey: string) => {
    const currentVal = actions[actionIndex]?.config?.[configKey] || "";
    handleUpdateActionConfig(actionIndex, configKey, `${currentVal} {{${token}}}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Toast Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-md ${
              feedback.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
                : "bg-red-950/90 text-red-200 border-red-500/30"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{feedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/app/automations"
            className="p-2 rounded-xl bg-surface-elevated border border-border/80 hover:bg-surface text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">
                {isEditing ? "Edit Workflow" : "New Automation Workflow"}
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                  status === WorkflowStatus.ACTIVE
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : status === WorkflowStatus.PAUSED
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-surface text-muted-foreground border-border"
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure event triggers, conditional filtering, and automated action sequences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {isEditing && (
            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated border border-border/80 hover:bg-surface text-foreground text-xs font-semibold transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>{isSimulating ? "Simulating..." : "Test Run"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave(WorkflowStatus.DRAFT)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated border border-border/80 hover:bg-surface text-foreground text-xs font-semibold transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-muted-foreground" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(WorkflowStatus.ACTIVE)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-primary-foreground" />
            <span>Activate Workflow</span>
          </button>
        </div>
      </div>

      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-red-200">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span>Please resolve the following issues before activating:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Workflow Metadata Card */}
      <div className="p-5 rounded-3xl bg-surface-elevated border border-border/80 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-foreground">
              Workflow Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Assign New Facebook Leads"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as WorkflowStatus)}
              className="w-full px-3.5 py-2 text-sm bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value={WorkflowStatus.DRAFT}>DRAFT</option>
              <option value={WorkflowStatus.ACTIVE}>ACTIVE</option>
              <option value={WorkflowStatus.PAUSED}>PAUSED</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Description</label>
          <input
            type="text"
            placeholder="e.g. Automatically assign inbound leads and dispatch urgent task reminders"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: WHEN (Trigger) */}
      {/* ========================================================================= */}
      <div className="relative pl-6 before:absolute before:left-2.5 before:top-8 before:bottom-0 before:w-0.5 before:bg-primary/20 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center -ml-6 shadow-sm">
            1
          </div>
          <span className="text-xs font-mono font-black text-primary tracking-widest uppercase">
            WHEN (TRIGGER)
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-surface-elevated border border-border/80 space-y-4 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">
              Select Trigger Event
            </label>
            <select
              value={triggerType}
              onChange={(e) => {
                setTriggerType(e.target.value as WorkflowTriggerType);
                setConditions([]); // reset conditions to avoid stale field mismatches
              }}
              className="w-full px-3.5 py-2.5 text-sm font-semibold bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <optgroup label="Lead Triggers">
                <option value={WorkflowTriggerType.LEAD_CREATED}>Lead Created</option>
                <option value={WorkflowTriggerType.LEAD_UPDATED}>Lead Updated</option>
                <option value={WorkflowTriggerType.LEAD_STATUS_CHANGED}>Lead Status Changed</option>
                <option value={WorkflowTriggerType.LEAD_SOURCE_RECEIVED}>Lead Ingested from Connector</option>
              </optgroup>
              <optgroup label="Deal Triggers">
                <option value={WorkflowTriggerType.DEAL_CREATED}>Deal Created</option>
                <option value={WorkflowTriggerType.DEAL_STAGE_CHANGED}>Deal Stage Changed</option>
                <option value={WorkflowTriggerType.DEAL_WON}>Deal Won</option>
                <option value={WorkflowTriggerType.DEAL_LOST}>Deal Lost</option>
              </optgroup>
              <optgroup label="Invoice Triggers">
                <option value={WorkflowTriggerType.INVOICE_CREATED}>Invoice Created</option>
                <option value={WorkflowTriggerType.INVOICE_SENT}>Invoice Sent</option>
                <option value={WorkflowTriggerType.INVOICE_PAID}>Invoice Paid</option>
                <option value={WorkflowTriggerType.INVOICE_OVERDUE}>Invoice Overdue</option>
                <option value={WorkflowTriggerType.PAYMENT_RECEIVED}>Payment Received</option>
              </optgroup>
              <optgroup label="Task Triggers">
                <option value={WorkflowTriggerType.TASK_CREATED}>Task Created</option>
                <option value={WorkflowTriggerType.TASK_COMPLETED}>Task Completed</option>
              </optgroup>
            </select>
          </div>

          {/* Trigger Context Summary */}
          <div className="p-3 rounded-2xl bg-surface/70 border border-border/60 text-xs text-muted-foreground flex items-start gap-2.5">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-foreground font-medium">
                {currentTriggerDescriptor.description}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <span className="text-[10px] text-muted-foreground">Available tokens:</span>
                {currentTriggerDescriptor.availableFields.map((f) => (
                  <code
                    key={f.field}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated text-primary border border-border/50 font-mono"
                  >
                    {"{{"}
                    {f.field}
                    {"}}"}
                  </code>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: IF (Conditions) */}
      {/* ========================================================================= */}
      <div className="relative pl-6 before:absolute before:left-2.5 before:top-8 before:bottom-0 before:w-0.5 before:bg-primary/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center -ml-6 shadow-sm">
              2
            </div>
            <span className="text-xs font-mono font-black text-primary tracking-widest uppercase">
              IF (CONDITIONS)
            </span>
          </div>

          {conditions.length > 1 && (
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-elevated border border-border/80 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setConditionMatch(ConditionMatchGroup.ALL)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  conditionMatch === ConditionMatchGroup.ALL
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Match ALL (AND)
              </button>
              <button
                type="button"
                onClick={() => setConditionMatch(ConditionMatchGroup.ANY)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  conditionMatch === ConditionMatchGroup.ANY
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Match ANY (OR)
              </button>
            </div>
          )}
        </div>

        <div className="p-5 rounded-3xl bg-surface-elevated border border-border/80 space-y-3 shadow-sm">
          {conditions.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-border/60 rounded-2xl bg-surface/30">
              <p className="text-xs text-muted-foreground">
                No conditions added. This workflow will execute on <strong>every</strong> {currentTriggerDescriptor.label}.
              </p>
              <button
                type="button"
                onClick={handleAddCondition}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-xs font-semibold text-foreground hover:bg-surface transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Add Condition</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {conditions.map((cond, idx) => {
                const isFirst = idx === 0;
                const activeFieldDesc = currentTriggerDescriptor.availableFields.find(
                  (f) => f.field === cond.field
                );

                return (
                  <div
                    key={cond.id}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 rounded-2xl bg-surface border border-border/80"
                  >
                    <span className="text-[11px] font-bold font-mono text-primary px-1.5 sm:w-12 text-center">
                      {isFirst ? "IF" : conditionMatch === ConditionMatchGroup.ALL ? "AND" : "OR"}
                    </span>

                    {/* Field selector */}
                    <select
                      value={cond.field}
                      onChange={(e) => handleUpdateCondition(idx, { field: e.target.value })}
                      className="px-3 py-1.5 text-xs bg-surface-elevated border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer flex-1"
                    >
                      {currentTriggerDescriptor.availableFields.map((f) => (
                        <option key={f.field} value={f.field}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator selector */}
                    <select
                      value={cond.operator}
                      onChange={(e) =>
                        handleUpdateCondition(idx, { operator: e.target.value as ConditionOperator })
                      }
                      className="px-3 py-1.5 text-xs bg-surface-elevated border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer flex-1"
                    >
                      <option value={ConditionOperator.EQUALS}>is equal to</option>
                      <option value={ConditionOperator.NOT_EQUALS}>is not equal to</option>
                      <option value={ConditionOperator.CONTAINS}>contains</option>
                      <option value={ConditionOperator.NOT_CONTAINS}>does not contain</option>
                      <option value={ConditionOperator.GREATER_THAN}>greater than (&gt;)</option>
                      <option value={ConditionOperator.LESS_THAN}>less than (&lt;)</option>
                      <option value={ConditionOperator.GREATER_THAN_OR_EQUAL}>greater than or equal (&ge;)</option>
                      <option value={ConditionOperator.LESS_THAN_OR_EQUAL}>less than or equal (&le;)</option>
                      <option value={ConditionOperator.IS_EMPTY}>is empty</option>
                      <option value={ConditionOperator.IS_NOT_EMPTY}>is not empty</option>
                    </select>

                    {/* Value Input */}
                    {cond.operator !== ConditionOperator.IS_EMPTY &&
                      cond.operator !== ConditionOperator.IS_NOT_EMPTY && (
                        <div className="flex-1">
                          {activeFieldDesc?.options ? (
                            <select
                              value={cond.value}
                              onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs bg-surface-elevated border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                            >
                              <option value="">Select value...</option>
                              {activeFieldDesc.options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="e.g. Facebook or 50000"
                              value={cond.value}
                              onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
                              className="w-full px-3 py-1.5 text-xs bg-surface-elevated border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          )}
                        </div>
                      )}

                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(idx)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer self-end sm:self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleAddCondition}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-elevated transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Add Condition</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: THEN (Actions Sequence) */}
      {/* ========================================================================= */}
      <div className="relative pl-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center -ml-6 shadow-sm">
              3
            </div>
            <span className="text-xs font-mono font-black text-primary tracking-widest uppercase">
              THEN (ACTIONS SEQUENCE)
            </span>
          </div>

          <span className="text-[11px] text-muted-foreground">
            Executed in sequential order
          </span>
        </div>

        <div className="space-y-3">
          {actions.map((act, index) => {
            const isFirst = index === 0;
            const isLast = index === actions.length - 1;

            return (
              <motion.div
                key={act.id}
                layout
                className="p-5 rounded-3xl bg-surface-elevated border border-border/80 space-y-4 shadow-sm"
              >
                {/* Action Card Top Bar */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center border border-primary/20">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold text-foreground">Action Type:</span>

                    <select
                      value={act.type}
                      onChange={(e) => {
                        const newType = e.target.value as WorkflowActionType;
                        handleUpdateAction(index, {
                          type: newType,
                          config: getDefaultActionConfig(newType),
                        });
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <optgroup label="Lead Actions">
                        <option value={WorkflowActionType.ASSIGN_LEAD}>Assign Lead</option>
                        <option value={WorkflowActionType.UPDATE_LEAD_STATUS}>Update Lead Status</option>
                        <option value={WorkflowActionType.UPDATE_LEAD_SOURCE}>Update Lead Source</option>
                        <option value={WorkflowActionType.ADD_TAG}>Add Tag</option>
                        <option value={WorkflowActionType.REMOVE_TAG}>Remove Tag</option>
                      </optgroup>
                      <optgroup label="Task & Communication">
                        <option value={WorkflowActionType.CREATE_TASK}>Create Follow-up Task</option>
                        <option value={WorkflowActionType.SEND_NOTIFICATION}>Send In-App Notification</option>
                        <option value={WorkflowActionType.CREATE_ACTIVITY}>Log Activity Entry</option>
                      </optgroup>
                      <optgroup label="Deal Actions">
                        <option value={WorkflowActionType.UPDATE_DEAL_STAGE}>Update Deal Stage</option>
                        <option value={WorkflowActionType.ASSIGN_DEAL}>Assign Deal Owner</option>
                      </optgroup>
                      <optgroup label="Invoice Actions">
                        <option value={WorkflowActionType.CREATE_INVOICE}>Create Draft Invoice</option>
                        <option value={WorkflowActionType.SEND_INVOICE}>Send Invoice Email</option>
                      </optgroup>
                      <optgroup label="Logic / Delay">
                        <option value={WorkflowActionType.DELAY}>Delay / Wait</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Failure Policy Switch */}
                    <select
                      value={act.failurePolicy || ActionFailurePolicy.STOP_WORKFLOW}
                      onChange={(e) =>
                        handleUpdateAction(index, {
                          failurePolicy: e.target.value as any,
                        })
                      }
                      title="Failure Policy: Stop workflow on failure vs Continue to next step"
                      className="px-2.5 py-1 text-[11px] font-semibold bg-surface border border-border rounded-lg text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value={ActionFailurePolicy.STOP_WORKFLOW}>Stop on Error</option>
                      <option value={ActionFailurePolicy.CONTINUE}>Continue on Error</option>
                    </select>

                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveAction(index, "up")}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveAction(index, "down")}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveAction(index)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dynamic Action Config Form */}
                <div className="space-y-3 pt-1">
                  {/* ASSIGN_LEAD */}
                  {act.type === WorkflowActionType.ASSIGN_LEAD && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          Assignee
                        </label>
                        <select
                          value={act.config.assigneeId || ""}
                          onChange={(e) =>
                            handleUpdateActionConfig(index, "assigneeId", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="">Select workspace user...</option>
                          {workspaceUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* UPDATE_LEAD_STATUS */}
                  {act.type === WorkflowActionType.UPDATE_LEAD_STATUS && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          Target Lead Status
                        </label>
                        <select
                          value={act.config.status || "NEW"}
                          onChange={(e) =>
                            handleUpdateActionConfig(index, "status", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="NEW">New</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="QUALIFIED">Qualified</option>
                          <option value="PROPOSAL">Proposal</option>
                          <option value="NEGOTIATION">Negotiation</option>
                          <option value="WON">Won</option>
                          <option value="LOST">Lost</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* CREATE_TASK */}
                  {act.type === WorkflowActionType.CREATE_TASK && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground">
                            Task Title <span className="text-red-400">*</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Insert token:</span>
                            {["lead.name", "lead.company", "deal.name"].map((tok) => (
                              <button
                                key={tok}
                                type="button"
                                onClick={() => appendVariableToField(tok, index, "taskTitle")}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-surface text-primary border border-border/60 hover:bg-surface-elevated transition-colors cursor-pointer"
                              >
                                +{tok}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Call {{lead.name}} regarding budget"
                          value={act.config.taskTitle || ""}
                          onChange={(e) =>
                            handleUpdateActionConfig(index, "taskTitle", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground">Priority</label>
                          <select
                            value={act.config.taskPriority || "MEDIUM"}
                            onChange={(e) =>
                              handleUpdateActionConfig(index, "taskPriority", e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground cursor-pointer"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground">Due Offset (Days)</label>
                          <input
                            type="number"
                            min="0"
                            max="365"
                            value={act.config.dueDaysOffset ?? 1}
                            onChange={(e) =>
                              handleUpdateActionConfig(index, "dueDaysOffset", Number(e.target.value))
                            }
                            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-foreground">Assignee</label>
                          <select
                            value={act.config.assigneeId || ""}
                            onChange={(e) =>
                              handleUpdateActionConfig(index, "assigneeId", e.target.value)
                            }
                            className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground cursor-pointer"
                          >
                            <option value="">Lead / Deal Owner</option>
                            {workspaceUsers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SEND_NOTIFICATION */}
                  {act.type === WorkflowActionType.SEND_NOTIFICATION && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          Notification Title <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 🚨 High Value Lead Alert"
                          value={act.config.title || ""}
                          onChange={(e) =>
                            handleUpdateActionConfig(index, "title", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-foreground">
                            Message Body
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">Tokens:</span>
                            {["lead.name", "deal.value", "invoice.number"].map((tok) => (
                              <button
                                key={tok}
                                type="button"
                                onClick={() => appendVariableToField(tok, index, "message")}
                                className="text-[10px] px-1.5 py-0.2 rounded bg-surface text-primary border border-border/60 hover:bg-surface-elevated transition-colors cursor-pointer"
                              >
                                +{tok}
                              </button>
                            ))}
                          </div>
                        </div>
                        <input
                          type="text"
                          placeholder="e.g. Lead {{lead.name}} has entered the pipeline."
                          value={act.config.message || ""}
                          onChange={(e) =>
                            handleUpdateActionConfig(index, "message", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* ADD_TAG / REMOVE_TAG */}
                  {(act.type === WorkflowActionType.ADD_TAG ||
                    act.type === WorkflowActionType.REMOVE_TAG) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          Tag Label <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Facebook Ad or VIP Enterprise"
                          value={act.config.tag || ""}
                          onChange={(e) =>
                            handleUpdateActionConfig(index, "tag", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* UPDATE_DEAL_STAGE */}
                  {act.type === WorkflowActionType.UPDATE_DEAL_STAGE && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">
                          Pipeline Stage
                        </label>
                        <select
                          value={act.config.stageId || ""}
                          onChange={(e) =>
                            handleUpdateActionConfig(index, "stageId", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                          <option value="">Select target stage...</option>
                          {pipelineStages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* DELAY */}
                  {act.type === WorkflowActionType.DELAY && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Duration</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={act.config.duration || 1}
                          onChange={(e) =>
                            handleUpdateActionConfig(index, "duration", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Unit</label>
                        <select
                          value={act.config.unit || "HOURS"}
                          onChange={(e) =>
                            handleUpdateActionConfig(index, "unit", e.target.value)
                          }
                          className="w-full px-3 py-2 text-xs bg-surface border border-border rounded-xl text-foreground cursor-pointer"
                        >
                          <option value="HOURS">Hours</option>
                          <option value="DAYS">Days</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                        Delayed execution is recorded and queued for background scheduler processing.
                      </div>
                    </div>
                  )}

                  {/* SEND_INVOICE */}
                  {act.type === WorkflowActionType.SEND_INVOICE && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      Dispatches invoice via verified SMTP/SendGrid connector. If unconfigured, workflow produces a clear &quot;Email provider not configured&quot; diagnostic failure.
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          <button
            type="button"
            onClick={() => handleAddAction()}
            className="w-full py-3 rounded-2xl border border-dashed border-border/80 hover:border-primary/50 text-xs font-bold text-muted-foreground hover:text-primary transition-all flex items-center justify-center gap-2 bg-surface-elevated/20 hover:bg-surface-elevated cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Action</span>
          </button>
        </div>
      </div>

      {/* Simulation Diagnostic Drawer */}
      <AnimatePresence>
        {simulationResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-surface-elevated border border-border rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-foreground">
                    Simulation Diagnostics
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setSimulationResult(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-border/80 text-xs">
                <div>
                  <span className="text-muted-foreground">Execution Result:</span>{" "}
                  <strong
                    className={
                      simulationResult.status === "SUCCESS"
                        ? "text-emerald-400"
                        : simulationResult.status === "SKIPPED"
                        ? "text-amber-400"
                        : "text-red-400"
                    }
                  >
                    {simulationResult.status}
                  </strong>
                </div>
                <div className="text-muted-foreground">
                  Duration: <strong>{simulationResult.durationMs}ms</strong>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Step Trace
                </h4>

                {simulationResult.stepResults.map((st: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl bg-surface border border-border/70 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground font-mono">
                        {st.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          st.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/10 text-red-400 border-red-500/30"
                        }`}
                      >
                        {st.status} ({st.durationMs}ms)
                      </span>
                    </div>

                    {st.error && (
                      <p className="text-[11px] text-red-300 font-medium">
                        Error: {st.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setSimulationResult(null)}
                  className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold hover:bg-surface-elevated transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
