import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "../styles/globals.css";

export const metadata: Metadata = {
  title: "BarrierFree-Web",
  description: "An accessible eBook reader with voice guidance for visually impaired users.",
  applicationName: "BarrierFree-Web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-access-bg text-access-text antialiased">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
