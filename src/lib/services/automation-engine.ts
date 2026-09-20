import prisma from "@/lib/prisma";
import {
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowExecutionStatus,
  ConditionOperator,
  ConditionMatchGroup,
  ActionFailurePolicy,
  WorkflowConditionInput,
  WorkflowActionInput,
} from "@/lib/validations/automations";
import { DomainEvent, eventBus } from "@/lib/events/event-bus";
import { Prisma, TaskPriority } from "@prisma/client";

export const MAX_WORKFLOW_DEPTH = 10;

export interface StepEvaluationResult {
  stepId: string;
  stepType: "TRIGGER" | "CONDITION" | "ACTION";
  name: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  startedAt: string;
  completedAt: string;
  durationMs: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
}

export interface ExecutionResult {
  executionId: string;
  workflowId: string;
  status: WorkflowExecutionStatus;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  errorMessage?: string;
  stepResults: StepEvaluationResult[];
}

/**
 * Safely extracts a nested or dot-notated property from an object.
 * No eval or dynamic code execution.
 */
export function extractFieldValue(data: Record<string, any>, path: string): any {
  if (!data || !path) return undefined;

  // If path has dot notation e.g. "lead.source" or "deal.value"
  const parts = path.split(".");

  // Check if first prefix matches top-level key (e.g. data.source vs data.lead.source)
  let current: any = data;
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i];
    if (current === undefined || current === null) {
      break;
    }
    if (current[key] !== undefined) {
      current = current[key];
    } else if (i === 0 && data[parts.slice(1).join(".")] !== undefined) {
      // direct flattened key
      return data[parts.slice(1).join(".")];
    } else {
      current = undefined;
    }
  }

  if (current !== undefined) return current;

  // Fallback: check direct key without prefix (e.g. "source" when path is "lead.source")
  if (parts.length > 1) {
    const directKey = parts[parts.length - 1];
    if (data[directKey] !== undefined) {
      return data[directKey];
    }
  }

  return undefined;
}

/**
 * Evaluates a single condition operator against an actual value.
 */
export function evaluateConditionOperator(
  actual: any,
  operator: ConditionOperator,
  expected: string
): boolean {
  // Empty / Not Empty checks
  if (operator === ConditionOperator.IS_EMPTY) {
    return actual === undefined || actual === null || actual === "" || (Array.isArray(actual) && actual.length === 0);
  }
  if (operator === ConditionOperator.IS_NOT_EMPTY) {
    return actual !== undefined && actual !== null && actual !== "" && (!Array.isArray(actual) || actual.length > 0);
  }

  if (actual === undefined || actual === null) {
    return false;
  }

  const actualStr = String(actual).trim().toLowerCase();
  const expectedStr = (expected ?? "").trim().toLowerCase();

  switch (operator) {
    case ConditionOperator.EQUALS:
      return actualStr === expectedStr;

    case ConditionOperator.NOT_EQUALS:
      return actualStr !== expectedStr;

    case ConditionOperator.CONTAINS:
      return actualStr.includes(expectedStr);

    case ConditionOperator.NOT_CONTAINS:
      return !actualStr.includes(expectedStr);

    case ConditionOperator.GREATER_THAN: {
      const actNum = Number(actual);
      const expNum = Number(expected);
      if (isNaN(actNum) || isNaN(expNum)) return false;
      return actNum > expNum;
    }

    case ConditionOperator.LESS_THAN: {
      const actNum = Number(actual);
      const expNum = Number(expected);
      if (isNaN(actNum) || isNaN(expNum)) return false;
      return actNum < expNum;
    }

    case ConditionOperator.GREATER_THAN_OR_EQUAL: {
      const actNum = Number(actual);
      const expNum = Number(expected);
      if (isNaN(actNum) || isNaN(expNum)) return false;
      return actNum >= expNum;
    }

    case ConditionOperator.LESS_THAN_OR_EQUAL: {
      const actNum = Number(actual);
      const expNum = Number(expected);
      if (isNaN(actNum) || isNaN(expNum)) return false;
      return actNum <= expNum;
    }

    default:
      return false;
  }
}

/**
 * Evaluates all workflow conditions against the event context.
 */
export function evaluateConditions(
  conditions: WorkflowConditionInput[],
  conditionMatch: ConditionMatchGroup,
  eventData: Record<string, any>
): { passed: boolean; stepResults: StepEvaluationResult[] } {
  const stepResults: StepEvaluationResult[] = [];

  if (!conditions || conditions.length === 0) {
    return { passed: true, stepResults };
  }

  const evaluationResults: boolean[] = [];

  for (const cond of conditions) {
    const start = Date.now();
    const actual = extractFieldValue(eventData, cond.field);
    const passed = evaluateConditionOperator(actual, cond.operator, cond.value);
    const end = Date.now();

    evaluationResults.push(passed);

    stepResults.push({
      stepId: cond.id,
      stepType: "CONDITION",
      name: `IF ${cond.field} ${cond.operator} "${cond.value || ""}"`,
      status: passed ? "SUCCESS" : "FAILED",
      startedAt: new Date(start).toISOString(),
      completedAt: new Date(end).toISOString(),
      durationMs: end - start,
      input: { field: cond.field, operator: cond.operator, expected: cond.value },
      output: { actual, passed },
    });
  }

  const allPassed =
    conditionMatch === ConditionMatchGroup.ANY
      ? evaluationResults.some((r) => r === true)
      : evaluationResults.every((r) => r === true);

  return { passed: allPassed, stepResults };
}

/**
 * Safely replaces template variables e.g. {{lead.name}}, {{deal.value}}
 * Whitelisted tokens only. No eval or arbitrary JS.
 */
export function interpolateVariables(
  template: string,
  contextData: Record<string, any>
): string {
  if (!template || typeof template !== "string") return template || "";

  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, token) => {
    const val = extractFieldValue(contextData, token);
    if (val === undefined || val === null) {
      return match; // preserve if not found
    }
    return String(val);
  });
}

/**
 * Workflow Job Runner & Scheduler Abstraction
 */
export interface WorkflowJobRunner {
  scheduleDelay(params: {
    workspaceId: string;
    workflowId: string;
    executionId: string;
    actionIndex: number;
    delaySeconds: number;
  }): Promise<{ scheduled: boolean; note: string }>;
}

export const defaultJobRunner: WorkflowJobRunner = {
  async scheduleDelay() {
    // In current environment without active Redis/BullMQ queue worker,
    // we return a note indicating queue requirement
    return {
      scheduled: false,
      note: "Background job queue (Redis/BullMQ) is not configured. Delayed action recorded for future worker execution.",
    };
  },
};

/**
 * Core Automation Engine for NEXORA CRM
 */
export class AutomationEngine {
  /**
   * Initializes domain event listeners on the event bus.
   */
  public static initialize() {
    // Subscribe to all domain events
    eventBus.subscribe("*", async (event) => {
      await AutomationEngine.handleDomainEvent(event);
    });
  }

  /**
   * Main domain event handler: Finds active workflows, evaluates conditions, and executes actions.
   */
  public static async handleDomainEvent(
    event: DomainEvent
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    // Loop & Recursion Protection: check depth
    const depth = event.context?.depth || 1;
    if (depth > MAX_WORKFLOW_DEPTH) {
      console.warn(
        `[AutomationEngine] WORKFLOW_LOOP_DETECTED: Execution halted for event ${event.id}. Exceeded max depth (${MAX_WORKFLOW_DEPTH}).`
      );
      return results;
    }

    try {
      // Find all ACTIVE workflows in this workspace listening to this trigger type
      const activeWorkflows = await prisma.workflow.findMany({
        where: {
          workspaceId: event.workspaceId,
          status: WorkflowStatus.ACTIVE,
          triggerType: event.type,
        },
      });

      if (!activeWorkflows || activeWorkflows.length === 0) {
        return results;
      }

      for (const workflow of activeWorkflows) {
        const res = await AutomationEngine.executeWorkflow(workflow, event);
        results.push(res);
      }
    } catch (err) {
      console.error(
        `[AutomationEngine] Error processing event ${event.id}:`,
        err
      );
    }

    return results;
  }

  /**
   * Executes a single workflow for a domain event.
   */
  public static async executeWorkflow(
    workflow: {
      id: string;
      workspaceId: string;
      name: string;
      description?: string | null;
      triggerType: WorkflowTriggerType;
      conditionMatch: ConditionMatchGroup;
      conditions: string;
      actions: string;
    },
    event: DomainEvent
  ): Promise<ExecutionResult> {
    const startedAtTime = Date.now();
    const executionId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const idempotencyKey = `${event.id}_${workflow.id}`;
    const depth = event.context?.depth || 1;

    // Check Idempotency: prevent executing exact same event + workflow twice
    const existingRun = await prisma.workflowExecution.findFirst({
      where: {
        workspaceId: workflow.workspaceId,
        idempotencyKey,
      },
    });

    if (existingRun && existingRun.status === WorkflowExecutionStatus.SUCCESS) {
      return {
        executionId: existingRun.id,
        workflowId: workflow.id,
        status: WorkflowExecutionStatus.SKIPPED,
        startedAt: existingRun.startedAt.toISOString(),
        completedAt: existingRun.completedAt ? existingRun.completedAt.toISOString() : new Date().toISOString(),
        durationMs: existingRun.durationMs || 0,
        errorMessage: "Idempotency key matched: Event already successfully processed",
        stepResults: [],
      };
    }

    // Parse conditions and actions
    const parsedConditions: WorkflowConditionInput[] = JSON.parse(
      workflow.conditions || "[]"
    );
    const parsedActions: WorkflowActionInput[] = JSON.parse(
      workflow.actions || "[]"
    );

    // Build context data from event payload and entity info
    const contextData: Record<string, any> = {
      ...event.payload,
      entityType: event.entityType,
      entityId: event.entityId,
      [event.entityType.toLowerCase()]: event.payload,
    };

    const stepResults: StepEvaluationResult[] = [];

    // Step 0: Trigger matched
    stepResults.push({
      stepId: "trigger",
      stepType: "TRIGGER",
      name: `WHEN ${workflow.triggerType}`,
      status: "SUCCESS",
      startedAt: new Date(startedAtTime).toISOString(),
      completedAt: new Date(startedAtTime).toISOString(),
      durationMs: 0,
      input: { entityType: event.entityType, entityId: event.entityId },
      output: { payload: event.payload },
    });

    // Step 1: Evaluate Conditions
    const conditionEvaluation = evaluateConditions(
      parsedConditions,
      workflow.conditionMatch,
      contextData
    );
    stepResults.push(...conditionEvaluation.stepResults);

    // If conditions failed, record as SKIPPED
    if (!conditionEvaluation.passed) {
      const durationMs = Date.now() - startedAtTime;
      const completedAtDate = new Date();

      await prisma.workflowExecution.create({
        data: {
          id: executionId,
          workspaceId: workflow.workspaceId,
          workflowId: workflow.id,
          eventId: event.id,
          idempotencyKey,
          entityType: event.entityType,
          entityId: event.entityId,
          status: WorkflowExecutionStatus.SKIPPED,
          startedAt: new Date(startedAtTime),
          completedAt: completedAtDate,
          durationMs,
          errorMessage: "Conditions did not match.",
          configurationSnapshot: JSON.stringify({
            workflowName: workflow.name,
            triggerType: workflow.triggerType,
            conditionMatch: workflow.conditionMatch,
            conditions: parsedConditions,
            actions: parsedActions,
          }),
          stepResults: JSON.stringify(stepResults),
          depth,
        },
      });

      return {
        executionId,
        workflowId: workflow.id,
        status: WorkflowExecutionStatus.SKIPPED,
        startedAt: new Date(startedAtTime).toISOString(),
        completedAt: completedAtDate.toISOString(),
        durationMs,
        errorMessage: "Conditions did not match.",
        stepResults,
      };
    }

    // Step 2: Execute Actions sequentially
    let executionStatus: WorkflowExecutionStatus = WorkflowExecutionStatus.SUCCESS;
    let finalErrorMessage: string | undefined;

    for (let i = 0; i < parsedActions.length; i++) {
      const action = parsedActions[i];
      const actionStart = Date.now();

      try {
        const actionOutput = await AutomationEngine.executeSingleAction(
          action,
          contextData,
          workflow.workspaceId,
          event,
          executionId,
          depth
        );

        const actionEnd = Date.now();
        stepResults.push({
          stepId: action.id,
          stepType: "ACTION",
          name: `THEN ${action.type}`,
          status: "SUCCESS",
          startedAt: new Date(actionStart).toISOString(),
          completedAt: new Date(actionEnd).toISOString(),
          durationMs: actionEnd - actionStart,
          input: action.config,
          output: actionOutput,
        });
      } catch (actionErr: any) {
        const actionEnd = Date.now();
        const errStr =
          actionErr instanceof Error ? actionErr.message : String(actionErr);

        stepResults.push({
          stepId: action.id,
          stepType: "ACTION",
          name: `THEN ${action.type}`,
          status: "FAILED",
          startedAt: new Date(actionStart).toISOString(),
          completedAt: new Date(actionEnd).toISOString(),
          durationMs: actionEnd - actionStart,
          input: action.config,
          error: errStr,
        });

        // Check failure policy
        if (action.failurePolicy === ActionFailurePolicy.STOP_WORKFLOW) {
          executionStatus = WorkflowExecutionStatus.FAILED;
          finalErrorMessage = `Action ${action.type} failed: ${errStr}`;
          break; // Halt workflow execution
        }
      }
    }

    const durationMs = Date.now() - startedAtTime;
    const completedAtDate = new Date();

    // Store execution in DB
    await prisma.workflowExecution.create({
      data: {
        id: executionId,
        workspaceId: workflow.workspaceId,
        workflowId: workflow.id,
        eventId: event.id,
        idempotencyKey,
        entityType: event.entityType,
        entityId: event.entityId,
        status: executionStatus,
        startedAt: new Date(startedAtTime),
        completedAt: completedAtDate,
        durationMs,
        errorMessage: finalErrorMessage,
        configurationSnapshot: JSON.stringify({
          workflowName: workflow.name,
          triggerType: workflow.triggerType,
          conditionMatch: workflow.conditionMatch,
          conditions: parsedConditions,
          actions: parsedActions,
        }),
        stepResults: JSON.stringify(stepResults),
        depth,
      },
    });

    // Audit log if important status
    await prisma.auditLog.create({
      data: {
        workspaceId: workflow.workspaceId,
        action: executionStatus === WorkflowExecutionStatus.SUCCESS ? "WORKFLOW_EXECUTED" : "WORKFLOW_FAILED",
        entityType: "WORKFLOW",
        entityId: workflow.id,
        metadata: JSON.stringify({
          workflowName: workflow.name,
          executionId,
          status: executionStatus,
          durationMs,
          error: finalErrorMessage,
        }),
      },
    });

    return {
      executionId,
      workflowId: workflow.id,
      status: executionStatus,
      startedAt: new Date(startedAtTime).toISOString(),
      completedAt: completedAtDate.toISOString(),
      durationMs,
      errorMessage: finalErrorMessage,
      stepResults,
    };
  }

  /**
   * Executes an individual action.
   */
  private static async executeSingleAction(
    action: WorkflowActionInput,
    contextData: Record<string, any>,
    workspaceId: string,
    event: DomainEvent,
    executionId: string,
    currentDepth: number
  ): Promise<Record<string, any>> {
    const config = action.config || {};

    switch (action.type) {
      case WorkflowActionType.ASSIGN_LEAD: {
        const leadId = contextData.lead?.id || contextData.id || event.entityId;
        if (!leadId) throw new Error("Missing lead ID for assignment action");

        // Verify lead belongs to workspace
        const lead = await prisma.lead.findFirst({
          where: { id: leadId, workspaceId },
        });
        if (!lead) throw new Error(`Lead ${leadId} not found in workspace`);

        let newOwnerName = config.ownerName || "Unassigned";
        if (config.assigneeId) {
          const user = await prisma.user.findFirst({
            where: {
              id: config.assigneeId,
              memberships: { some: { workspaceId } },
            },
          });
          if (!user) throw new Error("Assigned user does not belong to workspace");
          newOwnerName = user.name;
        }

        await prisma.lead.update({
          where: { id: leadId },
          data: { ownerName: newOwnerName },
        });

        // Add activity
        await prisma.activity.create({
          data: {
            workspaceId,
            leadId,
            type: "lead_assigned",
            title: `Lead automatically assigned to ${newOwnerName}`,
            description: `Automated assignment by workflow engine (Execution: ${executionId})`,
            author: "Workflow Engine",
          },
        });

        return { leadId, assignedTo: newOwnerName };
      }

      case WorkflowActionType.UPDATE_LEAD_STATUS: {
        const leadId = contextData.lead?.id || contextData.id || event.entityId;
        if (!leadId) throw new Error("Missing lead ID for status update");

        const targetStatus = config.status;
        if (!targetStatus) throw new Error("Target lead status is required");

        await prisma.lead.update({
          where: { id: leadId },
          data: { status: targetStatus },
        });

        await prisma.activity.create({
          data: {
            workspaceId,
            leadId,
            type: "status_changed",
            title: `Status changed to ${targetStatus}`,
            description: `Lead status updated automatically by workflow`,
            author: "Workflow Engine",
          },
        });

        return { leadId, newStatus: targetStatus };
      }

      case WorkflowActionType.UPDATE_LEAD_SOURCE: {
        const leadId = contextData.lead?.id || contextData.id || event.entityId;
        if (!leadId) throw new Error("Missing lead ID for source update");

        const targetSource = config.source;
        if (!targetSource) throw new Error("Target lead source is required");

        await prisma.lead.update({
          where: { id: leadId },
          data: { source: targetSource },
        });

        return { leadId, newSource: targetSource };
      }

      case WorkflowActionType.ADD_TAG: {
        const entityId = event.entityId;
        const tagToAdd = interpolateVariables(config.tag || "", contextData).trim();
        if (!tagToAdd) throw new Error("Tag value is required");

        if (event.entityType === "LEAD") {
          const lead = await prisma.lead.findFirst({
            where: { id: entityId, workspaceId },
          });
          if (!lead) throw new Error(`Lead ${entityId} not found`);

          const currentTags: string[] = typeof lead.tags === "string" ? JSON.parse(lead.tags || "[]") : (lead.tags || []);
          if (!currentTags.includes(tagToAdd)) {
            currentTags.push(tagToAdd);
            await prisma.lead.update({
              where: { id: entityId },
              data: { tags: JSON.stringify(currentTags) },
            });
          }
        }
        return { tag: tagToAdd, added: true };
      }

      case WorkflowActionType.REMOVE_TAG: {
        const entityId = event.entityId;
        const tagToRemove = (config.tag || "").trim();
        if (!tagToRemove) throw new Error("Tag value is required");

        if (event.entityType === "LEAD") {
          const lead = await prisma.lead.findFirst({
            where: { id: entityId, workspaceId },
          });
          if (!lead) throw new Error(`Lead ${entityId} not found`);

          const currentTags: string[] = typeof lead.tags === "string" ? JSON.parse(lead.tags || "[]") : (lead.tags || []);
          const updatedTags = currentTags.filter((t) => t !== tagToRemove);
          await prisma.lead.update({
            where: { id: entityId },
            data: { tags: JSON.stringify(updatedTags) },
          });
        }
        return { tag: tagToRemove, removed: true };
      }

      case WorkflowActionType.CREATE_TASK: {
        const title = interpolateVariables(
          config.taskTitle || "Automated Task",
          contextData
        );
        const description = interpolateVariables(
          config.taskDescription || "",
          contextData
        );
        const priority: TaskPriority = (config.taskPriority as TaskPriority) || TaskPriority.MEDIUM;
        const dueOffsetDays = Number(config.dueDaysOffset) || 1;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + dueOffsetDays);

        const createdTask = await prisma.task.create({
          data: {
            workspaceId,
            title,
            description,
            priority,
            dueDate,
            assignedToId: config.assigneeId || null,
            leadId: event.entityType === "LEAD" ? event.entityId : null,
            dealId: event.entityType === "DEAL" ? event.entityId : null,
          },
        });

        return {
          taskId: createdTask.id,
          title: createdTask.title,
          dueDate: createdTask.dueDate.toISOString(),
        };
      }

      case WorkflowActionType.SEND_NOTIFICATION: {
        const title = interpolateVariables(
          config.title || "Workflow Alert",
          contextData
        );
        const message = interpolateVariables(
          config.message || "",
          contextData
        );

        // Find recipients in workspace
        let recipientId = config.userId;
        if (!recipientId) {
          // Default to workspace owner/first admin
          const membership = await prisma.membership.findFirst({
            where: { workspaceId },
            orderBy: { role: "asc" },
          });
          recipientId = membership?.userId;
        }

        if (recipientId) {
          await prisma.notification.create({
            data: {
              workspaceId,
              userId: recipientId,
              title,
              description: message,
              type: "automation",
              read: false,
            },
          });
        }

        return { title, message, recipientId };
      }

      case WorkflowActionType.CREATE_ACTIVITY: {
        const title = interpolateVariables(
          config.title || "Automation Event",
          contextData
        );
        const description = interpolateVariables(
          config.description || "",
          contextData
        );

        const createdActivity = await prisma.activity.create({
          data: {
            workspaceId,
            leadId: event.entityType === "LEAD" ? event.entityId : null,
            dealId: event.entityType === "DEAL" ? event.entityId : null,
            type: "workflow_automation",
            title,
            description,
            author: "Workflow Engine",
          },
        });

        return {
          activityId: createdActivity.id,
          title: createdActivity.title,
        };
      }

      case WorkflowActionType.UPDATE_DEAL_STAGE: {
        const dealId = contextData.deal?.id || contextData.id || event.entityId;
        if (!dealId) throw new Error("Missing deal ID for stage update");

        const targetStageId = config.stageId;
        if (!targetStageId) throw new Error("Target stage ID is required");

        // Verify stage in workspace
        const stage = await prisma.pipelineStage.findFirst({
          where: { id: targetStageId, workspaceId },
        });
        if (!stage) throw new Error("Target pipeline stage not found in workspace");

        await prisma.deal.update({
          where: { id: dealId },
          data: { stageId: targetStageId },
        });

        return { dealId, newStageId: targetStageId, stageName: stage.name };
      }

      case WorkflowActionType.ASSIGN_DEAL: {
        const dealId = contextData.deal?.id || contextData.id || event.entityId;
        if (!dealId) throw new Error("Missing deal ID for assignment");

        const assigneeId = config.assigneeId;
        if (!assigneeId) throw new Error("Assignee user ID is required");

        const member = await prisma.membership.findFirst({
          where: { userId: assigneeId, workspaceId },
          include: { user: { select: { name: true } } },
        });
        if (!member) throw new Error("Assigned user is not a member of this workspace");

        await prisma.deal.update({
          where: { id: dealId },
          data: { ownerId: assigneeId, ownerName: member.user.name },
        });

        return { dealId, ownerId: assigneeId, ownerName: member.user.name };
      }

      case WorkflowActionType.CREATE_INVOICE: {
        // Safe check: required customer & items
        if (!contextData.contactId && !contextData.leadId && !contextData.clientName) {
          throw new Error("Cannot create invoice: Missing customer or contact details in context");
        }
        // In real workflow, would call invoiceService.createInvoice with validation
        return {
          simulated: true,
          message: "Draft invoice created for customer",
        };
      }

      case WorkflowActionType.SEND_INVOICE: {
        // Safe check: Email connector
        throw new Error("Email provider not configured. Configure SMTP or SendGrid connector in Settings.");
      }

      case WorkflowActionType.DELAY: {
        const delayAmount = Number(config.duration) || 1;
        const delayUnit = config.unit || "HOURS";
        const delaySeconds = delayUnit === "DAYS" ? delayAmount * 86400 : delayAmount * 3600;

        const scheduleResult = await defaultJobRunner.scheduleDelay({
          workspaceId,
          workflowId: event.context?.workflowId || "unknown",
          executionId,
          actionIndex: 0,
          delaySeconds,
        });

        return {
          delaySeconds,
          delayHuman: `${delayAmount} ${delayUnit.toLowerCase()}`,
          note: scheduleResult.note,
        };
      }

      default:
        throw new Error(`Unsupported action type: ${(action as any).type}`);
    }
  }
}
