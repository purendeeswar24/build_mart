/**
 * Catalog integrity — parses seedCatalog.ts as text (no image requires).
 * Run: node src/scripts/catalogCheck.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(__dirname, '../data/seedCatalog.ts'), 'utf8');

const errors = [];

const catIds = [...src.matchAll(/cat\('([^']+)'/g)].map((m) => m[1]);
const productBlocks = [...src.matchAll(/id:\s*'(p\d+)'[\s\S]*?category_id:\s*'([^']+)'/g)];
const productIds = productBlocks.map((m) => m[1]);
const productCats = Object.fromEntries(productBlocks.map((m) => [m[1], m[2]]));

// Match compact variant object lines
const variantRows = [
  ...src.matchAll(/\{\s*id:\s*'(v[^']+)',\s*product_id:\s*'([^']+)'[\s\S]*?sku:\s*'([^']+)'/g),
];

const catSet = new Set(catIds);
const productSet = new Set(productIds);
const variantIds = new Set();
const skus = new Set();

for (const [pid, cid] of Object.entries(productCats)) {
  if (!catSet.has(cid)) errors.push(`Product ${pid} missing category ${cid}`);
}

for (const m of variantRows) {
  const [, vid, pid, sku] = m;
  if (!productSet.has(pid)) errors.push(`Variant ${vid} missing product ${pid}`);
  if (variantIds.has(vid)) errors.push(`Duplicate variant ${vid}`);
  variantIds.add(vid);
  if (skus.has(sku)) errors.push(`Duplicate SKU ${sku}`);
  skus.add(sku);
}

for (const pid of productIds) {
  const has = variantRows.some((m) => m[2] === pid);
  if (!has) errors.push(`Product ${pid} has no variants`);
}

const kitchenCats = [
  'c-kitchen',
  'c-kitchen-sink',
  'c-kitchen-faucet',
  'c-kitchen-chimney',
  'c-kitchen-storage',
  'c-kitchen-appliances',
  'c-home',
  'c-cpvc',
  'c-upvc',
  'c-plumbing',
];
const kitchenCount = Object.values(productCats).filter((c) => kitchenCats.includes(c)).length;

console.log('\nBuildMart catalog integrity\n' + '='.repeat(40));
console.log(`Categories: ${catIds.length}`);
console.log(`Products:   ${productIds.length}`);
console.log(`Variants:   ${variantRows.length}`);
console.log(`Kitchen+:   ${kitchenCount}`);

if (errors.length) {
  console.log(`\nFAIL (${errors.length}):`);
  errors.forEach((e) => console.log(`  - ${e}`));
  process.exit(1);
}
if (kitchenCount < 5) {
  console.log('\nFAIL: expected kitchen/plumbing products');
  process.exit(1);
}
console.log('\nPASS  Catalog integrity OK');
