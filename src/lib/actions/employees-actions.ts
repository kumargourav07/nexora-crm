"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  updateAttendanceSchema,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from "@/lib/validations/crm";
import { Department, AttendanceStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface GetEmployeesParams {
  search?: string;
  department?: Department | "ALL";
  attendance?: AttendanceStatus | "ALL";
}

/**
 * Retrieves employee workforce records scoped strictly to authenticated workspace.
 * Requires `employees.read` permission.
 */
export async function getEmployeesAction(params: GetEmployeesParams = {}) {
  try {
    const { workspaceId, role } = await requirePermission("employees.read");

    const where: Prisma.EmployeeWhereInput = {
      workspaceId,
    };

    if (params.department && params.department !== "ALL") {
      where.department = params.department;
    }

    if (params.attendance && params.attendance !== "ALL") {
      where.attendance = params.attendance;
    }

    if (params.search && params.search.trim() !== "") {
      const search = params.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const [employees, presentCount, totalCount, onLeaveCount] = await Promise.all([
      prisma.employee.findMany({
        where,
        orderBy: { name: "asc" },
      }),
      prisma.employee.count({
        where: { workspaceId, attendance: AttendanceStatus.PRESENT },
      }),
      prisma.employee.count({
        where: { workspaceId },
      }),
      prisma.employee.count({
        where: { workspaceId, attendance: AttendanceStatus.ON_LEAVE },
      }),
    ]);

    const formattedEmployees = employees.map((emp) => {
      const names = emp.name.trim().split(/\s+/);
      const initials = names.length > 1
        ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
        : emp.name.slice(0, 2).toUpperCase();

      return {
        ...emp,
        initials,
        revenueNumeric: Number(emp.revenueGenerated),
        revenueFormatted: `₹${(Number(emp.revenueGenerated) / 100000).toFixed(1)}L`,
        joinDate: emp.joinDate.toISOString().split("T")[0],
        createdAt: emp.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        employees: formattedEmployees,
        currentUserRole: role,
        stats: {
          totalEmployees: totalCount,
          presentToday: presentCount,
          onLeave: onLeaveCount,
          attendanceRate: totalCount > 0 ? `${Math.round((presentCount / totalCount) * 100)}%` : "0%",
        },
      },
    };
  } catch (err) {
    console.error("getEmployeesAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load employee roster",
      data: {
        employees: [],
        stats: { totalEmployees: 0, presentToday: 0, onLeave: 0, attendanceRate: "0%" },
      },
    };
  }
}

/**
 * Creates a new employee record in workspace.
 * Requires `employees.create` permission (Manager/Admin/Owner only).
 */
export async function createEmployeeAction(input: CreateEmployeeInput) {
  try {
    const { workspaceId, userId } = await requirePermission("employees.create");

    const validation = createEmployeeSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid employee data",
      };
    }

    const data = validation.data;

    const newEmp = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          workspaceId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          department: data.department,
          role: data.role,
          status: data.status,
          attendance: data.attendance,
          location: data.location,
          leaveBalance: data.leaveBalance,
          dealsClosed: data.dealsClosed,
          revenueGenerated: new Prisma.Decimal(data.revenueGenerated),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "EMPLOYEE_CREATED",
          entityType: "EMPLOYEE",
          entityId: emp.id,
          metadata: JSON.stringify({
            name: emp.name,
            email: emp.email,
            department: emp.department,
            role: emp.role,
          }),
        },
      });

      return emp;
    });

    revalidatePath("/app/employees");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/settings/audit-log");

    return {
      success: true,
      data: { id: newEmp.id, name: newEmp.name },
    };
  } catch (err) {
    console.error("createEmployeeAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to add employee" };
  }
}

/**
 * Updates an employee's details.
 * Requires `employees.update` permission.
 */
export async function updateEmployeeAction(id: string, input: UpdateEmployeeInput) {
  try {
    const { workspaceId, userId } = await requirePermission("employees.update");

    const validation = updateEmployeeSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid update data",
      };
    }

    const existing = await prisma.employee.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Employee not found in workspace" };
    }

    const data = validation.data;
    const updateData: Prisma.EmployeeUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.attendance !== undefined) updateData.attendance = data.attendance;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.leaveBalance !== undefined) updateData.leaveBalance = data.leaveBalance;
    if (data.dealsClosed !== undefined) updateData.dealsClosed = data.dealsClosed;
    if (data.revenueGenerated !== undefined)
      updateData.revenueGenerated = new Prisma.Decimal(data.revenueGenerated);

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "EMPLOYEE_UPDATED",
          entityType: "EMPLOYEE",
          entityId: id,
          metadata: JSON.stringify({
            employeeName: existing.name,
            updatedFields: Object.keys(data),
          }),
        },
      });
    });

    revalidatePath("/app/employees");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/settings/audit-log");

    return { success: true };
  } catch (err) {
    console.error("updateEmployeeAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update employee" };
  }
}

/**
 * Fast attendance status toggle.
 * Requires `employees.update` permission.
 */
export async function updateAttendanceAction(employeeId: string, attendance: AttendanceStatus) {
  try {
    const { workspaceId, userId } = await requirePermission("employees.update");

    const validation = updateAttendanceSchema.safeParse({ employeeId, attendance });
    if (!validation.success) {
      return { success: false, error: "Invalid attendance status" };
    }

    const existing = await prisma.employee.findFirst({
      where: { id: employeeId, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Employee not found in workspace" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: { attendance },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "EMPLOYEE_ATTENDANCE_UPDATED",
          entityType: "EMPLOYEE",
          entityId: employeeId,
          metadata: JSON.stringify({
            employeeName: existing.name,
            previousAttendance: existing.attendance,
            newAttendance: attendance,
          }),
        },
      });
    });

    revalidatePath("/app/employees");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/settings/audit-log");

    return { success: true };
  } catch (err) {
    console.error("updateAttendanceAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unable to update attendance" };
  }
}

/**
 * Deletes an employee.
 * Requires `employees.delete` permission (Admin/Owner only).
 */
export async function deleteEmployeeAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("employees.delete");

    const existing = await prisma.employee.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Employee not found in workspace" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "EMPLOYEE_DELETED",
          entityType: "EMPLOYEE",
          entityId: id,
          metadata: JSON.stringify({
            employeeName: existing.name,
            department: existing.department,
            role: existing.role,
          }),
        },
      });
    });

    revalidatePath("/app/employees");
    revalidatePath("/app/settings/audit-log");
    return { success: true };
  } catch (err) {
    console.error("deleteEmployeeAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unable to delete employee" };
  }
}
