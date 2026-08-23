import { useEffect, useState } from 'react';
import { apiGet } from '../api';

type RouteInfo = {
  straightKm: number;
  driveKm: number | null;
  driveMinutes: number | null;
  mapUrl: string;
  hub: { label: string };
};

type OrderRow = {
  id: string;
  status: string;
  city?: string;
  pincode?: string;
  address_label?: string;
  total: string | number;
  latitude?: number | string | null;
  longitude?: number | string | null;
  route?: RouteInfo | null;
};

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [source, setSource] = useState('Loading orders…');

  useEffect(() => {
    apiGet<{ orders: OrderRow[] }>('/api/v1/admin/orders')
      .then((res) => {
        setOrders(res.orders ?? []);
        setSource(
          res.orders?.length
            ? 'Live orders with OpenStreetMap + OSRM distance from the Hyderabad hub'
            : 'No orders yet — place one from the shop with live location',
        );
      })
      .catch(() => setSource('API offline — start the backend on port 4000'));
  }, []);

  return (
    <div>
      <h1>Orders</h1>
      <p className="lede">{source}</p>
      <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Status</th>
            <th>Customer location</th>
            <th>Distance from hub</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>
                <strong>{o.id}</strong>
              </td>
              <td>
                <span className="badge">{o.status}</span>
              </td>
              <td>
                {o.address_label || o.city || '—'}
                {o.pincode ? ` · ${o.pincode}` : ''}
                {o.latitude != null && o.longitude != null ? (
                  <div className="muted">
                    {Number(o.latitude).toFixed(4)}, {Number(o.longitude).toFixed(4)}
                  </div>
                ) : (
                  <div className="muted">No live pin — customer skipped GPS</div>
                )}
              </td>
              <td>
                {o.route ? (
                  <div>
                    <div>
                      Drive {o.route.driveKm ?? o.route.straightKm} km
                      {o.route.driveMinutes ? ` · ~${o.route.driveMinutes} min` : ''}
                    </div>
                    <div className="muted">Straight line {o.route.straightKm} km</div>
                    <a href={o.route.mapUrl} target="_blank" rel="noreferrer">
                      Open route on OpenStreetMap
                    </a>
                  </div>
                ) : (
                  <span className="muted">Waiting for live location</span>
                )}
              </td>
              <td>{typeof o.total === 'number' ? `₹${o.total}` : o.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
