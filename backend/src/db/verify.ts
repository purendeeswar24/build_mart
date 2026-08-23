import { query } from '../config/db';

async function main() {
  const tables = await query<{ table_name: string }>(
    `select table_name
     from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name`,
  );
  const counts = await query<{
    categories: number;
    products: number;
    variants: number;
    users: number;
    orders: number;
  }>(
    `select
       (select count(*)::int from categories) as categories,
       (select count(*)::int from products) as products,
       (select count(*)::int from product_variants) as variants,
       (select count(*)::int from users) as users,
       (select count(*)::int from orders) as orders`,
  );
  console.log('tables:');
  for (const t of tables) console.log(`  - ${t.table_name}`);
  console.log('counts:', counts[0]);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
