import { WorkflowTriggerType } from "@/lib/validations/automations";

export interface EventExecutionContext {
  source: "USER" | "API" | "CONNECTOR" | "WORKFLOW";
  workflowId?: string;
  executionId?: string;
  depth?: number;
  correlationId?: string;
}

export interface DomainEvent<T = Record<string, any>> {
  id: string;
  workspaceId: string;
  type: WorkflowTriggerType;
  entityType: "LEAD" | "CONTACT" | "DEAL" | "INVOICE" | "PAYMENT" | "TASK";
  entityId: string;
  payload: T;
  timestamp: string;
  context: EventExecutionContext;
}

export type EventSubscriber = (event: DomainEvent) => Promise<void>;

class CentralEventBus {
  private subscribers: Map<WorkflowTriggerType | "*", Set<EventSubscriber>> =
    new Map();

  /**
   * Subscribes a handler to a specific domain event trigger or wildcard (*).
   * Returns an unsubscribe function.
   */
  public subscribe(
    triggerType: WorkflowTriggerType | "*",
    subscriber: EventSubscriber
  ): () => void {
    if (!this.subscribers.has(triggerType)) {
      this.subscribers.set(triggerType, new Set());
    }
    this.subscribers.get(triggerType)!.add(subscriber);

    return () => {
      const set = this.subscribers.get(triggerType);
      if (set) {
        set.delete(subscriber);
      }
    };
  }

  /**
   * Publishes a domain event asynchronously.
   * Catches handler exceptions so caller transactions / HTTP requests are not broken.
   */
  public async publish(event: DomainEvent): Promise<void> {
    const handlers = new Set<EventSubscriber>();

    // Add specific trigger handlers
    const specific = this.subscribers.get(event.type);
    if (specific) {
      specific.forEach((h) => handlers.add(h));
    }

    // Add wildcard handlers
    const wildcard = this.subscribers.get("*");
    if (wildcard) {
      wildcard.forEach((h) => handlers.add(h));
    }

    if (handlers.size === 0) {
      return;
    }

    // Execute handlers in parallel
    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(
          `[EventBus] Handler failed for event ${event.type} (${event.id}):`,
          err
        );
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Creates a standardized domain event payload helper.
   */
  public createEvent<T = Record<string, any>>(params: {
    workspaceId: string;
    type: WorkflowTriggerType;
    entityType: "LEAD" | "CONTACT" | "DEAL" | "INVOICE" | "PAYMENT" | "TASK";
    entityId: string;
    payload: T;
    context?: Partial<EventExecutionContext>;
  }): DomainEvent<T> {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      workspaceId: params.workspaceId,
      type: params.type,
      entityType: params.entityType,
      entityId: params.entityId,
      payload: params.payload,
      timestamp: new Date().toISOString(),
      context: {
        source: params.context?.source || "USER",
        depth: params.context?.depth ?? 1,
        workflowId: params.context?.workflowId,
        executionId: params.context?.executionId,
        correlationId: params.context?.correlationId || `corr_${Date.now()}`,
      },
    };
  }
}

// Global Singleton
export const eventBus = new CentralEventBus();
