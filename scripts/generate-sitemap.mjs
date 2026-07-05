import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const baseUrl = 'https://sonpin.netlify.app';
const fallbackProductsPath = path.join(projectRoot, 'src', 'data', 'fallbackProducts.ts');
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml');

const source = fs.readFileSync(fallbackProductsPath, 'utf8');
const productsSection = source.split('export const FALLBACK_PRODUCTS = [')[1] || '';

const slugMatches = [...productsSection.matchAll(/slug:\s*'([^']+)'/g)];
const productSlugs = Array.from(new Set(slugMatches.map((m) => m[1]).filter(Boolean)));

const staticUrls = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/shop', changefreq: 'daily', priority: '0.9' },
  { loc: '/story', changefreq: 'weekly', priority: '0.8' },
  { loc: '/about', changefreq: 'weekly', priority: '0.8' },
  { loc: '/contact', changefreq: 'weekly', priority: '0.7' },
  { loc: '/faq', changefreq: 'weekly', priority: '0.7' },
  { loc: '/shipping', changefreq: 'monthly', priority: '0.6' },
  { loc: '/privacy-policy', changefreq: 'monthly', priority: '0.5' },
  { loc: '/policy', changefreq: 'monthly', priority: '0.5' },
];

const productUrls = productSlugs.map((slug) => ({
  loc: `/product/${slug}`,
  changefreq: 'weekly',
  priority: '0.8',
}));

const allUrls = [...staticUrls, ...productUrls];

const urlXml = allUrls
  .map(
    ({ loc, changefreq, priority }) => `  <url>
    <loc>${baseUrl}${loc}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlXml}
</urlset>
`;

fs.writeFileSync(sitemapPath, xml, 'utf8');
console.log(`sitemap generated: ${allUrls.length} urls`);

