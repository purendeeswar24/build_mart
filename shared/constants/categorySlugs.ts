export const CATEGORY_SLUGS = [
  'plywood-boards',
  'building-materials',
  'ceiling-solutions',
  'electricals',
  'adhesive-bonding',
  'kitchen-fixtures',
  'lighting',
  'hardware-accessories',
  'paints',
  'sanitary-bath',
  'industrial-steel',
  'water-proofing',
  'tools',
  'tiles-accessories',
  'plumbing-pipes',
  'home-kitchen',
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];
