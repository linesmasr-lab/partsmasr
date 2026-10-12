import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store.jsx';
import { money, TIER, STOCK } from '../api.js';

function PartRow({ p }) {
  const { addToCart } = useStore();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const out = p.stock === 'out';
  const add = () => {
    addToCart(p, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };
  return (
    <div className="part-row">
      <img className="part-img" src={p.image || '/parts/oil-filter.svg'} alt={`${p.name} ${p.brand}`} loading="lazy" />
      <div>
        <div className="part-brand">{p.brand}</div>
        <div className="pn">{p.part_number}</div>
        {p.warranty && p.warranty !== '—' && <div className="muted" style={{ fontSize: 13 }}>ضمان {p.warranty}</div>}
      </div>
      <div className="col-meta">
        <span className={`tag tag-${p.tier}`}>{TIER[p.tier]}</span>
        <div className={`stock-${p.stock}`} style={{ marginTop: 6, fontSize: 14 }}>{STOCK[p.stock]}</div>
      </div>
      <div className="col-price price">{money(p.price)}</div>
      <div className="buy">
        <label className="sr-only" htmlFor={`q${p.id}`}>الكمية</label>
        <input id={`q${p.id}`} className="qty" type="number" min="1" max="20" value={qty}
          onChange={(e) => setQty(Math.min(Math.max(Number(e.target.value) || 1, 1), 20))} disabled={out} />
        <button type="button" className="btn" onClick={add} disabled={out}>{added ? 'اتضافت ✓' : 'أضف للسلة'}</button>
      </div>
    </div>
  );
}

export default function PartGroup({ group }) {
  return (
    <section className="panel group">
      <div className="group-h">
        <h2>{group.title}</h2>
        <span className="muted" style={{ fontSize: 13 }}>{group.parts.length.toLocaleString('ar-EG')} اختيارات</span>
      </div>
      {group.parts.map((p) => <PartRow key={p.id} p={p} />)}
    </section>
  );
}

export function CartSummary() {
  const { cart, cartTotal } = useStore();
  return (
    <aside className="panel cart-side" aria-label="السلة">
      <div style={{ fontWeight: 800, fontSize: 18 }}>السلة</div>
      {cart.length === 0 && <div className="muted" style={{ fontSize: 14 }}>السلة فاضية</div>}
      {cart.map((i) => (
        <div className="cart-line" key={i.id}><span>{i.name} · {i.brand} × {i.qty.toLocaleString('ar-EG')}</span><span>{money(i.price * i.qty)}</span></div>
      ))}
      <div className="cart-total"><span>الإجمالي</span><span className="accent">{money(cartTotal)}</span></div>
      <Link to={cart.length ? '/checkout' : '#'} className="btn" aria-disabled={!cart.length} style={cart.length ? null : { opacity: 0.5, pointerEvents: 'none' }}>إتمام الطلب</Link>
      <div className="muted" style={{ fontSize: 13, lineHeight: 1.8 }}>هنراجع الطلب على عربيتك قبل الشحن. ولو القطعة مركبتش، الإرجاع مجاني.</div>
    </aside>
  );
}
