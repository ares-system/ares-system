import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import { softwareApplicationJsonLd } from "@/lib/json-ld";
import "./globals.css";

const base = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(base),
  title: {
    default: "ARES Solana Security Tool (ASST)",
    template: "%s | ASST",
  },
  description:
    "Assurance Run for Solana: commit-bound manifests, merged SARIF, layered deep agents, sandboxed CLI — reproducible security evidence for developers.",
  keywords: [
    "Solana",
    "security",
    "SARIF",
    "Assurance Run",
    "ASST",
    "ARES",
    "static analysis",
    "CI",
  ],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: base,
    siteName: "ARES Solana Security Tool",
    title: "ARES Solana Security Tool (ASST)",
    description:
      "Reproducible security orchestration for Solana: manifests, SARIF, deep agents.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARES Solana Security Tool (ASST)",
    description:
      "Commit-bound assurance manifests and merged SARIF for Solana development.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = softwareApplicationJsonLd();
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
