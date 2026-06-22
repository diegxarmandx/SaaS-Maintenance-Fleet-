import type { Metadata } from "next";
import "@fontsource-variable/ibm-plex-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Maintly",
    template: "%s | Maintly",
  },
  description: "Owner-only fleet maintenance, compliance, and document tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
