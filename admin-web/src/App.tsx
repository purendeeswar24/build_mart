export function App() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="brand-lockup">
          <div className="brand-text">BUILDMART</div>
          <span className="brand-mark">®</span>
        </div>

        <div className="header-actions">
          <label className="header-search" aria-label="Search products">
            <span className="search-icon">⌕</span>
            <input type="text" placeholder="Search products" />
          </label>

          <div className="header-icons" aria-label="Header actions">
            <button type="button" className="cart-action" aria-label="Cart">
              <svg className="cart-icon" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="9" cy="18" r="1.6" />
                <circle cx="17" cy="18" r="1.6" />
                <path d="M3 4h2l2.3 9.3a1 1 0 0 0 1 .7h8.7a1 1 0 0 0 1-.8L20 7H7" />
              </svg>
              <span className="cart-label">Cart</span>
            </button>
            <button type="button" className="profile-action" aria-label="User account">
              <span className="profile-avatar" aria-hidden="true">
                <svg className="profile-avatar-inner" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="7.5" r="3.5" />
                  <path d="M5 18.5c1.8-3.1 4.2-4.7 7-4.7s5.2 1.6 7 4.7" />
                </svg>
              </span>
              <span className="profile-label">User</span>
            </button>
          </div>
        </div>
      </header>

      <section className="hero" aria-label="30-minute delivery">
        <div className="hero-copy">
          <p className="hero-eyebrow">India’s fast lane for sites</p>
          <h1 className="hero-title">
            30-minute delivery for <span>materials</span>
          </h1>
          <p className="hero-sub">
            Pipes, cement, wires, paints &amp; fittings — no minimum quantity.
          </p>
          <p className="hero-description">
            Fast, reliable delivery of construction materials directly to your site. Same-day ordering available for most areas.
          </p>
          <div className="hero-pills">
            <span className="pill-delivery">30-min delivery</span>
            <span>Any quantity</span>
          </div>
        </div>
        <div className="hero-media">
          <img
            src="/home-page.png"
            alt="Buildmart construction tools and building materials"
          />
        </div>
      </section>
    </div>
  );
}
