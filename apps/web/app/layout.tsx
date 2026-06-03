import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OperateHQ",
  description: "The operating system for cleaning businesses.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased font-sans selection:bg-accent-500/40">
        {children}
      </body>
    </html>
  );
}
