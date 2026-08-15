const DEMO = [
  { id: 'BM48213', status: 'out_for_delivery', total: '₹8,840', city: 'Hyderabad' },
  { id: 'BM48102', status: 'packed', total: '₹3,699', city: 'Gurugram' },
  { id: 'BM48011', status: 'confirmed', total: '₹1,240', city: 'Hyderabad' },
];

export function OrdersPage() {
  return (
    <div>
      <h1>Orders</h1>
      <p className="lede">Demo rows — replace with GET /api/v1/orders when backend is live.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Status</th>
            <th>City</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {DEMO.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td>
              <td>
                <span className="badge">{o.status}</span>
              </td>
              <td>{o.city}</td>
              <td>{o.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
