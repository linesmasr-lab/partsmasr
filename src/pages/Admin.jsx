import { useEffect, useState } from 'react';
import { api, money, TIER, STOCK } from '../api.js';
import { useStore } from '../store.jsx';

const PLACEHOLDERS = ['oil-filter', 'air-filter', 'motor-oil', 'brake-pads', 'brake-disc', 'shock', 'belt', 'spark-plug', 'water-pump', 'battery', 'radiator', 'headlight'];
const ORDER_STATUS = { new: 'جديد', confirmed: 'اتأكد', shipped: 'اتشحن', delivered: 'اتسلّم', cancelled: 'اتلغى' };

function getToken() { try { return sessionStorage.getItem('pm_admin') || ''; } catch { return ''; } }
function setTokenStore(t) { try { t ? sessionStorage.setItem('pm_admin', t) : sessionStorage.removeItem('pm_admin'); } catch { /* ignore */ } }

function Login({ onToken }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { const { token } = await api.admin.login(pw); setTokenStore(token); onToken(token); }
    catch (x) { setErr(x.message === 'admin_disabled' ? 'لوحة التحكم مقفولة: لازم تحددي ADMIN_PASSWORD على السيرفر.' : 'كلمة السر غلط.'); }
  };
  return (
    <div className="wrap" style={{ padding: '64px 24px', maxWidth: 440 }}>
      <form className="panel" style={{ padding: 26, display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={submit}>
        <h1 className="page-title" style={{ margin: 0 }}>لوحة التحكم</h1>
        <label className="field">كلمة السر<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required /></label>
        {err && <div className="error" role="alert">{err}</div>}
        <button className="btn" type="submit">دخول</button>
      </form>
    </div>
  );
}

const EMPTY = { name: '', brand: '', part_number: '', tier: 'premium', price: '', stock: 'in', warranty: '', image: '/parts/oil-filter.svg', category_id: '', fitments: [] };

function PartForm({ token, partId, onDone }) {
  const { tree } = useStore();
  const [cats, setCats] = useState([]);
  const [p, setP] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const models = tree.flatMap((ma) => ma.models.map((mo) => ({ ...mo, label: `${ma.name} ${mo.name}` })));

  useEffect(() => {
    api.categories().then((c) => { setCats(c); setP((x) => (x.category_id ? x : { ...x, category_id: c[0]?.id || '' })); });
    if (partId) api.admin.part(token, partId).then((d) => setP({ ...d, fitments: d.fitments.map((f) => ({ ...f, engine: f.engine })) }));
  }, [partId, token]);

  const set = (k) => (e) => setP({ ...p, [k]: e.target.value });
  const setFit = (i, k, v) => setP({ ...p, fitments: p.fitments.map((f, j) => (j === i ? { ...f, [k]: v } : f)) });
  const addFit = () => {
    const mo = models[0];
    const years = mo?.vehicles.map((v) => v.year) || [2015];
    setP({ ...p, fitments: [...p.fitments, { model_id: mo?.id, from: Math.min(...years), to: Math.max(...years), engine: '' }] });
  };

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr('');
    try { const { url } = await api.admin.upload(token, file); setP((x) => ({ ...x, image: url })); }
    catch { setErr('الصورة لازم تكون JPG أو PNG أو WEBP وأقل من 5 ميجا.'); }
  };

  const save = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api.admin.savePart(token, partId, { ...p, price: Number(p.price) }); onDone(); }
    catch { setErr('اتأكدي إن الاسم والبراند والسعر مكتوبين صح.'); }
    finally { setBusy(false); }
  };

  return (
    <form className="panel" style={{ padding: 22 }} onSubmit={save}>
      <h2 style={{ marginTop: 0 }}>{partId ? `تعديل قطعة #${partId}` : 'قطعة جديدة'}</h2>
      <div className="form">
        <label className="field">اسم القطعة *<input required value={p.name} onChange={set('name')} placeholder="مثال: تيل فرامل أمامي" /></label>
        <label className="field">القسم *<select value={p.category_id} onChange={set('category_id')}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="field">البراند *<input required value={p.brand} onChange={set('brand')} /></label>
        <label className="field">رقم القطعة<input value={p.part_number} onChange={set('part_number')} dir="ltr" /></label>
        <label className="field">النوع<select value={p.tier} onChange={set('tier')}>{Object.entries(TIER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field">السعر (ج.م) *<input required type="number" min="0" value={p.price} onChange={set('price')} /></label>
        <label className="field">التوفر<select value={p.stock} onChange={set('stock')}>{Object.entries(STOCK).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="field">الضمان<input value={p.warranty} onChange={set('warranty')} placeholder="مثال: 6 شهور" /></label>

        <div className="field full">الصورة
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <img src={p.image} alt="" className="part-img" />
            <label className="btn btn-ghost">ارفع صورة<input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} className="sr-only" /></label>
            <select aria-label="أو اختار صورة مؤقتة" value={PLACEHOLDERS.find((x) => p.image === `/parts/${x}.svg`) || ''} onChange={(e) => e.target.value && setP({ ...p, image: `/parts/${e.target.value}.svg` })}
              style={{ background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 8, padding: 10, minHeight: 44 }}>
              <option value="">أو اختار صورة مؤقتة</option>
              {PLACEHOLDERS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        </div>

        <div className="field full">بتركب على (التوافق)
          {p.fitments.length === 0 && <small>لسه مفيش عربيات. القطعة مش هتظهر في الكتالوج غير لما تضيفي عربية واحدة على الأقل.</small>}
          {p.fitments.map((f, i) => {
            const mo = models.find((m) => String(m.id) === String(f.model_id));
            const engines = [...new Set((mo?.vehicles || []).map((v) => v.engine))];
            return (
              <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select aria-label="الموديل" value={f.model_id} onChange={(e) => setFit(i, 'model_id', e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 8, padding: 10, minHeight: 44 }}>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <span>من</span><input aria-label="من سنة" type="number" value={f.from} onChange={(e) => setFit(i, 'from', e.target.value)} className="qty" style={{ width: 90 }} />
                <span>لحد</span><input aria-label="لحد سنة" type="number" value={f.to} onChange={(e) => setFit(i, 'to', e.target.value)} className="qty" style={{ width: 90 }} />
                <select aria-label="الموتور" value={f.engine} onChange={(e) => setFit(i, 'engine', e.target.value)} style={{ background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 8, padding: 10, minHeight: 44 }}>
                  <option value="">كل المواتير</option>
                  {engines.map((x) => <option key={x}>{x}</option>)}
                </select>
                <button type="button" className="btn btn-danger" onClick={() => setP({ ...p, fitments: p.fitments.filter((_, j) => j !== i) })}>شيل</button>
              </div>
            );
          })}
          <div><button type="button" className="btn btn-ghost" onClick={addFit}>+ أضف عربية</button></div>
        </div>
      </div>
      {err && <div className="error" role="alert" style={{ margin: '14px 0' }}>{err}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'جاري الحفظ…' : 'احفظ'}</button>
        <button className="btn btn-ghost" type="button" onClick={onDone}>إلغاء</button>
      </div>
    </form>
  );
}

function Parts({ token, onAuthFail }) {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = list, null = new, id = edit
  const load = () => api.admin.parts(token, q).then(setRows).catch((e) => e.status === 401 && onAuthFail());
  useEffect(() => { load(); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  if (editing !== undefined) return <PartForm token={token} partId={editing} onDone={() => { setEditing(undefined); load(); }} />;
  return (
    <div className="panel">
      <div style={{ display: 'flex', gap: 10, padding: 14, flexWrap: 'wrap' }}>
        <input aria-label="بحث في القطع" placeholder="بحث بالاسم أو البراند أو رقم القطعة" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ flex: '1 1 260px', background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 8, padding: '10px 14px', minHeight: 44 }} />
        <button className="btn" type="button" onClick={() => setEditing(null)}>+ قطعة جديدة</button>
      </div>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>الصورة</th><th>القطعة</th><th>البراند</th><th>النوع</th><th>السعر</th><th>التوفر</th><th>عربيات</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><img src={r.image} alt="" style={{ width: 56, height: 46, objectFit: 'cover', borderRadius: 6 }} /></td>
                <td><div style={{ fontWeight: 700 }}>{r.name}</div><div className="pn">{r.part_number} · {r.category_name}</div></td>
                <td>{r.brand}</td>
                <td><span className={`tag tag-${r.tier}`}>{TIER[r.tier]}</span></td>
                <td>{money(r.price)}</td>
                <td className={`stock-${r.stock}`}>{STOCK[r.stock]}</td>
                <td>{r.fit_count.toLocaleString('ar-EG')}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn btn-ghost" type="button" onClick={() => setEditing(r.id)}>تعديل</button>{' '}
                  <button className="btn btn-danger" type="button" onClick={async () => { if (confirm(`تمسحي "${r.name} – ${r.brand}"؟`)) { await api.admin.deletePart(token, r.id); load(); } }}>مسح</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Orders({ token, onAuthFail }) {
  const [rows, setRows] = useState(null);
  const load = () => api.admin.orders(token).then(setRows).catch((e) => e.status === 401 && onAuthFail());
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows) return <div className="empty">جاري التحميل…</div>;
  if (!rows.length) return <div className="panel empty">لسه مفيش طلبات.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map((o) => (
        <div key={o.id} className="panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <strong>طلب #{o.id} · {o.name} · <span dir="ltr">{o.phone}</span></strong>
            <select aria-label="حالة الطلب" value={o.status} onChange={async (e) => { await api.admin.setStatus(token, o.id, e.target.value); load(); }}
              style={{ background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 8, padding: 8, minHeight: 40 }}>
              {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="muted" style={{ fontSize: 14, margin: '6px 0' }}>{o.governorate} · {o.address} · {o.created_at}</div>
          {o.vehicle && <div style={{ fontSize: 14 }}>العربية: {o.vehicle}{o.chassis && <> · شاسيه: <span dir="ltr">{o.chassis}</span></>}</div>}
          <ul style={{ margin: '8px 0', paddingRight: 18 }}>{o.items.map((i, k) => <li key={k}>{i.name} · {i.brand} × {i.qty} = {money(i.qty * i.price)}</li>)}</ul>
          {o.notes && <div className="muted">ملاحظات: {o.notes}</div>}
          <div style={{ fontWeight: 800 }}>الإجمالي: <span className="accent">{money(o.total)}</span></div>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState(getToken);
  const [tab, setTab] = useState('parts');
  const logout = () => { setTokenStore(''); setToken(''); };
  if (!token) return <Login onToken={setToken} />;
  return (
    <div className="wrap" style={{ padding: '28px 24px 48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h1 className="page-title">لوحة التحكم</h1>
        <button type="button" className="btn btn-ghost" onClick={logout}>خروج</button>
      </div>
      <div className="tabs">
        <button type="button" className={`chip ${tab === 'parts' ? 'on' : ''}`} onClick={() => setTab('parts')}>القطع</button>
        <button type="button" className={`chip ${tab === 'orders' ? 'on' : ''}`} onClick={() => setTab('orders')}>الطلبات</button>
      </div>
      {tab === 'parts' ? <Parts token={token} onAuthFail={logout} /> : <Orders token={token} onAuthFail={logout} />}
    </div>
  );
}
