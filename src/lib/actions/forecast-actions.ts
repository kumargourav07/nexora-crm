"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { DealStatus, Prisma } from "@prisma/client";

export interface ForecastFilterParams {
  pipelineId?: string;
  ownerId?: string;
  stageId?: string;
  dateRangePreset?: "today" | "this_week" | "this_month" | "this_quarter" | "this_year" | "all";
  startDate?: string;
  endDate?: string;
}

/**
 * Calculates start and end Date objects based on preset.
 */
function getDateRangeBounds(preset?: string, start?: string, end?: string) {
  const now = new Date();
  if (start && end) {
    return { gte: new Date(start), lte: new Date(end) };
  }

  if (preset === "today") {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const e = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { gte: s, lte: e };
  }

  if (preset === "this_week") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const s = new Date(now.setDate(diff));
    s.setHours(0, 0, 0, 0);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return { gte: s, lte: e };
  }

  if (preset === "this_month") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { gte: s, lte: e };
  }

  if (preset === "this_quarter") {
    const quarter = Math.floor(now.getMonth() / 3);
    const s = new Date(now.getFullYear(), quarter * 3, 1);
    const e = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
    return { gte: s, lte: e };
  }

  if (preset === "this_year") {
    const s = new Date(now.getFullYear(), 0, 1);
    const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { gte: s, lte: e };
  }

  return undefined;
}

/**
 * Aggregates live sales forecasting data strictly scoped to workspace.
 */
export async function getForecastMetricsAction(params: ForecastFilterParams = {}) {
  try {
    const { workspaceId, role } = await requirePermission("forecast.read");

    const where: Prisma.DealWhereInput = {
      workspaceId,
    };

    if (params.pipelineId) {
      where.pipelineId = params.pipelineId;
    }

    if (params.ownerId) {
      where.ownerId = params.ownerId;
    }

    if (params.stageId) {
      where.stageId = params.stageId;
    }

    const dateFilter = getDateRangeBounds(params.dateRangePreset, params.startDate, params.endDate);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    // Load all matching deals for accurate aggregation
    const deals = await prisma.deal.findMany({
      where,
      include: {
        stage: { select: { id: true, name: true, color: true, order: true, isWon: true, isLost: true } },
        pipeline: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { expectedCloseDate: "asc" },
    });

    let openPipeline = 0;
    let weightedPipeline = 0;
    let wonRevenue = 0;
    let lostRevenue = 0;
    let openDealsCount = 0;
    let wonDealsCount = 0;
    let lostDealsCount = 0;

    // Monthly breakdown map
    const monthMap = new Map<string, { total: number; weighted: number; count: number }>();

    // Close date cohorts
    const closeDateCohorts = {
      thisWeek: { total: 0, weighted: 0, count: 0, deals: [] as any[] },
      thisMonth: { total: 0, weighted: 0, count: 0, deals: [] as any[] },
      nextMonth: { total: 0, weighted: 0, count: 0, deals: [] as any[] },
      later: { total: 0, weighted: 0, count: 0, deals: [] as any[] },
      noDate: { total: 0, weighted: 0, count: 0, deals: [] as any[] },
    };

    // Owner breakdown map
    const ownerMap = new Map<
      string,
      {
        ownerName: string;
        openPipeline: number;
        weightedPipeline: number;
        wonRevenue: number;
        wonDeals: number;
        lostDeals: number;
        openDeals: number;
      }
    >();

    // Stage breakdown map
    const stageMap = new Map<
      string,
      {
        stageName: string;
        color: string;
        order: number;
        dealsCount: number;
        value: number;
        weightedValue: number;
      }
    >();

    // Pipeline breakdown map
    const pipelineMap = new Map<
      string,
      {
        pipelineName: string;
        openValue: number;
        weightedValue: number;
        wonValue: number;
        dealsCount: number;
      }
    >();

    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);

    let expectedClosuresThisMonth = 0;

    deals.forEach((d) => {
      const value = Number(d.value);
      const prob = d.probability;
      const weighted = Math.round((value * prob) / 100);
      const ownerName = d.owner?.name || d.ownerName || "Unassigned";
      const pipelineName = d.pipeline.name;
      const stageName = d.stage.name;

      // Pipeline map init
      if (!pipelineMap.has(d.pipelineId)) {
        pipelineMap.set(d.pipelineId, {
          pipelineName,
          openValue: 0,
          weightedValue: 0,
          wonValue: 0,
          dealsCount: 0,
        });
      }
      const pEntry = pipelineMap.get(d.pipelineId)!;
      pEntry.dealsCount += 1;

      // Owner map init
      const ownerKey = d.ownerId || ownerName;
      if (!ownerMap.has(ownerKey)) {
        ownerMap.set(ownerKey, {
          ownerName,
          openPipeline: 0,
          weightedPipeline: 0,
          wonRevenue: 0,
          wonDeals: 0,
          lostDeals: 0,
          openDeals: 0,
        });
      }
      const oEntry = ownerMap.get(ownerKey)!;

      // Stage map init
      if (!stageMap.has(d.stageId)) {
        stageMap.set(d.stageId, {
          stageName,
          color: d.stage.color || "#3B82F6",
          order: d.stage.order,
          dealsCount: 0,
          value: 0,
          weightedValue: 0,
        });
      }
      const sEntry = stageMap.get(d.stageId)!;

      if (d.status === DealStatus.OPEN) {
        openPipeline += value;
        weightedPipeline += weighted;
        openDealsCount += 1;
        pEntry.openValue += value;
        pEntry.weightedValue += weighted;
        oEntry.openPipeline += value;
        oEntry.weightedPipeline += weighted;
        oEntry.openDeals += 1;
        sEntry.dealsCount += 1;
        sEntry.value += value;
        sEntry.weightedValue += weighted;

        // Group by expected close date for open deals
        let monthKey = "No Close Date";
        const dealSummary = {
          id: d.id,
          name: d.name,
          value,
          valueFormatted: `₹${value.toLocaleString("en-IN")}`,
          probability: d.probability,
          weighted,
          weightedFormatted: `₹${weighted.toLocaleString("en-IN")}`,
          ownerName,
          stageName,
          expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.toISOString() : null,
          companyName: d.company?.name || null,
        };

        if (d.expectedCloseDate) {
          const date = new Date(d.expectedCloseDate);
          monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

          if (date <= endOfWeek) {
            closeDateCohorts.thisWeek.total += value;
            closeDateCohorts.thisWeek.weighted += weighted;
            closeDateCohorts.thisWeek.count += 1;
            closeDateCohorts.thisWeek.deals.push(dealSummary);
          } else if (date <= endOfMonth) {
            closeDateCohorts.thisMonth.total += value;
            closeDateCohorts.thisMonth.weighted += weighted;
            closeDateCohorts.thisMonth.count += 1;
            closeDateCohorts.thisMonth.deals.push(dealSummary);
          } else if (date <= endOfNextMonth) {
            closeDateCohorts.nextMonth.total += value;
            closeDateCohorts.nextMonth.weighted += weighted;
            closeDateCohorts.nextMonth.count += 1;
            closeDateCohorts.nextMonth.deals.push(dealSummary);
          } else {
            closeDateCohorts.later.total += value;
            closeDateCohorts.later.weighted += weighted;
            closeDateCohorts.later.count += 1;
            closeDateCohorts.later.deals.push(dealSummary);
          }

          if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
            expectedClosuresThisMonth += 1;
          }
        } else {
          closeDateCohorts.noDate.total += value;
          closeDateCohorts.noDate.weighted += weighted;
          closeDateCohorts.noDate.count += 1;
          closeDateCohorts.noDate.deals.push(dealSummary);
        }

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { total: 0, weighted: 0, count: 0 });
        }
        const mEntry = monthMap.get(monthKey)!;
        mEntry.total += value;
        mEntry.weighted += weighted;
        mEntry.count += 1;
      } else if (d.status === DealStatus.WON) {
        wonRevenue += value;
        wonDealsCount += 1;
        pEntry.wonValue += value;
        oEntry.wonRevenue += value;
        oEntry.wonDeals += 1;
      } else if (d.status === DealStatus.LOST) {
        lostRevenue += value;
        lostDealsCount += 1;
        oEntry.lostDeals += 1;
      }
    });

    const totalClosed = wonDealsCount + lostDealsCount;
    const winRate = totalClosed > 0 ? ((wonDealsCount / totalClosed) * 100).toFixed(1) : null;
    const avgDealSize = wonDealsCount > 0 ? Math.round(wonRevenue / wonDealsCount) : 0;

    const monthlyBreakdown = Array.from(monthMap.entries()).map(([month, stats]) => ({
      month,
      totalPipeline: stats.total,
      totalPipelineFormatted: `₹${stats.total.toLocaleString("en-IN")}`,
      weightedPipeline: stats.weighted,
      weightedPipelineFormatted: `₹${stats.weighted.toLocaleString("en-IN")}`,
      dealsCount: stats.count,
    }));

    const ownerBreakdown = Array.from(ownerMap.entries()).map(([key, stats]) => {
      const closed = stats.wonDeals + stats.lostDeals;
      const rate = closed > 0 ? ((stats.wonDeals / closed) * 100).toFixed(1) : "N/A";
      return {
        id: key,
        ownerName: stats.ownerName,
        openPipeline: stats.openPipeline,
        openPipelineFormatted: `₹${stats.openPipeline.toLocaleString("en-IN")}`,
        weightedPipeline: stats.weightedPipeline,
        weightedPipelineFormatted: `₹${stats.weightedPipeline.toLocaleString("en-IN")}`,
        wonRevenue: stats.wonRevenue,
        wonRevenueFormatted: `₹${stats.wonRevenue.toLocaleString("en-IN")}`,
        wonDeals: stats.wonDeals,
        lostDeals: stats.lostDeals,
        openDeals: stats.openDeals,
        winRate: rate,
      };
    });

    const stageBreakdown = Array.from(stageMap.values())
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        stageName: s.stageName,
        color: s.color,
        dealsCount: s.dealsCount,
        value: s.value,
        valueFormatted: `₹${s.value.toLocaleString("en-IN")}`,
        weightedValue: s.weightedValue,
        weightedValueFormatted: `₹${s.weightedValue.toLocaleString("en-IN")}`,
      }));

    const pipelineBreakdown = Array.from(pipelineMap.entries()).map(([id, p]) => ({
      id,
      pipelineName: p.pipelineName,
      openValue: p.openValue,
      openValueFormatted: `₹${p.openValue.toLocaleString("en-IN")}`,
      weightedValue: p.weightedValue,
      weightedValueFormatted: `₹${p.weightedValue.toLocaleString("en-IN")}`,
      wonValue: p.wonValue,
      wonValueFormatted: `₹${p.wonValue.toLocaleString("en-IN")}`,
      dealsCount: p.dealsCount,
    }));

    return {
      success: true,
      data: {
        kpis: {
          totalPipeline: openPipeline,
          totalPipelineFormatted: `₹${openPipeline.toLocaleString("en-IN")}`,
          weightedPipeline,
          weightedPipelineFormatted: `₹${weightedPipeline.toLocaleString("en-IN")}`,
          wonRevenue,
          wonRevenueFormatted: `₹${wonRevenue.toLocaleString("en-IN")}`,
          lostRevenue,
          lostRevenueFormatted: `₹${lostRevenue.toLocaleString("en-IN")}`,
          openDealsCount,
          wonDealsCount,
          lostDealsCount,
          winRate: winRate ? `${winRate}%` : "N/A",
          avgDealSize,
          avgDealSizeFormatted: `₹${avgDealSize.toLocaleString("en-IN")}`,
          expectedClosuresThisMonth,
        },
        cohorts: {
          thisWeek: {
            ...closeDateCohorts.thisWeek,
            totalFormatted: `₹${closeDateCohorts.thisWeek.total.toLocaleString("en-IN")}`,
            weightedFormatted: `₹${closeDateCohorts.thisWeek.weighted.toLocaleString("en-IN")}`,
          },
          thisMonth: {
            ...closeDateCohorts.thisMonth,
            totalFormatted: `₹${closeDateCohorts.thisMonth.total.toLocaleString("en-IN")}`,
            weightedFormatted: `₹${closeDateCohorts.thisMonth.weighted.toLocaleString("en-IN")}`,
          },
          nextMonth: {
            ...closeDateCohorts.nextMonth,
            totalFormatted: `₹${closeDateCohorts.nextMonth.total.toLocaleString("en-IN")}`,
            weightedFormatted: `₹${closeDateCohorts.nextMonth.weighted.toLocaleString("en-IN")}`,
          },
          later: {
            ...closeDateCohorts.later,
            totalFormatted: `₹${closeDateCohorts.later.total.toLocaleString("en-IN")}`,
            weightedFormatted: `₹${closeDateCohorts.later.weighted.toLocaleString("en-IN")}`,
          },
          noDate: {
            ...closeDateCohorts.noDate,
            totalFormatted: `₹${closeDateCohorts.noDate.total.toLocaleString("en-IN")}`,
            weightedFormatted: `₹${closeDateCohorts.noDate.weighted.toLocaleString("en-IN")}`,
          },
        },
        monthlyBreakdown,
        ownerBreakdown,
        stageBreakdown,
        pipelineBreakdown,
        totalDeals: deals.length,
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getForecastMetricsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to calculate forecast metrics",
      data: null,
    };
  }
}

/**
 * Generates comprehensive sales analytics report for `/app/reports/sales`.
 */
export async function getSalesReportAction(params: ForecastFilterParams = {}) {
  try {
    const { workspaceId, role } = await requirePermission("reports.read");

    const where: Prisma.DealWhereInput = {
      workspaceId,
    };

    if (params.pipelineId) {
      where.pipelineId = params.pipelineId;
    }

    if (params.ownerId) {
      where.ownerId = params.ownerId;
    }

    if (params.stageId) {
      where.stageId = params.stageId;
    }

    const dateFilter = getDateRangeBounds(params.dateRangePreset, params.startDate, params.endDate);
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const deals = await prisma.deal.findMany({
      where,
      include: {
        stage: { select: { id: true, name: true, color: true } },
        pipeline: { select: { id: true, name: true } },
        contact: { select: { firstName: true, lastName: true } },
        company: { select: { name: true } },
        owner: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let wonRevenue = 0;
    let openPipeline = 0;
    let weightedPipeline = 0;
    let lostValue = 0;
    let wonCount = 0;
    let lostCount = 0;
    let openCount = 0;

    const lostReasonCounts = new Map<string, number>();

    deals.forEach((d) => {
      const val = Number(d.value);
      if (d.status === DealStatus.WON) {
        wonRevenue += val;
        wonCount += 1;
      } else if (d.status === DealStatus.LOST) {
        lostValue += val;
        lostCount += 1;
        const reason = d.lostReason || "OTHER";
        lostReasonCounts.set(reason, (lostReasonCounts.get(reason) || 0) + 1);
      } else {
        openPipeline += val;
        weightedPipeline += Math.round((val * d.probability) / 100);
        openCount += 1;
      }
    });

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? ((wonCount / totalClosed) * 100).toFixed(1) : "N/A";
    const avgDealSize = wonCount > 0 ? Math.round(wonRevenue / wonCount) : 0;

    const lostReasons = Array.from(lostReasonCounts.entries()).map(([reason, count]) => ({
      reason,
      count,
      percentage: lostCount > 0 ? Math.round((count / lostCount) * 100) : 0,
    }));

    return {
      success: true,
      data: {
        summary: {
          wonRevenue,
          wonRevenueFormatted: `₹${wonRevenue.toLocaleString("en-IN")}`,
          openPipeline,
          openPipelineFormatted: `₹${openPipeline.toLocaleString("en-IN")}`,
          weightedPipeline,
          weightedPipelineFormatted: `₹${weightedPipeline.toLocaleString("en-IN")}`,
          lostValue,
          lostValueFormatted: `₹${lostValue.toLocaleString("en-IN")}`,
          wonCount,
          lostCount,
          openCount,
          winRate,
          avgDealSize,
          avgDealSizeFormatted: `₹${avgDealSize.toLocaleString("en-IN")}`,
          totalDeals: deals.length,
        },
        lostReasons,
        deals: deals.slice(0, 50).map((d) => ({
          id: d.id,
          name: d.name,
          valueFormatted: `₹${Number(d.value).toLocaleString("en-IN")}`,
          probability: d.probability,
          status: d.status,
          contactName: d.contact ? [d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") : null,
          companyName: d.company?.name || null,
          ownerName: d.owner?.name || d.ownerName,
          stageName: d.stage.name,
          createdAt: d.createdAt.toISOString(),
        })),
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getSalesReportAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load sales report",
      data: null,
    };
  }
}
