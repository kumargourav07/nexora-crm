/**
 * Global Type Definitions for NEXORA CRM
 */

export interface NavItem {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface FeatureItem {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  badge?: string;
}

export interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  iconPath?: string;
}
