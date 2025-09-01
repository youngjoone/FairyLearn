import fs from 'node:fs';
import path from 'node:path';

const baseUrl = 'http://localhost:5173'; // Replace with your actual production URL

const staticRoutes = [
  '/',
  '/tests',
  '/test',
  '/my/results',
  // Add other static routes here
];

// Function to generate sitemap XML
function generateSitemap(routes: string[]): string {
  const urls = routes.map(route => {
    return `
    <url>
        <loc>${baseUrl}${route}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.7</priority>
    </url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls}
</urlset>`;
}

// Generate sitemap
const sitemapContent = generateSitemap(staticRoutes);

// Define output paths
const distDir = path.resolve(__dirname, '../dist');
const publicDir = path.resolve(__dirname, '../public');
const sitemapFileName = 'sitemap.xml';

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write sitemap to dist and public directories
fs.writeFileSync(path.join(distDir, sitemapFileName), sitemapContent);
fs.writeFileSync(path.join(publicDir, sitemapFileName), sitemapContent);

console.log(`Sitemap generated at ${path.join(distDir, sitemapFileName)} and ${path.join(publicDir, sitemapFileName)}`);
