"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { LeadStatus, InvoiceStatus, DealStatus } from "@prisma/client";

/**
 * Computes live dashboard metrics and KPIs using Prisma aggregations.
 * Requires `analytics.read` permission.
 */
export async function getDashboardMetricsAction() {
  try {
    const { workspaceId, role } = await requirePermission("analytics.read");

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [
      totalLeadsCount,
      qualifiedLeadsCount,
      deals,
      recentLeads,
      recentDeals,
      leadsByStatus,
      leadsBySource,
      notifications,
      recentAuditLogs,
    ] = await Promise.all([
      // 1. Total Leads
      prisma.lead.count({ where: { workspaceId } }),

      // 2. Qualified Leads
      prisma.lead.count({
        where: {
          workspaceId,
          status: {
            in: [
              LeadStatus.QUALIFIED,
              LeadStatus.PROPOSAL,
              LeadStatus.NEGOTIATION,
              LeadStatus.WON,
            ],
          },
        },
      }),

      // 3. All Workspace Deals for KPI math
      prisma.deal.findMany({
        where: { workspaceId },
        select: {
          value: true,
          probability: true,
          status: true,
          expectedCloseDate: true,
        },
      }),

      // 4. Recent 5 Leads
      prisma.lead.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          activities: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
      }),

      // 5. Recent 5 Deals
      prisma.deal.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          stage: { select: { name: true, color: true } },
          company: { select: { name: true } },
        },
      }),

      // 6. Distribution by Status
      prisma.lead.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: true,
        _sum: { value: true },
      }),

      // 7. Distribution by Source
      prisma.lead.groupBy({
        by: ["source"],
        where: { workspaceId },
        _count: true,
      }),

      // 8. Unread notifications count
      prisma.notification.count({
        where: { workspaceId, read: false },
      }),

      // 9. Recent Workspace Audit Activity
      prisma.auditLog.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),
    ]);

    // Deal KPI calculations
    let openPipeline = 0;
    let weightedPipeline = 0;
    let wonRevenue = 0;
    let wonDealsCount = 0;
    let lostDealsCount = 0;
    let openDealsCount = 0;
    let expectedClosuresThisMonth = 0;

    deals.forEach((d) => {
      const val = Number(d.value);
      if (d.status === DealStatus.OPEN) {
        openPipeline += val;
        weightedPipeline += Math.round((val * d.probability) / 100);
        openDealsCount += 1;

        if (
          d.expectedCloseDate &&
          d.expectedCloseDate >= currentMonthStart &&
          d.expectedCloseDate <= currentMonthEnd
        ) {
          expectedClosuresThisMonth += 1;
        }
      } else if (d.status === DealStatus.WON) {
        wonRevenue += val;
        wonDealsCount += 1;
      } else if (d.status === DealStatus.LOST) {
        lostDealsCount += 1;
      }
    });

    const totalClosed = wonDealsCount + lostDealsCount;
    const winRate = totalClosed > 0 ? ((wonDealsCount / totalClosed) * 100).toFixed(1) : null;
    const avgDealSize = wonDealsCount > 0 ? Math.round(wonRevenue / wonDealsCount) : 0;

    return {
      success: true,
      data: {
        currentUserRole: role,
        kpis: {
          totalPipeline: `₹${(openPipeline / 100000).toFixed(1)}L`,
          totalPipelineFull: `₹${openPipeline.toLocaleString("en-IN")}`,
          weightedPipeline: `₹${(weightedPipeline / 100000).toFixed(1)}L`,
          weightedPipelineFull: `₹${weightedPipeline.toLocaleString("en-IN")}`,
          wonRevenue: `₹${(wonRevenue / 100000).toFixed(1)}L`,
          wonRevenueFull: `₹${wonRevenue.toLocaleString("en-IN")}`,
          openDeals: openDealsCount.toString(),
          winRate: winRate ? `${winRate}%` : "N/A",
          avgDealSize: `₹${(avgDealSize / 100000).toFixed(1)}L`,
          avgDealSizeFull: `₹${avgDealSize.toLocaleString("en-IN")}`,
          expectedClosures: expectedClosuresThisMonth.toString(),
          totalLeads: totalLeadsCount.toString(),
          qualifiedLeads: qualifiedLeadsCount.toString(),
        },
        recentDeals: recentDeals.map((d) => ({
          id: d.id,
          name: d.name,
          valueFormatted: `₹${Number(d.value).toLocaleString("en-IN")}`,
          status: d.status,
          stageName: d.stage.name,
          stageColor: d.stage.color,
          companyName: d.company?.name || null,
          createdAt: d.createdAt.toISOString(),
        })),
        recentLeads: recentLeads.map((l) => ({
          ...l,
          valueNumeric: Number(l.value),
          valueFormatted: `₹${(Number(l.value) / 100000).toFixed(1)}L`,
          tags: typeof l.tags === "string" ? JSON.parse(l.tags || "[]") : l.tags,
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
          activities: l.activities.map((a) => ({
            id: a.id,
            type: a.type,
            title: a.title,
            description: a.description,
            timestamp: a.createdAt.toISOString(),
            author: a.author,
          })),
        })),
        leadsByStatus: leadsByStatus.map((s) => ({
          status: s.status,
          count: s._count,
          totalValue: Number(s._sum.value || 0),
        })),
        leadsBySource: leadsBySource.map((src) => ({
          source: src.source,
          count: src._count,
        })),
        recentActivity: recentAuditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          userName: log.user?.name || "System",
          createdAt: log.createdAt.toISOString(),
        })),
        unreadNotificationsCount: notifications,
      },
    };
  } catch (err) {
    console.error("getDashboardMetricsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to compute dashboard metrics",
    };
  }
}

/**
 * Returns detailed analytics dataset for the dedicated Analytics module.
 * Requires `analytics.read` permission.
 */
export async function getAnalyticsDetailAction() {
  try {
    const { workspaceId, role } = await requirePermission("analytics.read");

    const [
      totalLeads,
      wonLeads,
      lostLeads,
      totalInvoices,
      paidInvoices,
      employees,
      statusGroups,
      sourceGroups,
      deals,
    ] = await Promise.all([
      prisma.lead.count({ where: { workspaceId } }),
      prisma.lead.count({ where: { workspaceId, status: LeadStatus.WON } }),
      prisma.lead.count({ where: { workspaceId, status: LeadStatus.LOST } }),
      prisma.invoice.aggregate({
        where: { workspaceId },
        _sum: { total: true },
        _count: true,
      }),
      prisma.invoice.aggregate({
        where: { workspaceId, status: InvoiceStatus.PAID },
        _sum: { total: true },
        _count: true,
      }),
      prisma.employee.findMany({
        where: { workspaceId },
        orderBy: { revenueGenerated: "desc" },
        take: 5,
      }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: true,
        _sum: { value: true },
      }),
      prisma.lead.groupBy({
        by: ["source"],
        where: { workspaceId },
        _count: true,
        _sum: { value: true },
      }),
      prisma.deal.findMany({
        where: { workspaceId },
        select: { value: true, probability: true, status: true },
      }),
    ]);

    let openPipeline = 0;
    let weightedPipeline = 0;
    deals.forEach((d) => {
      if (d.status === DealStatus.OPEN) {
        const val = Number(d.value);
        openPipeline += val;
        weightedPipeline += Math.round((val * d.probability) / 100);
      }
    });

    return {
      success: true,
      data: {
        currentUserRole: role,
        overview: {
          totalLeads,
          wonLeads,
          lostLeads,
          winRate: totalLeads > 0 ? `${((wonLeads / totalLeads) * 100).toFixed(1)}%` : "0%",
          totalInvoicedAmount: Number(totalInvoices._sum.total || 0),
          paidInvoicedAmount: Number(paidInvoices._sum.total || 0),
          pipelineValue: openPipeline,
          weightedPipeline,
        },
        statusDistribution: statusGroups.map((s) => ({
          status: s.status,
          count: s._count,
          value: Number(s._sum.value || 0),
        })),
        sourceDistribution: sourceGroups.map((s) => ({
          source: s.source,
          count: s._count,
          value: Number(s._sum.value || 0),
        })),
        topPerformers: employees.map((e) => ({
          name: e.name,
          department: e.department,
          dealsClosed: e.dealsClosed,
          revenueGenerated: Number(e.revenueGenerated),
          revenueFormatted: `₹${(Number(e.revenueGenerated) / 100000).toFixed(1)}L`,
        })),
      },
    };
  } catch (err) {
    console.error("getAnalyticsDetailAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load analytics detail",
    };
  }
}
