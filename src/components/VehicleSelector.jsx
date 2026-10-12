import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.jsx';

export default function VehicleSelector() {
  const { tree, vehicle, setVehicle } = useStore();
  const nav = useNavigate();
  const [makeId, setMakeId] = useState('');
  const [modelId, setModelId] = useState('');
  const [year, setYear] = useState('');
  const [vehId, setVehId] = useState('');

  useEffect(() => {
    if (vehicle && tree.length && !makeId) {
      setMakeId(String(vehicle.make_id)); setModelId(String(vehicle.model_id));
      setYear(String(vehicle.year)); setVehId(String(vehicle.id));
    }
  }, [vehicle, tree]); // eslint-disable-line react-hooks/exhaustive-deps

  const make = tree.find((m) => String(m.id) === makeId);
  const model = make?.models.find((m) => String(m.id) === modelId);
  const years = useMemo(() => [...new Set((model?.vehicles || []).map((v) => v.year))], [model]);
  const engines = (model?.vehicles || []).filter((v) => String(v.year) === year);

  useEffect(() => { if (engines.length === 1) setVehId(String(engines[0].id)); }, [year, modelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = () => {
    const v = engines.find((e) => String(e.id) === vehId);
    if (!v) return;
    setVehicle({ id: v.id, year: v.year, engine: v.engine, model_id: model.id, model: model.name, make_id: make.id, make: make.name });
    nav(`/catalog/${v.id}`);
  };

  return (
    <div className="selector" id="select">
      <label>الماركة
        <select value={makeId} onChange={(e) => { setMakeId(e.target.value); setModelId(''); setYear(''); setVehId(''); }}>
          <option value="">اختار</option>
          {tree.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label>الموديل
        <select value={modelId} disabled={!make} onChange={(e) => { setModelId(e.target.value); setYear(''); setVehId(''); }}>
          <option value="">اختار</option>
          {make?.models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label>السنة
        <select value={year} disabled={!model} onChange={(e) => { setYear(e.target.value); setVehId(''); }}>
          <option value="">اختار</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label>الموتور
        <select value={vehId} disabled={!year} onChange={(e) => setVehId(e.target.value)}>
          <option value="">اختار</option>
          {engines.map((v) => <option key={v.id} value={v.id}>{v.engine}</option>)}
        </select>
      </label>
      <button type="button" className="btn" disabled={!vehId} onClick={go}>اعرض القطع</button>
    </div>
  );
}
