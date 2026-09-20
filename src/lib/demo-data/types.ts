/**
 * Type definitions for NEXORA CRM Interactive Demo Experience
 */

export type LeadStatus = "New" | "Contacted" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";

export type LeadSource = "Facebook" | "IndiaMART" | "99acres" | "Housing" | "Google Ads" | "Website" | "WhatsApp" | "Custom API";

export interface LeadActivity {
  id: string;
  type: "captured" | "call" | "email" | "meeting" | "status_change" | "note";
  title: string;
  description: string;
  timestamp: string;
  author: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  owner: string;
  value: string;
  valueNumeric: number;
  lastActivity: string;
  createdAt: string;
  tags: string[];
  notes?: string;
  activities: LeadActivity[];
}

export type EmployeeDepartment = "Sales" | "Engineering" | "Operations" | "HR" | "Finance";
export type EmployeeAttendance = "Present" | "Remote" | "On Leave" | "Half Day";

export interface Employee {
  id: string;
  name: string;
  initials: string;
  department: EmployeeDepartment;
  role: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
  attendance: EmployeeAttendance;
  location: string;
  joinDate: string;
  leaveBalance: number;
  dealsClosed?: number;
  revenueGenerated?: string;
}

export type InvoiceStatus = "Paid" | "Pending" | "Overdue";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  customerGst?: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxGst: number;
  total: number;
  status: InvoiceStatus;
  paymentMethod?: string;
  paidAt?: string;
}

export interface DemoIntegration {
  id: string;
  name: string;
  shortName: string;
  category: "LEAD SOURCE" | "MARKETPLACE" | "PROPERTY" | "MARKETING" | "WEBSITE" | "COMMUNICATION" | "DEVELOPER";
  description: string;
  status: "Connected" | "Not Connected";
  leadsSyncedToday: number;
  totalSynced: number;
  lastSync: string;
  iconColor: string;
  avatarBg: string;
  accentBorder: string;
}

export interface DemoNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "lead" | "invoice" | "hr" | "system";
}
