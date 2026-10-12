import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store.jsx';

export default function Tree({ currentId, openModelId }) {
  const { tree, vehicle } = useStore();
  const [open, setOpen] = useState({});
  // On phones, keep the tree folded once a car is chosen so the parts show first.
  const [collapsed, setCollapsed] = useState(() => !!currentId && typeof window !== 'undefined' && window.innerWidth < 760);

  // Open a model requested from the home page chips (?model=ID).
  useEffect(() => {
    if (!openModelId || !tree.length) return;
    const ma = tree.find((m) => m.models.some((mo) => String(mo.id) === String(openModelId)));
    if (ma) setOpen((o) => ({ ...o, [`ma${ma.id}`]: true, [`mo${openModelId}`]: true }));
  }, [openModelId, tree]);

  // Expand the path down to the selected vehicle.
  useEffect(() => {
    if (!vehicle || String(vehicle.id) !== String(currentId)) return;
    setOpen((o) => ({ ...o, [`ma${vehicle.make_id}`]: true, [`mo${vehicle.model_id}`]: true, [`y${vehicle.model_id}-${vehicle.year}`]: true }));
  }, [vehicle, currentId]);

  const toggle = (k) => setOpen((o) => ({ ...o, [k]: !o[k] }));
  const Btn = ({ k, children }) => (
    <button type="button" className={open[k] ? 'open' : ''} aria-expanded={!!open[k]} onClick={() => toggle(k)}>
      <span aria-hidden="true">{open[k] ? '−' : '+'}</span>{children}
    </button>
  );

  return (
    <details className="panel tree-details" open={!collapsed} onToggle={(e) => setCollapsed(!e.currentTarget.open)}>
      <summary className="panel-h">الماركات</summary>
      <nav className="tree" aria-label="الماركات">
        <ul>
          {tree.map((ma) => (
            <li key={ma.id}>
              <Btn k={`ma${ma.id}`}>{ma.name}</Btn>
              {open[`ma${ma.id}`] && (
                <ul>
                  {ma.models.map((mo) => {
                    const years = [...new Set(mo.vehicles.map((v) => v.year))];
                    return (
                      <li key={mo.id}>
                        <Btn k={`mo${mo.id}`}>{mo.name}</Btn>
                        {open[`mo${mo.id}`] && (
                          <ul>
                            {years.map((y) => (
                              <li key={y}>
                                <Btn k={`y${mo.id}-${y}`}>{y}</Btn>
                                {open[`y${mo.id}-${y}`] && (
                                  <ul>
                                    {mo.vehicles.filter((v) => v.year === y).map((v) => (
                                      <li key={v.id}>
                                        <Link to={`/catalog/${v.id}`} className={`leaf ${String(v.id) === String(currentId) ? 'on' : ''}`}
                                          aria-current={String(v.id) === String(currentId) ? 'page' : undefined}>{v.engine}</Link>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
