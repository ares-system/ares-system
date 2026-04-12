import { siteUrl } from "./site";

/** schema.org SoftwareApplication — ARES / ASST product surface (marketing site). */
export function softwareApplicationJsonLd(): Record<string, unknown> {
  const url = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ARES Solana Security Tool",
    alternateName: "ASST",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Linux, macOS, Windows",
    description:
      "Assurance Run: commit-bound security manifests, merged SARIF, layered deep agents, and sandboxed CLI for Solana development — not a generic chat audit score.",
    url,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}
