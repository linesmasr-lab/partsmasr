import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore, whatsappLink } from '../store.jsx';
import { vehicleLabel } from '../api.js';

export function Logo() {
  return <Link to="/" className="logo" aria-label="PartsMasr الرئيسية">PARTS<span>MASR</span></Link>;
}

export function CheckIcon({ color = 'currentColor' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
  );
}

function Header() {
  const { cartCount, vehicle } = useStore();
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`);
  };
  return (
    <header className="site-header">
      <div className="wrap">
        <Logo />
        <form className="search" role="search" onSubmit={submit}>
          <label htmlFor="site-q" className="sr-only">ابحث عن قطعة</label>
          <input id="site-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="اسم القطعة، البراند، أو رقم القطعة" />
          <button type="submit">بحث</button>
        </form>
        <nav className="head-nav" aria-label="القائمة">
          <Link to={vehicle ? `/catalog/${vehicle.id}` : '/catalog'}>الكتالوج</Link>
          <Link to="/cart" className="cart-pill">السلة · {cartCount.toLocaleString('ar-EG')}</Link>
        </nav>
      </div>
    </header>
  );
}

export function GarageBar() {
  const { vehicle, setVehicle } = useStore();
  if (!vehicle) return null;
  return (
    <div className="garage">
      <div className="wrap">
        <span className="muted">عربيتك:</span>
        <span className="garage-chip">{vehicleLabel(vehicle)}</span>
        <Link to="/#select">غيّر العربية</Link>
        <button type="button" className="btn-ghost" style={{ background: 'none', border: 0, color: 'var(--muted)', padding: 0 }} onClick={() => setVehicle(null)}>امسح</button>
        <span className="fit-ok"><CheckIcon /> القطع اللي بتظهرلك بتركب على العربية دي</span>
      </div>
    </div>
  );
}

function Footer() {
  const { config } = useStore();
  return (
    <footer className="site-footer">
      <div className="wrap">
        <span className="logo" style={{ fontSize: 22 }}>PARTS<span>MASR</span></span>
        <nav aria-label="روابط">
          <Link to="/policy">سياسة الإرجاع</Link>
          <Link to="/policy#shipping">الشحن والتوصيل</Link>
          {config.whatsapp && <a href={whatsappLink(config.whatsapp, 'السلام عليكم')} target="_blank" rel="noreferrer">واتساب</a>}
        </nav>
        <span>© {new Date().getFullYear()} PartsMasr</span>
      </div>
    </footer>
  );
}

function WhatsAppFloat() {
  const { config, vehicle } = useStore();
  const href = whatsappLink(config.whatsapp, vehicle ? `السلام عليكم، عندي ${vehicleLabel(vehicle)} وعاوز أسأل على قطعة` : 'السلام عليكم، عاوز أسأل على قطعة');
  if (!href) return null;
  return (
    <a className="wa-float" href={href} target="_blank" rel="noreferrer" aria-label="اسألنا على الواتساب">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2z" /></svg>
    </a>
  );
}

export default function Layout({ children }) {
  const { config } = useStore();
  return (
    <>
      {config.demo && <div className="demo-bar">نسخة تجريبية للعرض: الأسعار والبراندات وأرقام القطع والصور أمثلة مؤقتة</div>}
      <Header />
      {children}
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
