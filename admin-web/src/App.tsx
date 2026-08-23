import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { getAdminToken, setAdminToken } from './api';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { OrdersPage } from './pages/OrdersPage';
import { JobsPage } from './pages/JobsPage';
import { ProductsPage } from './pages/ProductsPage';

export function App() {
  const [authed, setAuthed] = useState(() => {
    const token = getAdminToken();
    return !!token && token.includes('.');
  });

  if (!authed) {
    return <LoginPage onAuthed={() => setAuthed(true)} />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">BuildMart</div>
        <p className="brand-sub">Ops admin</p>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/orders">Orders</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/hire">Work & bids</NavLink>
        </nav>
        <button
          className="sidebar-signout"
          type="button"
          onClick={() => {
            setAdminToken(null);
            setAuthed(false);
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/hire" element={<JobsPage />} />
        </Routes>
      </main>
    </div>
  );
}
