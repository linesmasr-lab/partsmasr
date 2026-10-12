import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import VehicleSelector from '../components/VehicleSelector.jsx';
import { useStore, whatsappLink } from '../store.jsx';
import { api } from '../api.js';

const STEPS = [
  { n: '١', t: 'اختار عربيتك', b: 'بالماركة والموديل والسنة والموتور، أو ابعتلنا رقم الشاسيه أو صورة الرخصة.' },
  { n: '٢', t: 'إحنا نأكد', b: 'متخصص بيراجع إن القطعة بتركب على عربيتك قبل ما نشحن.' },
  { n: '٣', t: 'استلم وركّب', b: 'وادفع كاش عند الاستلام. ولو القطعة مركبتش، الإرجاع مجاني.' },
];

export default function Home() {
  const { tree, vehicle, config } = useStore();
  const [cats, setCats] = useState([]);
  useEffect(() => { api.categories().then(setCats).catch(() => {}); }, []);

  const models = tree.flatMap((ma) => ma.models.map((mo) => ({ ...mo, make: ma.name })));
  const wa = whatsappLink(config.whatsapp, 'السلام عليكم، ده رقم الشاسيه بتاع عربيتي وعاوز أسأل على قطعة: ');

  return (
    <main>
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">قطع غيار · أصلي وبدائل · توصيل لكل مصر</p>
          <h1>دوّر بعربيتك.<br /><span className="accent">مش بالحظ.</span></h1>
          <p className="lead">كل قطعة على الموقع متربطة بالعربيات اللي بتركب عليها. ولو لسه مش متأكد، ابعتلنا رقم الشاسيه وإحنا نأكدلك.</p>
          <VehicleSelector />
          <div className="alt-links">
            <span>أو:</span>
            {wa ? <a href={wa} target="_blank" rel="noreferrer">ابعت رقم الشاسيه على الواتساب</a> : <span className="muted">ابعت رقم الشاسيه (الواتساب هيتفعّل قريب)</span>}
            {wa && <a href={wa} target="_blank" rel="noreferrer">صوّر الرخصة وابعتها</a>}
            <a href="#site-q" onClick={(e) => { e.preventDefault(); document.getElementById('site-q')?.focus(); }}>ابحث برقم القطعة</a>
          </div>
        </div>
      </section>

      <section className="strip" aria-label="مميزاتنا">
        <div className="wrap">
          <span>القطعة تركب، أو نرجعلك فلوسك</span>
          <span>بنأكد كل طلب قبل الشحن</span>
          <span>كاش عند الاستلام</span>
          <span>توصيل لكل المحافظات</span>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>عربيتك من دول؟</h2>
          <div className="chips">
            {models.map((m) => (
              <Link key={m.id} to={`/catalog?model=${m.id}`} className="chip">{m.make} <strong>{m.name}</strong></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <h2>الأقسام</h2>
          <div className="tiles">
            {cats.map((c, i) => (
              <Link key={c.id} className="tile" to={vehicle ? `/catalog/${vehicle.id}?cat=${c.slug}` : `/catalog?cat=${c.slug}`}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <div><div className="t">{c.name}</div><div className="muted">{c.sub}</div></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#181A1D', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <h2>٣ خطوات وبس</h2>
          <div className="steps">
            {STEPS.map((s) => (
              <div className="step" key={s.n}><div className="num">{s.n}</div><h3>{s.t}</h3><p>{s.b}</p></div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
