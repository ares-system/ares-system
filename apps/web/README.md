# ASST web (SEO shell)

Next.js App Router site for **ARES Solana Security Tool (ASST)** public metadata: `metadata` API, **`/sitemap.xml`**, **`/robots.txt`**, and **JSON-LD** (`SoftwareApplication`).

## Setup

```bash
cd apps/web
cp .env.example .env.local
# Set NEXT_PUBLIC_SITE_URL to your production origin (no trailing slash).
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production

- Set **`NEXT_PUBLIC_SITE_URL`** to the deployed origin so `metadataBase`, Open Graph, sitemap, and robots use correct URLs.
- Add **`openGraph.images`** / **`twitter.images`** in `app/layout.tsx` when you have a 1200×630 asset.
- Run Lighthouse (SEO + Core Web Vitals) after deploy.
