/**
 * Canonical origin for SEO (sitemap, robots, metadataBase).
 * Set NEXT_PUBLIC_SITE_URL in production (no trailing slash).
 */
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/$/, "");
}
