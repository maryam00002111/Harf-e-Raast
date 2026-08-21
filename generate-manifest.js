/**
 * HARF-E-RAAST — BUILD MANIFEST GENERATOR
 *
 * Run this as part of your Netlify build command:
 *   node generate-manifest.js
 *
 * It scans the _products/, _collections/, and _journal/ folders
 * and writes her-manifest.json to the repo root.
 *
 * The frontend cms-render.js fetches this manifest to know which
 * JSON files exist — because browsers cannot list directories on
 * static hosts.
 *
 * Add to netlify.toml build command:
 *   command = "node generate-manifest.js"
 */

const fs   = require('fs');
const path = require('path');

function listJSON(dir) {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .sort();
  } catch { return []; }
}

const manifest = {
  products:    listJSON('_products'),
  collections: listJSON('_collections'),
  journal:     listJSON('_journal'),
  pages:       listJSON('_pages'),
  generated:   new Date().toISOString(),
};

fs.writeFileSync(
  path.join(__dirname, 'her-manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('✓ her-manifest.json written');
console.log(`  products:    ${manifest.products.length}`);
console.log(`  collections: ${manifest.collections.length}`);
console.log(`  journal:     ${manifest.journal.length}`);
console.log(`  pages:       ${manifest.pages.length}`);
