import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PartGroup, { CartSummary } from '../components/PartGroup.jsx';
import { GarageBar } from '../components/Layout.jsx';
import { useStore, whatsappLink } from '../store.jsx';
import { api, money, TIER, vehicleLabel } from '../api.js';

export function Search() {
  const [sp] = useSearchParams();
  const q = sp.get('q') || '';
  const { vehicle } = useStore();
  const [onlyMine, setOnlyMine] = useState(true);
  const [groups, setGroups] = useState(null);
  const vid = vehicle && onlyMine ? vehicle.id : null;

  useEffect(() => {
    setGroups(null);
    api.search(q, vid).then(setGroups).catch(() => setGroups([]));
  }, [q, vid]);

  return (
    <>
      <GarageBar />
      <div className="wrap layout">
        <main className="main">
          <h1 className="page-title">نتايج البحث عن: <span className="accent">{q}</span></h1>
          {vehicle && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
              <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} style={{ width: 20, height: 20 }} />
              اعرض بس القطع اللي بتركب على {vehicleLabel(vehicle)}
            </label>
          )}
          {!vehicle && <p className="muted">ملحوظة: اختار عربيتك من <Link to="/">الرئيسية</Link> عشان نعرضلك بس القطع اللي بتركب عليها.</p>}
          {groups === null && <div className="empty">جاري البحث…</div>}
          {groups?.length === 0 && <div className="panel empty">ملقيناش نتايج. جرّب كلمة تانية أو اسألنا على الواتساب.</div>}
          {groups?.map((g) => <PartGroup key={g.title + g.category} group={g} />)}
        </main>
        <div className="side"><CartSummary /></div>
      </div>
    </>
  );
}

export function Cart() {
  const { cart, cartTotal, setQty, removeFromCart } = useStore();
  return (
    <div className="wrap" style={{ padding: '32px 24px 48px' }}>
      <h1 className="page-title">السلة</h1>
      {cart.length === 0 ? (
        <div className="panel empty">السلة فاضية. <Link to="/">ابدأ بعربيتك</Link></div>
      ) : (
        <div className="layout" style={{ padding: 0 }}>
          <div className="main panel">
            {cart.map((i) => (
              <div className="cart-item" key={i.id}>
                <img className="part-img" style={{ width: 80, height: 66 }} src={i.image} alt="" />
                <div><div style={{ fontWeight: 700 }}>{i.name}</div><div className="muted" style={{ fontSize: 14 }}>{i.brand} · {TIER[i.tier]}</div></div>
                <div>
                  <label className="sr-only" htmlFor={`cq${i.id}`}>الكمية</label>
                  <input id={`cq${i.id}`} className="qty" type="number" min="1" max="20" value={i.qty} onChange={(e) => setQty(i.id, Number(e.target.value) || 1)} />
                </div>
                <div className="price">{money(i.price * i.qty)}</div>
                <button type="button" className="btn btn-danger" onClick={() => removeFromCart(i.id)} aria-label={`شيل ${i.name}`}>شيل</button>
              </div>
            ))}
          </div>
          <aside className="side panel cart-side">
            <div className="cart-total" style={{ borderTop: 0, paddingTop: 0 }}><span>الإجمالي</span><span className="accent">{money(cartTotal)}</span></div>
            <div className="muted" style={{ fontSize: 13 }}>مصاريف الشحن بتتحدد حسب المحافظة وهنأكدها معاك.</div>
            <Link to="/checkout" className="btn btn-lg">إتمام الطلب</Link>
          </aside>
        </div>
      )}
    </div>
  );
}

const GOVS = ['القاهرة', 'الجيزة', 'الإسكندرية', 'القليوبية', 'الشرقية', 'الدقهلية', 'الغربية', 'المنوفية', 'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'الفيوم', 'بني سويف', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'مطروح', 'شمال سيناء', 'جنوب سيناء', 'الوادي الجديد'];
const ERRORS = { invalid_phone: 'رقم الموبايل مش صحيح. اكتبه كده: 01xxxxxxxxx', missing_fields: 'من فضلك كمّل البيانات المطلوبة.', empty_cart: 'السلة فاضية.', item_unavailable: 'فيه قطعة في السلة مش متوفرة دلوقتي.' };

export function Checkout() {
  const { cart, cartTotal, vehicle, clearCart } = useStore();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', phone: '', governorate: 'القاهرة', address: '', chassis: '', notes: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (!cart.length) return <div className="wrap" style={{ padding: 40 }}><div className="panel empty">السلة فاضية. <Link to="/">ارجع للرئيسية</Link></div></div>;

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const res = await api.order({ ...f, vehicleId: vehicle?.id, items: cart.map((i) => ({ id: i.id, qty: i.qty })) });
      clearCart();
      nav(`/order/${res.id}`, { state: { total: res.total } });
    } catch (err) {
      setError(ERRORS[err.message] || 'حصلت مشكلة. جرّب تاني كمان شوية.');
    } finally { setBusy(false); }
  };

  return (
    <div className="wrap" style={{ padding: '32px 24px 48px' }}>
      <h1 className="page-title">إتمام الطلب</h1>
      <div className="layout" style={{ padding: 0 }}>
        <form className="main panel" style={{ padding: 22 }} onSubmit={submit}>
          <div className="form">
            <label className="field">الاسم *<input required value={f.name} onChange={set('name')} autoComplete="name" /></label>
            <label className="field">رقم الموبايل *<input required inputMode="tel" value={f.phone} onChange={set('phone')} placeholder="01xxxxxxxxx" autoComplete="tel" /></label>
            <label className="field">المحافظة *
              <select value={f.governorate} onChange={set('governorate')}>{GOVS.map((g) => <option key={g}>{g}</option>)}</select>
            </label>
            <label className="field">رقم الشاسيه (اختياري)<input value={f.chassis} onChange={set('chassis')} dir="ltr" />
              <small>بيساعدنا نتأكد إن القطعة هتركب على عربيتك</small></label>
            <label className="field full">العنوان بالتفصيل *<input required value={f.address} onChange={set('address')} autoComplete="street-address" /></label>
            <label className="field full">ملاحظات<textarea value={f.notes} onChange={set('notes')} /></label>
          </div>
          {vehicle && <p className="muted">العربية: <strong style={{ color: 'var(--text)' }}>{vehicleLabel(vehicle)}</strong></p>}
          {error && <div className="error" role="alert" style={{ marginBottom: 14 }}>{error}</div>}
          <button type="submit" className="btn btn-lg btn-block" disabled={busy}>{busy ? 'جاري الإرسال…' : 'أكّد الطلب (كاش عند الاستلام)'}</button>
        </form>
        <aside className="side panel cart-side">
          <div style={{ fontWeight: 800, fontSize: 18 }}>طلبك</div>
          {cart.map((i) => <div className="cart-line" key={i.id}><span>{i.name} · {i.brand} × {i.qty.toLocaleString('ar-EG')}</span><span>{money(i.qty * i.price)}</span></div>)}
          <div className="cart-total"><span>الإجمالي</span><span className="accent">{money(cartTotal)}</span></div>
          <div className="muted" style={{ fontSize: 13 }}>+ مصاريف الشحن، هنأكدها معاك في التليفون.</div>
        </aside>
      </div>
    </div>
  );
}

export function OrderDone() {
  const { config } = useStore();
  const id = window.location.pathname.split('/').pop();
  const wa = whatsappLink(config.whatsapp, `السلام عليكم، ده رقم طلبي #${id}`);
  return (
    <div className="wrap" style={{ padding: '64px 24px', maxWidth: 720 }}>
      <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, color: 'var(--ok)' }} aria-hidden="true">✓</div>
        <h1 className="page-title">طلبك وصل! رقم الطلب <span className="accent">#{Number(id).toLocaleString('ar-EG')}</span></h1>
        <p className="muted">هنكلمك قريب نأكد إن القطع بتركب على عربيتك، ونقولك ميعاد التوصيل ومصاريف الشحن.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          {wa && <a className="btn" href={wa} target="_blank" rel="noreferrer">تابع طلبك على الواتساب</a>}
          <Link className="btn btn-ghost" to="/">ارجع للرئيسية</Link>
        </div>
      </div>
    </div>
  );
}

export function Policy() {
  return (
    <div className="wrap" style={{ padding: '40px 24px', maxWidth: 820 }}>
      <h1 className="page-title">سياسة الإرجاع</h1>
      <p>لو القطعة مركبتش على عربيتك، نرجّعها مجانًا ونرجعلك فلوسك كاملة. بشرط إن القطعة تكون لسه في حالتها ومتركّبتش.</p>
      <p className="muted">[مدة الإرجاع وتفاصيل الشروط: هتتحدد قبل الإطلاق]</p>
      <h2 id="shipping" style={{ marginTop: 32 }}>الشحن والتوصيل</h2>
      <p>بنوصّل لكل محافظات مصر، والدفع كاش عند الاستلام.</p>
      <p className="muted">[مصاريف الشحن ومدة التوصيل لكل محافظة: هتتحدد قبل الإطلاق]</p>
    </div>
  );
}
