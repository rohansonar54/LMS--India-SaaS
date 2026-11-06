import type { Metadata } from "next";
import "./globals.css";
import { SidebarProvider } from "@/context/SidebarContext";

export const metadata: Metadata = {
  title: "LMS - Laundry Management System with QRCode",
  description: "Next.js & MongoDB Laundry Management & QR Tracking POS System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900" suppressHydrationWarning>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </body>
    </html>
  );
}
