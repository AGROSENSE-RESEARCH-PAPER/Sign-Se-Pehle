/** @type {import('next').NextConfig} */
// Static export for GitHub Pages (project site lives under /Sign-Se-Pehle).
// Build for Pages with: NEXT_PUBLIC_BASE_PATH=/Sign-Se-Pehle npm run build
// Plain `npm run build` (no env) keeps the root path, e.g. for Vercel.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;
const nextConfig = {
  output: "export",
  ...(basePath ? { basePath } : {}),
};
module.exports = nextConfig;
