import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(() => load('pm_cart', []));
  const [vehicle, setVehicle] = useState(() => load('pm_vehicle', null));
  const [config, setConfig] = useState({ whatsapp: '', demo: true });
  const [tree, setTree] = useState([]);

  useEffect(() => { save('pm_cart', cart); }, [cart]);
  useEffect(() => { save('pm_vehicle', vehicle); }, [vehicle]);
  useEffect(() => {
    api.config().then(setConfig).catch(() => {});
    api.tree().then(setTree).catch(() => {});
  }, []);

  const value = useMemo(() => ({
    cart, vehicle, config, tree, setVehicle,
    cartCount: cart.reduce((s, i) => s + i.qty, 0),
    cartTotal: cart.reduce((s, i) => s + i.qty * i.price, 0),
    addToCart: (part, qty = 1) => setCart((c) => {
      const found = c.find((i) => i.id === part.id);
      if (found) return c.map((i) => (i.id === part.id ? { ...i, qty: Math.min(i.qty + qty, 20) } : i));
      return [...c, { id: part.id, name: part.name, brand: part.brand, price: part.price, image: part.image, tier: part.tier, qty }];
    }),
    setQty: (id, qty) => setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.min(Math.max(qty, 1), 20) } : i))),
    removeFromCart: (id) => setCart((c) => c.filter((i) => i.id !== id)),
    clearCart: () => setCart([]),
  }), [cart, vehicle, config, tree]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);

export function whatsappLink(number, text) {
  if (!number) return null;
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
