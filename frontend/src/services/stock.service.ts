import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_VARIANTS } from '../data/seedCatalog';

const STOCK_KEY = '@buildmart/stock_overrides';

type StockMap = Record<string, number>;

let memory: StockMap | null = null;

function seedMap(): StockMap {
  const m: StockMap = {};
  for (const v of SEED_VARIANTS) m[v.id] = v.stock_qty;
  return m;
}

async function load(): Promise<StockMap> {
  if (memory) return memory;
  const raw = await AsyncStorage.getItem(STOCK_KEY);
  const overrides = raw ? (JSON.parse(raw) as StockMap) : {};
  memory = { ...seedMap(), ...overrides };
  return memory;
}

async function persist(map: StockMap) {
  memory = map;
  const overrides: StockMap = {};
  const base = seedMap();
  for (const [id, qty] of Object.entries(map)) {
    if (base[id] !== qty) overrides[id] = qty;
  }
  await AsyncStorage.setItem(STOCK_KEY, JSON.stringify(overrides));
}

export type StockIssue = {
  variantId: string;
  productId: string;
  variantLabel: string;
  requested: number;
  available: number;
};

export const stockService = {
  async getQty(variantId: string): Promise<number> {
    const map = await load();
    return map[variantId] ?? 0;
  },

  findVariant(productId: string, variantLabel: string) {
    return SEED_VARIANTS.find(
      (v) => v.product_id === productId && v.variant_label === variantLabel,
    );
  },

  async validateLines(
    lines: { productId: string; variantLabel: string; quantity: number }[],
  ): Promise<StockIssue[]> {
    const map = await load();
    const issues: StockIssue[] = [];
    for (const line of lines) {
      const v = this.findVariant(line.productId, line.variantLabel);
      if (!v) {
        issues.push({
          variantId: 'unknown',
          productId: line.productId,
          variantLabel: line.variantLabel,
          requested: line.quantity,
          available: 0,
        });
        continue;
      }
      const available = map[v.id] ?? 0;
      if (available < line.quantity) {
        issues.push({
          variantId: v.id,
          productId: line.productId,
          variantLabel: line.variantLabel,
          requested: line.quantity,
          available,
        });
      }
    }
    return issues;
  },

  /**
   * Atomic-ish local decrement: re-check then subtract in one load/persist.
   * Mirrors the Supabase RPC used in production (see docs/supabase/phase6_schema.sql).
   */
  async decrementLines(
    lines: { productId: string; variantLabel: string; quantity: number }[],
  ): Promise<{ ok: true } | { ok: false; issues: StockIssue[] }> {
    const map = await load();
    const issues: StockIssue[] = [];
    const planned: { id: string; qty: number; productId: string; variantLabel: string }[] = [];

    for (const line of lines) {
      const v = this.findVariant(line.productId, line.variantLabel);
      if (!v) {
        issues.push({
          variantId: 'unknown',
          productId: line.productId,
          variantLabel: line.variantLabel,
          requested: line.quantity,
          available: 0,
        });
        continue;
      }
      const available = map[v.id] ?? 0;
      if (available < line.quantity) {
        issues.push({
          variantId: v.id,
          productId: line.productId,
          variantLabel: line.variantLabel,
          requested: line.quantity,
          available,
        });
      } else {
        planned.push({
          id: v.id,
          qty: line.quantity,
          productId: line.productId,
          variantLabel: line.variantLabel,
        });
      }
    }

    if (issues.length) return { ok: false, issues };

    for (const p of planned) {
      map[p.id] = (map[p.id] ?? 0) - p.qty;
    }
    await persist(map);
    return { ok: true };
  },

  /** Demo helper — set a variant to 0 to test checkout stock gate */
  async forceZero(variantId: string) {
    const map = await load();
    map[variantId] = 0;
    await persist(map);
  },

  async incrementLines(
    lines: { productId: string; variantLabel: string; quantity: number }[],
  ) {
    const map = await load();
    for (const line of lines) {
      const v = this.findVariant(line.productId, line.variantLabel);
      if (!v) continue;
      map[v.id] = (map[v.id] ?? 0) + line.quantity;
    }
    await persist(map);
  },

  async reset() {
    memory = seedMap();
    await AsyncStorage.removeItem(STOCK_KEY);
  },
};
