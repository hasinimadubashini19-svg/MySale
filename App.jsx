import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, deleteDoc, query, orderBy, where, enableIndexedDbPersistence } from 'firebase/firestore';
import { LayoutDashboard, Store, FileText, Plus, X, Trash2, Crown, Settings, LogOut, Search, Send, MapPin, Receipt, Package, Wallet, CheckCircle2, History, Calendar } from 'lucide-react';

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyA7vsja2a74dFZj1qdItzq2k6kWocXBvTU",
  authDomain: "monarch-sales.firebaseapp.com",
  projectId: "monarch-sales",
  storageBucket: "monarch-sales.firebasestorage.app",
  messagingSenderId: "1011640493770",
  appId: "1:1011640493770:web:93b0f64719c77f16897633"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// OFFLINE SYNC
try {
  enableIndexedDbPersistence(db);
} catch (err) {
  console.warn("Offline persistence disabled");
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState({ routes: [], shops: [], orders: [], expenses: [], brands: [], settings: [] });
  const [selectedRouteId, setSelectedRouteId] = useState('all');
  const [cart, setCart] = useState({});
  const [payStatus, setPayStatus] = useState('PAID');
  const [selectedShop, setSelectedShop] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [searchDate, setSearchDate] = useState(new Date().toLocaleDateString());

  // 1. AUTH & INITIAL LOAD
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // 2. DATA LISTENING (USER SPECIFIC)
  useEffect(() => {
    if (!user) return;
    const collections = ['routes', 'shops', 'orders', 'expenses', 'brands', 'settings'];
    const unsubs = collections.map(c => {
      const q = query(collection(db, c), where("userId", "==", user.uid), orderBy("timestamp", "asc"));
      return onSnapshot(q, s => {
        setData(prev => ({ ...prev, [c]: s.docs.map(d => ({ id: d.id, ...d.data() })) }));
      });
    });
    return () => unsubs.forEach(f => f());
  }, [user]);

  // 3. ACTIONS
  const addItem = async (col, payload) => {
    await addDoc(collection(db, col), {
      ...payload,
      userId: user.uid,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString()
    });
    setShowModal(null);
  };

  const deleteItem = async (col, id) => {
    if (window.confirm("Delete?")) {
      try {
        await deleteDoc(doc(db, col, id));
      } catch (err) {
        alert("Error deleting: " + err.message);
      }
    }
  };

  const submitOrder = async () => {
    const items = Object.entries(cart).filter(([_, q]) => q > 0).map(([id, q]) => {
      const b = data.brands.find(x => x.id === id);
      return { name: b.name, size: b.size, price: b.price, qty: Number(q), subtotal: b.price * Number(q) };
    });
    if (items.length === 0) return alert("Items තෝරන්න!");

    const total = items.reduce((s, i) => s + i.subtotal, 0);
    const orderData = {
      shopName: selectedShop.name,
      items,
      total,
      status: payStatus,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString(),
      monthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };

    const docRef = await addDoc(collection(db, 'orders'), { ...orderData, userId: user.uid });
    setLastOrder({ id: docRef.id, ...orderData });
    setCart({});
    setShowModal('receipt');
  };

  const shareWhatsApp = (order) => {
    let text = `*MONARCH SALES PRO*%0A*Shop:* ${order.shopName}%0A*Status:* ${order.status}%0A*Date:* ${order.date}%0A------------------%0A`;
    order.items.forEach(i => text += `${i.name} (${i.size}) x ${i.qty} = ${i.subtotal}%0A`);
    text += `------------------%0A*TOTAL: Rs.${order.total}*`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // 4. CALCULATIONS
  const todayOrders = data.orders.filter(o => o.date === new Date().toLocaleDateString());
  const monthOrders = data.orders.filter(o => o.monthYear === new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

  const dailyBrandSummary = useMemo(() => {
    const summary = {};
    todayOrders.forEach(o => o.items.forEach(i => {
      const key = `${i.name} (${i.size})`;
      summary[key] = (summary[key] || 0) + i.qty;
    }));
    return Object.entries(summary);
  }, [todayOrders]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-[#d4af37] font-black italic animate-pulse">MONARCH PRO...</div>;

  if (!user) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-[#0f0f0f] p-10 rounded-[3rem] border border-[#d4af37]/20 text-center shadow-2xl">
        <Crown className="text-[#d4af37] mx-auto mb-6" size={50} />
        <h2 className="text-white text-2xl font-black italic uppercase mb-8 tracking-tighter">Monarch Login</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
          } catch (err) {
            try { await createUserWithEmailAndPassword(auth, e.target.email.value, e.target.password.value); }
            catch (e2) { alert("Check Credentials!"); }
          }
        }} className="space-y-4">
          <input name="email" type="email" placeholder="Email" className="w-full bg-black p-5 rounded-2xl text-white border border-white/5 outline-none focus:border-[#d4af37]/50" required />
          <input name="password" type="password" placeholder="Password" className="w-full bg-black p-5 rounded-2xl text-white border border-white/5 outline-none focus:border-[#d4af37]/50" required />
          <button className="w-full py-5 bg-[#d4af37] text-black font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all">Sign In</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>

      <header className="p-6 flex justify-between items-center sticky top-0 bg-black/90 backdrop-blur-xl z-40 border-b border-white/5">
        <div className="flex items-center gap-2"><Crown className="text-[#d4af37]" size={24}/><h1 className="text-lg font-black italic tracking-tighter uppercase">Monarch <span className="text-[#d4af37]">Pro</span></h1></div>
        <div className="flex items-center gap-4">
          <div className="text-right"><p className="text-[10px] font-black text-[#d4af37] uppercase leading-none">{data.settings[0]?.name || 'Rep'}</p></div>
          <button onClick={() => signOut(auth)} className="p-2 bg-white/5 rounded-full text-red-500"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="p-5 space-y-6 max-w-lg mx-auto">

        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0f0f0f] p-5 rounded-[2.5rem] border border-white/5">
                <p className="text-[9px] font-black text-white/30 uppercase mb-1">Today Sales</p>
                <p className="text-xl font-black text-[#d4af37]">Rs.{todayOrders.reduce((s,o)=>s+o.total,0)}</p>
              </div>
              <div className="bg-[#0f0f0f] p-5 rounded-[2.5rem] border border-white/5">
                <p className="text-[9px] font-black text-white/30 uppercase mb-1">Month Total</p>
                <p className="text-xl font-black text-white">Rs.{monthOrders.reduce((s,o)=>s+o.total,0)}</p>
              </div>
            </div>

            <div className="bg-[#0f0f0f] p-6 rounded-[2.5rem] border border-white/5 shadow-xl">
              <h3 className="text-[10px] font-black text-[#d4af37] uppercase mb-5 tracking-[0.2em] flex items-center gap-2"><Package size={14}/> Daily Unit Summary</h3>
              <div className="space-y-3">
                {dailyBrandSummary.length === 0 && <p className="text-[10px] text-white/10 text-center py-4">No sales today</p>}
                {dailyBrandSummary.map(([name, qty], idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/5">
                    <span className="text-[11px] font-bold uppercase text-white/80">{name}</span>
                    <span className="text-sm font-black text-[#d4af37]">{qty} Units</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Recent Orders</h3>
                <button onClick={()=>setActiveTab('history')} className="text-[10px] font-black text-[#d4af37] uppercase">View History</button>
              </div>
              {data.orders.slice().reverse().slice(0, 5).map((o) => (
                <div key={o.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] border border-white/5 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-black uppercase text-white/90">{o.shopName}</h4>
                    <p className="text-[9px] text-white/20">{o.date} • <span className={o.status === 'PAID' ? 'text-green-500' : 'text-red-500'}>{o.status}</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-[#d4af37]">Rs.{o.total}</span>
                    <button onClick={() => deleteItem('orders', o.id)} className="text-white/10 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-500">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button onClick={()=>setSelectedRouteId('all')} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase border transition-all ${selectedRouteId==='all' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'border-white/10 text-white/40'}`}>All Routes</button>
              {data.routes.map(r => (
                <button key={r.id} onClick={()=>setSelectedRouteId(r.id)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase border whitespace-nowrap transition-all ${selectedRouteId===r.id ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'border-white/10 text-white/40'}`}>{r.name}</button>
              ))}
            </div>

            <button onClick={()=>setShowModal('shop')} className="w-full py-5 bg-[#0f0f0f] rounded-2xl border border-dashed border-[#d4af37]/20 flex items-center justify-center gap-2 text-[#d4af37] text-[10px] font-black uppercase"><Plus size={16}/> New Shop</button>

            <div className="grid gap-3">
              {data.shops.filter(s => selectedRouteId === 'all' || s.routeId === selectedRouteId).map(s => (
                <div key={s.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] border border-white/5 flex justify-between items-center shadow-lg">
                  <div><h4 className="text-sm font-black uppercase text-white/90">{s.name}</h4><p className="text-[9px] text-white/20 font-black uppercase">{s.area}</p></div>
                  <div className="flex gap-2">
                    <button onClick={()=>deleteItem('shops', s.id)} className="p-3 text-white/10 hover:text-red-500"><Trash2 size={16}/></button>
                    <button onClick={()=>{setSelectedShop(s); setShowModal('invoice')}} className="bg-[#d4af37] text-black px-8 py-3 rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">Bill</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-500">
             <div className="bg-[#0f0f0f] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                <Calendar size={18} className="text-[#d4af37]"/>
                <input type="date" onChange={(e) => setSearchDate(new Date(e.target.value).toLocaleDateString())} className="bg-transparent text-white text-xs font-black uppercase outline-none w-full" />
             </div>
             <p className="text-[10px] font-black text-white/20 uppercase px-2">Orders for: {searchDate}</p>
             {data.orders.filter(o => o.date === searchDate).length === 0 && <p className="text-center py-10 text-white/10 text-xs uppercase font-black">No Records Found</p>}
             {data.orders.filter(o => o.date === searchDate).map((o) => (
                <div key={o.id} className="bg-[#0f0f0f] p-5 rounded-[2rem] border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-black uppercase text-[#d4af37]">{o.shopName}</h4>
                    <div className="flex gap-2">
                      <button onClick={() => deleteItem('orders', o.id)} className="text-red-500/20 p-2"><Trash2 size={14}/></button>
                      <button onClick={() => shareWhatsApp(o)} className="text-green-500 p-2 bg-green-500/10 rounded-full"><Send size={14}/></button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {o.items.map((i, k) => <p key={k} className="text-[10px] text-white/40 uppercase">▪ {i.name} x {i.qty} = {i.subtotal}</p>)}
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                    <span className={`text-[8px] font-black px-2 py-1 rounded-full ${o.status==='PAID' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{o.status}</span>
                    <span className="text-sm font-black">Total: Rs.{o.total}</span>
                  </div>
                </div>
             ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in slide-in-from-left duration-500">
            <div className="bg-[#0f0f0f] p-6 rounded-[2.5rem] border border-white/5">
              <h3 className="text-[10px] font-black text-[#d4af37] uppercase mb-4">Profile Settings</h3>
              <input value={data.settings[0]?.name || ''} onChange={(e)=>addItem('settings', { name: e.target.value.toUpperCase() })} placeholder="REP NAME" className="w-full bg-black p-4 rounded-xl text-white border border-white/5 text-[12px] uppercase font-bold outline-none" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button onClick={()=>setShowModal('route')} className="w-full py-5 bg-[#0f0f0f] rounded-2xl border border-white/5 text-[10px] font-black uppercase flex items-center justify-center gap-2 text-[#d4af37] active:bg-[#d4af37] active:text-black transition-all"><MapPin size={16}/> Territory / Routes</button>

              {/* ROUTES LIST */}
              <div className="space-y-2 mb-4">
                {data.routes.map(r => (
                  <div key={r.id} className="bg-[#0f0f0f] p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <MapPin size={14} className="text-[#d4af37]/40"/>
                      <span className="text-xs font-black uppercase text-white/80">{r.name}</span>
                    </div>
                    <button onClick={() => deleteItem('routes', r.id)} className="p-2 text-white/5 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>

              <button onClick={()=>setShowModal('brand')} className="w-full py-5 bg-[#0f0f0f] rounded-2xl border border-white/5 text-[10px] font-black uppercase flex items-center justify-center gap-2 text-[#d4af37] active:bg-[#d4af37] active:text-black transition-all"><Package size={16}/> Product Brands</button>

              {/* BRANDS LIST */}
              <div className="space-y-2 mb-4">
                {data.brands.map(b => (
                  <div key={b.id} className="bg-[#0f0f0f] p-4 rounded-2xl border border-white/5 flex justify-between items-center shadow-lg">
                    <div>
                      <h4 className="text-xs font-black uppercase text-white/90">{b.name}</h4>
                      <p className="text-[9px] text-[#d4af37] font-black">{b.size} — Rs.{b.price}</p>
                    </div>
                    <button onClick={() => deleteItem('brands', b.id)} className="p-2 text-white/10 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>

              <button onClick={()=>setShowModal('expense')} className="w-full py-5 bg-red-500/5 rounded-2xl border border-red-500/10 text-[10px] font-black uppercase flex items-center justify-center gap-2 text-red-500 active:bg-red-500 active:text-white transition-all"><Wallet size={16}/> Daily Expenses</button>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-black text-white/20 uppercase px-2">Today Expenses</h3>
              {data.expenses.filter(e=>e.date === new Date().toLocaleDateString()).map(e => (
                <div key={e.id} className="bg-[#0f0f0f] p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                  <div><p className="text-xs font-bold uppercase">{e.reason}</p><p className="text-[9px] text-white/20">{e.date}</p></div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-500 font-black text-sm">Rs.{e.amount}</span>
                    <button onClick={()=>deleteItem('expenses', e.id)} className="text-white/10"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showModal === 'invoice' && (
        <div className="fixed inset-0 bg-black z-50 p-6 overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-center mb-8 sticky top-0 bg-black/90 py-4 z-10">
            <div><h2 className="text-xl font-black uppercase">{selectedShop?.name}</h2><p className="text-[10px] text-[#d4af37] font-black tracking-widest">CREATE INVOICE</p></div>
            <button onClick={()=>setShowModal(null)} className="p-3 bg-white/5 rounded-full"><X/></button>
          </div>

          <div className="flex gap-2 mb-8">
            <button onClick={()=>setPayStatus('PAID')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase border transition-all ${payStatus==='PAID' ? 'bg-green-500 text-black border-green-500' : 'border-white/10 text-white/30'}`}>Cash</button>
            <button onClick={()=>setPayStatus('CREDIT')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase border transition-all ${payStatus==='CREDIT' ? 'bg-red-500 text-black border-red-500' : 'border-white/10 text-white/30'}`}>Credit</button>
          </div>

          <div className="space-y-4 pb-48">
            {data.brands.map(b => (
              <div key={b.id} className="bg-[#0f0f0f] p-5 rounded-[2.5rem] flex items-center justify-between border border-white/5 shadow-xl">
                <div><h4 className="text-xs font-black uppercase text-white/80">{b.name}</h4><p className="text-[9px] text-white/20 font-bold">Rs.{b.price} | {b.size}</p></div>
                <div className="flex items-center gap-3">
                  <button onClick={()=>setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1)})} className="w-10 h-10 bg-black rounded-xl border border-white/5 text-[#d4af37] font-black active:scale-90">-</button>
                  <input type="number" value={cart[b.id] || ''} onChange={(e)=>setCart({...cart, [b.id]: e.target.value})} className="w-14 bg-transparent text-center font-black text-[#d4af37] text-lg outline-none" placeholder="0" />
                  <button onClick={()=>setCart({...cart, [b.id]: (Number(cart[b.id])||0)+1})} className="w-10 h-10 bg-black rounded-xl border border-white/5 text-[#d4af37] font-black active:scale-90">+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="fixed bottom-0 inset-x-0 p-8 bg-black/90 backdrop-blur-2xl border-t border-white/10">
            <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Grand Total</span><span className="text-3xl font-black text-[#d4af37]">Rs.{Object.entries(cart).reduce((s, [id, q]) => s + (data.brands.find(x=>x.id===id)?.price||0)*Number(q), 0)}</span></div>
            <button onClick={submitOrder} className="w-full py-6 bg-[#d4af37] text-black font-black rounded-[2rem] uppercase text-xs tracking-[0.2em] shadow-2xl shadow-[#d4af37]/20">Confirm & Submit</button>
          </div>
        </div>
      )}

      {showModal === 'receipt' && lastOrder && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-[#0f0f0f] w-full max-w-sm p-10 rounded-[3.5rem] border border-[#d4af37]/30 text-center shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="text-[#d4af37]" size={40}/></div>
            <h3 className="text-[#d4af37] font-black italic mb-2 uppercase text-xl">Order Confirmed!</h3>
            <div className="space-y-2 mb-8 text-left border-y border-white/5 py-6 mt-6">
               {lastOrder.items.map((i, k) => (
                 <div key={k} className="flex justify-between text-[11px] font-black uppercase"><span className="text-white/40">{i.name} x {i.qty}</span><span className="text-white">Rs.{i.subtotal}</span></div>
               ))}
               <div className="flex justify-between font-black text-lg text-[#d4af37] mt-4 pt-4 border-t border-white/5 uppercase italic"><span>Total</span><span>Rs.{lastOrder.total}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>shareWhatsApp(lastOrder)} className="flex-1 py-5 bg-[#25D366] text-white font-black rounded-2xl text-[10px] flex items-center justify-center gap-2 uppercase shadow-xl shadow-green-500/10"><Send size={16}/> Share</button>
              <button onClick={()=>setShowModal(null)} className="flex-1 py-5 bg-white/5 text-white font-black rounded-2xl text-[10px] uppercase">Close</button>
            </div>
          </div>
        </div>
      )}

      {['route', 'shop', 'brand', 'expense'].includes(showModal) && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-8 backdrop-blur-md">
          <div className="bg-[#0f0f0f] w-full max-w-sm p-10 rounded-[3rem] border border-white/5 shadow-2xl">
            <h3 className="text-center font-black text-[#d4af37] mb-8 uppercase text-xs tracking-widest">Add New {showModal}</h3>
            <form onSubmit={(e)=>{
              e.preventDefault();
              const f = e.target;
              if(showModal==='route') addItem('routes', { name: f.name.value.toUpperCase() });
              if(showModal==='shop') addItem('shops', { name: f.name.value.toUpperCase(), area: f.area.value.toUpperCase(), routeId: f.routeId.value });
              if(showModal==='brand') addItem('brands', { name: f.name.value.toUpperCase(), size: f.size.value.toUpperCase(), price: Number(f.price.value) });
              if(showModal==='expense') addItem('expenses', { reason: f.reason.value.toUpperCase(), amount: Number(f.amount.value) });
            }} className="space-y-4">
               {showModal==='shop' && (
                 <select name="routeId" className="w-full bg-black p-5 rounded-2xl text-white border border-white/5 text-xs font-black uppercase outline-none">
                    {data.routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                 </select>
               )}
               <input name={showModal==='expense' ? 'reason' : 'name'} placeholder="Name / Reason" className="w-full bg-black p-5 rounded-2xl text-white border border-white/5 text-[14px] font-bold uppercase outline-none focus:border-[#d4af37]/30" required />
               {showModal==='shop' && <input name="area" placeholder="Area" className="w-full bg-black p-5 rounded-2xl text-white border border-white/5 text-[14px] font-bold uppercase outline-none focus:border-[#d4af37]/30" required />}
               {showModal==='brand' && <input name="size" placeholder="Size (500ml)" className="w-full bg-black p-5 rounded-2xl text-white border border-white/5 text-[14px] font-bold uppercase outline-none focus:border-[#d4af37]/30" required />}
               {(showModal==='brand' || showModal==='expense') && <input name={showModal==='brand' ? 'price' : 'amount'} type="number" placeholder="Price / Amount" className="w-full bg-black p-5 rounded-2xl text-white border border-white/5 text-[14px] font-bold uppercase outline-none focus:border-[#d4af37]/30" required />}
               <button className="w-full py-5 bg-[#d4af37] text-black font-black rounded-[1.5rem] uppercase text-xs mt-4 shadow-xl shadow-[#d4af37]/10">Save Record</button>
               <button type="button" onClick={()=>setShowModal(null)} className="w-full text-white/20 text-[10px] font-black uppercase mt-4 tracking-widest">Cancel</button>
            </form>
          </div>
        </div>
      )}

      <nav className="fixed bottom-8 inset-x-8 h-20 bg-[#0a0a0a]/90 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 flex items-center justify-around z-40 shadow-2xl">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
          { id: 'shops', icon: Store, label: 'Shops' },
          { id: 'history', icon: History, label: 'Logs' },
          { id: 'settings', icon: Settings, label: 'Setup' }
        ].map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex flex-col items-center gap-1 transition-all ${activeTab===t.id ? 'text-[#d4af37] scale-110' : 'text-white/10'}`}>
            <t.icon size={22}/><span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </nav>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
