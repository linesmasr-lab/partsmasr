import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Tree from '../components/Tree.jsx';
import PartGroup, { CartSummary } from '../components/PartGroup.jsx';
import { GarageBar } from '../components/Layout.jsx';
import { useStore, whatsappLink } from '../store.jsx';
import { api, vehicleLabel } from '../api.js';

function AskBox() {
  const { config, vehicle } = useStore();
  const href = whatsappLink(config.whatsapp, `السلام عليكم، عندي ${vehicleLabel(vehicle) || 'عربية'} ومش لاقي قطعة: `);
  return (
    <div className="ask">
      <span style={{ fontWeight: 600 }}>مش لاقي القطعة أو مش متأكد؟ ابعتلنا رقم الشاسيه أو صورة القطعة القديمة، وهنرد عليك.</span>
      {href && <a className="btn" href={href} target="_blank" rel="noreferrer">اسأل في الواتساب</a>}
    </div>
  );
}

export default function Catalog() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const cat = sp.get('cat') || '';
  const { vehicle, setVehicle } = useStore();
  const [cats, setCats] = useState([]);
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.categories().then(setCats).catch(() => {}); }, []);

  useEffect(() => {
    if (!id) return;
    setError('');
    if (!vehicle || String(vehicle.id) !== String(id)) {
      api.vehicle(id).then(setVehicle).catch(() => setError('العربية دي مش موجودة.'));
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!id) return;
    setGroups(null);
    api.parts(id, cat).then(setGroups).catch(() => setGroups([]));
  }, [id, cat]);

  const v = vehicle && String(vehicle.id) === String(id) ? vehicle : null;
  const catName = cats.find((c) => c.slug === cat)?.name;

  return (
    <>
      <GarageBar />
      <div className="wrap layout">
        <div className="side"><Tree currentId={id} openModelId={sp.get('model')} /></div>

        <main className="main">
          {!id ? (
            <>
              <h1 className="page-title">اختار عربيتك من الشجرة</h1>
              <p className="muted" style={{ marginTop: 0 }}>افتح الماركة، وبعدين الموديل، والسنة، والموتور. وهتلاقي كل القطع اللي بتركب على عربيتك{catName ? ` في قسم ${catName}` : ''}.</p>
              <AskBox />
            </>
          ) : error ? (
            <div className="error">{error}</div>
          ) : (
            <>
              <nav className="crumbs" aria-label="مسار التصفح">
                <Link to="/">الرئيسية</Link>{v && <> ‹ {v.make} ‹ {v.model} ‹ {v.year} ‹ {v.engine}</>}
              </nav>
              <h1 className="page-title">قطع غيار {v ? <><span className="accent">{v.model} {v.year}</span> · {v.engine}</> : ''}</h1>
              <div className="chips" style={{ marginBottom: 22 }}>
                <Link to={`/catalog/${id}`} className={`chip ${!cat ? 'on' : ''}`}>الكل</Link>
                {cats.map((c) => (
                  <Link key={c.slug} to={`/catalog/${id}?cat=${c.slug}`} className={`chip ${cat === c.slug ? 'on' : ''}`}>{c.name}</Link>
                ))}
              </div>
              {groups === null && <div className="empty">جاري التحميل…</div>}
              {groups?.length === 0 && <div className="panel empty">مفيش قطع في القسم ده للعربية دي لسه.</div>}
              {groups?.map((g) => <PartGroup key={g.title} group={g} />)}
              <AskBox />
            </>
          )}
        </main>

        <div className="side"><CartSummary /></div>
      </div>
    </>
  );
}
