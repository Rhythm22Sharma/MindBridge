import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MindBridge",
  description: "AI-powered document study assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-stone-900 text-stone-100 antialiased">{children}</body>
    </html>
  );
}
