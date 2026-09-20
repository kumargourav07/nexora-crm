import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#07090e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://nexora.io"),
  title: "NEXORA CRM — One Platform. Your Entire Workflow.",
  description:
    "NEXORA is a 360° CRM that connects lead management, HRMS, invoicing, and external lead sources in one powerful platform.",
  keywords: [
    "CRM",
    "Lead Management",
    "HRMS",
    "Smart Invoicing",
    "Lead Connectors",
    "Sales Pipeline",
    "Business Operations",
    "SaaS",
  ],
  authors: [{ name: "NEXORA Technologies" }],
  creator: "NEXORA Technologies",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nexora.io",
    siteName: "NEXORA CRM",
    title: "NEXORA CRM — One Platform. Your Entire Workflow.",
    description:
      "NEXORA is a 360° CRM that connects lead management, HRMS, invoicing, and external lead sources in one powerful platform.",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEXORA CRM — One Platform. Your Entire Workflow.",
    description:
      "NEXORA is a 360° CRM that connects lead management, HRMS, invoicing, and external lead sources in one powerful platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
