const DEMO = [
  { sku: 'SUP-TANK-1000', name: 'Supreme 1000L Tank', stock: 18 },
  { sku: 'POLY-FR-15', name: 'Polycab 1.5 sq.mm', stock: 55 },
  { sku: 'ULT-PPC-50', name: 'Ultratech PPC 50kg', stock: 200 },
  { sku: 'AP-ROY-10', name: 'Asian Paints Royale 10L', stock: 4 },
];

export function ProductsPage() {
  return (
    <div>
      <h1>Products</h1>
      <p className="lede">Inventory glance — low stock highlighted.</p>
      <table className="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Name</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          {DEMO.map((p) => (
            <tr key={p.sku} className={p.stock < 10 ? 'warn' : undefined}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td>{p.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
