import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, deleteDoc, query, orderBy, where, enableIndexedDbPersistence, setDoc } from 'firebase/firestore';
import {
  LayoutDashboard, Store, Plus, X, Trash2, Crown, Settings, LogOut,
  MapPin, Package, History, Calendar, Sun, Moon, Save, Star, Search, ShoppingBag, ChevronDown
} from 'lucide-react';

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

try { enableIndexedDbPersistence(db); } catch (err) { console.log("Offline mode ready"); }

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSplash, setIsSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [data, setData] = useState({ routes: [], shops: [], orders: [], brands: [], settings: { name: '', company: '' } });
  const [cart, setCart] = useState({});
  const [selectedShop, setSelectedShop] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Filtering states
  const [shopSearch, setShopSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');

  useEffect(() => {
    const timer = setTimeout(() => setIsSplash(false), 2500);
    const unsubAuth = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => { clearTimeout(timer); unsubAuth(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const cols = ['routes', 'shops', 'orders', 'brands'];
    const unsubs = cols.map(c => {
      const q = query(collection(db, c), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
      return onSnapshot(q, s => setData(prev => ({ ...prev, [c]: s.docs.map(d => ({ id: d.id, ...d.data() })) })));
    });
    const unsubSettings = onSnapshot(doc(db, "settings", user.uid), (d) => {
      if (d.exists()) setData(prev => ({ ...prev, settings: d.data() }));
    });
    return () => { unsubs.forEach(f => f()); unsubSettings(); };
  }, [user]);

  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const getStats = (list) => {
      const summary = {};
      let totalSales = 0;
      list.forEach(o => {
        totalSales += o.total;
        o.items.forEach(i => {
          if (!summary[i.name]) summary[i.name] = { units: 0, rev: 0 };
          summary[i.name].units += i.qty;
          summary[i.name].rev += i.subtotal;
        });
      });
      const topBrand = Object.entries(summary).sort((a,b) => b[1].units - a[1].units)[0];
      return { totalSales, summary: Object.entries(summary), topBrand: topBrand ? topBrand[0] : 'N/A' };
    };

    const dailyOrders = data.orders.filter(o => o.dateString === todayStr);
    const monthlyOrders = data.orders.filter(o => {
      const d = new Date(o.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    return { daily: getStats(dailyOrders), monthly: getStats(monthlyOrders) };
  }, [data.orders]);

  // Shop Filtering Logic
  const filteredShops = useMemo(() => {
    return data.shops.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(shopSearch.toLowerCase()) || s.area.toLowerCase().includes(shopSearch.toLowerCase());
      const matchesRoute = selectedRouteFilter === 'ALL' || s.area === selectedRouteFilter;
      return matchesSearch && matchesRoute;
    });
  }, [data.shops, shopSearch, selectedRouteFilter]);

  if (isSplash || loading) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center">
      <Crown size={80} className="text-[#d4af37] animate-bounce" />
      <h1 className="mt-6 text-[#d4af37] text-3xl font-black tracking-widest italic uppercase">Monarch Pro</h1>
      <div className="mt-4 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#d4af37] animate-progress shadow-[0_0_15px_#d4af37]"></div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="h-screen bg-black flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8 text-center">
        <Crown size={70} className="text-[#d4af37] mx-auto" />
        <form onSubmit={async (e) => {
          e.preventDefault();
          try { await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value); }
          catch { alert("Invalid Access!"); }
        }} className="space-y-4">
          <input name="email" type="email" placeholder="EMAIL" className="w-full bg-[#111] p-5 rounded-3xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37]" required />
          <input name="password" type="password" placeholder="PASSWORD" className="w-full bg-[#111] p-5 rounded-3xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37]" required />
          <button className="w-full py-5 bg-[#d4af37] text-black font-black rounded-3xl shadow-lg">LOGIN</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen pb-40 transition-colors duration-500 ${isDarkMode ? "bg-[#050505] text-white" : "bg-gray-50 text-black"}`}>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>

      <header className={`p-6 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl border-b ${isDarkMode ? "bg-black/80 border-white/5" : "bg-white/80 border-black/5"}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#d4af37] rounded-xl text-black"><Crown size={22} /></div>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-none uppercase">{data.settings.company || "MONARCH"}</h1>
            <p className="text-[9px] font-bold opacity-40 uppercase tracking-widest">{data.settings.name || "Sales Rep"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-2xl border border-white/10 bg-white/5 text-[#d4af37]">{isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}</button>
          <button onClick={() => signOut(auth)} className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-8">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-[#d4af37] to-[#b8860b] p-8 rounded-[3rem] text-black shadow-2xl relative overflow-hidden group">
               <Star className="absolute -right-4 -top-4 opacity-10" size={140} />
               <p className="text-[11px] font-black uppercase opacity-60 mb-1 tracking-widest">Today's Revenue</p>
               <h2 className="text-5xl font-black italic tracking-tighter">Rs.{stats.daily.totalSales.toLocaleString()}</h2>
               <div className="mt-6 flex items-center gap-2 bg-black/10 w-fit px-4 py-1.5 rounded-full border border-black/5">
                 <span className="text-[11px] font-black uppercase italic">Top Brand: {stats.monthly.topBrand}</span>
               </div>
            </div>

            {/* Daily Summary Card */}
            <div className={`p-8 rounded-[3rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10 shadow-xl" : "bg-white border-black/5 shadow-md"}`}>
                <h3 className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.3em] mb-6">Today's Performance</h3>
                <div className="space-y-4">
                  {stats.daily.summary.map(([name, s]) => (
                    <div key={name} className="flex justify-between items-center p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5">
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight">{name}</p>
                          <p className="text-[10px] opacity-40 font-bold italic">{s.units} UNITS</p>
                        </div>
                        <span className="font-black text-sm tabular-nums text-[#d4af37]">Rs.{s.rev.toLocaleString()}</span>
                    </div>
                  ))}
                  {stats.daily.summary.length === 0 && <p className="text-[10px] opacity-30 italic text-center py-6">No sales today yet</p>}
                </div>
            </div>

            {/* Monthly Summary Card */}
            <div className={`p-8 rounded-[3rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10 shadow-xl" : "bg-white border-black/5 shadow-md"}`}>
                <h3 className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.3em] mb-6">Monthly Insights</h3>
                <div className="space-y-4">
                  {stats.monthly.summary.map(([name, s]) => (
                    <div key={name} className="flex justify-between items-center p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-white/5">
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight">{name}</p>
                          <p className="text-[10px] opacity-40 font-bold italic">{s.units} UNITS</p>
                        </div>
                        <span className="font-black text-sm tabular-nums text-[#d4af37]">Rs.{s.rev.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        )}

        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
            {/* Search and Route Filter */}
            <div className="space-y-3">
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/10"}`}>
                    <Search size={18} className="opacity-30"/>
                    <input value={shopSearch} onChange={(e) => setShopSearch(e.target.value)} placeholder="SEARCH SHOP OR AREA..." className="bg-transparent text-xs font-black uppercase outline-none w-full" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setSelectedRouteFilter('ALL')} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border ${selectedRouteFilter === 'ALL' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-black/20 border-white/10 text-white/40'}`}>ALL ROUTES</button>
                    {data.routes.map(r => (
                        <button key={r.id} onClick={() => setSelectedRouteFilter(r.name)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border ${selectedRouteFilter === r.name ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-black/20 border-white/10 text-white/40'}`}>{r.name}</button>
                    ))}
                </div>
            </div>

            <button onClick={() => setShowModal('shop')} className="w-full py-5 rounded-3xl border-2 border-dashed border-[#d4af37]/40 text-[#d4af37] font-black uppercase text-xs flex items-center justify-center gap-2 bg-[#d4af37]/5">
              <Plus size={18}/> New Shop Entry
            </button>
            
            <div className="grid gap-3">
                {filteredShops.map(s => (
                <div key={s.id} className={`p-5 rounded-[2.5rem] border flex justify-between items-center ${isDarkMode ? "bg-[#0f0f0f] border-white/5" : "bg-white border-black/5"}`}>
                    <div className="flex items-center gap-4">
                    <div className="p-4 bg-[#d4af37]/10 rounded-2xl text-[#d4af37]"><Store size={22}/></div>
                    <div>
                        <h4 className="text-sm font-black uppercase leading-tight">{s.name}</h4>
                        <p className="text-[10px] opacity-40 font-bold uppercase mt-1 tracking-tighter italic">{s.area}</p>
                    </div>
                    </div>
                    <button onClick={() => { setSelectedShop(s); setShowModal('invoice'); }} className="bg-[#d4af37] text-black px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-[#d4af37]/20 active:scale-90 transition-all">BILL</button>
                </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-500">
             <div className={`p-5 rounded-3xl border flex items-center gap-4 ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/5"}`}>
                <Calendar size={20} className="text-[#d4af37]"/>
                <input type="date" className="bg-transparent text-sm font-black uppercase outline-none w-full [color-scheme:dark]"
                 onChange={(e) => setSearchDate(e.target.value)} value={searchDate}/>
            </div>
            {data.orders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === searchDate).map((o) => (
              <div key={o.id} className={`p-7 rounded-[3rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/5 shadow-2xl" : "bg-white border-black/5 shadow-lg"}`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#d4af37] tracking-wider mb-1">{o.shopName}</h4>
                    <p className="text-[9px] opacity-40 font-black uppercase tracking-widest">{o.companyName}</p>
                  </div>
                  <button onClick={async () => { if(window.confirm('Delete Bill?')) await deleteDoc(doc(db, 'orders', o.id)) }} className="text-red-500/20 hover:text-red-500 p-2"><Trash2 size={20}/></button>
                </div>
                <div className="space-y-3 border-y border-white/5 py-4 my-4">
                  {o.items.map((i, k) => (
                    <div key={k} className="flex justify-between text-[11px] uppercase font-bold">
                      <span className="opacity-50">{i.name} <span className="text-[#d4af37] ml-2">x {i.qty}</span></span>
                      <span className="tabular-nums">Rs.{i.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center font-black">
                    <span className="text-[10px] opacity-30 tracking-widest uppercase italic">Total Bill</span>
                    <span className="text-xl text-[#d4af37] tabular-nums">Rs.{o.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 pb-20">
            <form onSubmit={handleSaveProfile} className={`p-8 rounded-[3rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10 shadow-xl" : "bg-white border-black/10"} space-y-5`}>
              <h3 className="text-[11px] font-black text-[#d4af37] uppercase tracking-[0.3em] mb-4">Identity Setup</h3>
              <input name="repName" defaultValue={data.settings.name} placeholder="YOUR FULL NAME" className="w-full bg-black/20 p-5 rounded-2xl border border-white/5 text-sm font-black uppercase outline-none focus:border-[#d4af37]" />
              <input name="companyName" defaultValue={data.settings.company} placeholder="COMPANY NAME (EX: PEPSI)" className="w-full bg-black/20 p-5 rounded-2xl border border-white/5 text-sm font-black uppercase outline-none focus:border-[#d4af37]" />
              <button className="w-full py-5 bg-green-600 text-black font-black rounded-2xl text-[10px] uppercase shadow-xl flex items-center justify-center gap-2"><Save size={18}/> SAVE CHANGES</button>
            </form>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowModal('route')} className="py-6 rounded-[2rem] border border-white/5 bg-[#0f0f0f] text-[#d4af37] font-black uppercase text-[10px] flex flex-col items-center gap-3"><MapPin size={22}/> ADD ROUTE</button>
              <button onClick={() => setShowModal('brand')} className="py-6 rounded-[2rem] border border-white/5 bg-[#0f0f0f] text-[#d4af37] font-black uppercase text-[10px] flex flex-col items-center gap-3"><Package size={22}/> ADD BRAND</button>
            </div>

            <div className="space-y-4">
               <h4 className="text-[10px] font-black opacity-30 uppercase tracking-[0.4em] px-4">Manage Master Data</h4>
               <div className="grid gap-3">
                  {data.brands.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-5 dark:bg-white/5 bg-black/5 rounded-[2rem] border dark:border-white/5 border-black/5">
                      <span className="text-[11px] font-black uppercase tracking-tight">{b.name} <span className="text-[#d4af37] ml-2">@ Rs.{b.price}</span></span>
                      <button onClick={async () => { if(window.confirm('Delete Brand?')) await deleteDoc(doc(db, 'brands', b.id)) }} className="text-red-500/40 p-2"><Trash2 size={18}/></button>
                    </div>
                  ))}
                  {data.routes.map(r => (
                    <div key={r.id} className="flex justify-between items-center p-5 dark:bg-white/5 bg-black/5 rounded-[2rem] border dark:border-white/5 border-black/5">
                      <span className="text-[11px] font-black uppercase tracking-widest">{r.name}</span>
                      <button onClick={async () => { if(window.confirm('Delete Route?')) await deleteDoc(doc(db, 'routes', r.id)) }} className="text-red-500/40 p-2"><Trash2 size={18}/></button>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-32 w-full text-center pointer-events-none z-0">
        <p className="text-[10px] font-black italic tracking-[0.5em] uppercase opacity-10">For My Love</p>
      </footer>

      <nav className={`fixed bottom-8 inset-x-8 h-22 rounded-[3rem] border flex items-center justify-around z-50 shadow-2xl transition-all ${isDarkMode ? "bg-black/90 border-white/10 shadow-[#000]" : "bg-white/95 border-black/10 shadow-gray-200"}`}>
        {[ {id: 'dashboard', icon: LayoutDashboard}, {id: 'shops', icon: Store}, {id: 'history', icon: History}, {id: 'settings', icon: Settings} ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`p-5 transition-all duration-300 relative ${activeTab === t.id ? 'text-[#d4af37] scale-125' : 'opacity-20'}`}>
            <t.icon size={26} strokeWidth={activeTab === t.id ? 2.5 : 2} />
            {activeTab === t.id && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#d4af37] rounded-full shadow-[0_0_10px_#d4af37]"></div>}
          </button>
        ))}
      </nav>

      {/* Invoice Modal */}
      {showModal === 'invoice' && (
        <div className="fixed inset-0 bg-black z-[100] animate-in slide-in-from-bottom duration-500 overflow-y-auto">
          <div className="p-8 max-w-lg mx-auto pb-60">
            <div className="flex justify-between items-center mb-10 sticky top-0 bg-black py-4 z-10 border-b border-white/10">
               <div>
                 <h2 className="text-3xl font-black uppercase text-white tracking-tighter">{selectedShop?.name}</h2>
                 <p className="text-[11px] text-[#d4af37] font-black tracking-[0.2em] uppercase italic">{data.settings.company || "OFFICIAL BILL"}</p>
               </div>
               <button onClick={() => { setShowModal(null); setCart({}); }} className="p-4 bg-white/10 rounded-full text-white"><X size={24}/></button>
            </div>
            <div className="space-y-4">
              {data.brands.map(b => (
                <div key={b.id} className="bg-[#0f0f0f] p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between shadow-xl">
                  <div className="flex-1">
                    <h4 className="text-base font-black uppercase text-white leading-tight">{b.name}</h4>
                    <p className="text-xs text-[#d4af37] font-bold mt-1 tracking-widest">Rs.{b.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <button onClick={() => setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1)})} className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-2xl active:bg-[#d4af37] active:text-black">-</button>
                    <input type="number" inputMode="numeric" value={cart[b.id] || ''} onChange={(e) => setCart({...cart, [b.id]: e.target.value})} className="w-16 bg-transparent text-center font-black text-[#d4af37] text-2xl outline-none" placeholder="0" />
                    <button onClick={() => setCart({...cart, [b.id]: (Number(cart[b.id])||0)+1})} className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-2xl active:bg-[#d4af37] active:text-black">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="fixed bottom-0 inset-x-0 p-10 bg-black/95 border-t border-white/10 backdrop-blur-2xl flex flex-col items-center">
               <div className="flex justify-between w-full mb-6 px-4 text-white">
                 <span className="font-black uppercase text-xs opacity-40 tracking-widest">Grand Total</span>
                 <span className="font-black text-3xl tabular-nums">Rs.{Object.entries(cart).reduce((acc, [id, q]) => acc + (data.brands.find(b=>b.id===id)?.price||0) * Number(q), 0).toLocaleString()}</span>
               </div>
               <button onClick={async () => {
                 const items = Object.entries(cart).filter(([_, q]) => q > 0).map(([id, q]) => {
                   const b = data.brands.find(x => x.id === id);
                   return { name: b.name, qty: Number(q), price: b.price, subtotal: b.price * Number(q) };
                 });
                 if (!items.length) return alert("Empty Cart!");
                 await addDoc(collection(db, 'orders'), {
                   shopName: selectedShop.name,
                   companyName: data.settings.company || "MONARCH",
                   items,
                   total: items.reduce((s, i) => s + i.subtotal, 0),
                   userId: user.uid,
                   timestamp: Date.now(),
                   dateString: new Date().toLocaleDateString()
                 });
                 setCart({}); setShowModal(null); alert("Bill Confirmed!");
               }} className="w-full py-7 bg-[#d4af37] text-black font-black rounded-3xl uppercase shadow-[0_15px_30px_rgba(212,175,55,0.2)] active:scale-95 transition-all tracking-widest text-xs">Confirm Order</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modals */}
      {['route', 'shop', 'brand'].includes(showModal) && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-8 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-[#0f0f0f] w-full max-w-sm p-10 rounded-[3.5rem] border border-[#d4af37]/30 shadow-2xl relative">
            <button onClick={() => setShowModal(null)} className="absolute top-8 right-8 text-white/20"><X size={24}/></button>
            <h3 className="text-center font-black text-[#d4af37] mb-10 uppercase text-[10px] tracking-[0.4em]">Register New {showModal}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault(); const f = e.target;
              const payload = { userId: user.uid, timestamp: Date.now() };
              if(showModal==='route') await addDoc(collection(db, 'routes'), { ...payload, name: f.name.value.toUpperCase() });
              if(showModal==='shop') await addDoc(collection(db, 'shops'), { ...payload, name: f.name.value.toUpperCase(), area: f.area.value });
              if(showModal==='brand') await addDoc(collection(db, 'brands'), { ...payload, name: f.name.value.toUpperCase(), price: Number(f.price.value) });
              setShowModal(null);
            }} className="space-y-5">
              <input name="name" placeholder="NAME" className="w-full bg-black/40 p-6 rounded-3xl border border-white/5 text-white font-bold uppercase outline-none focus:border-[#d4af37] text-base" required autoComplete="off" />
              {showModal==='shop' && (
                <div className="relative">
                    <select name="area" className="w-full bg-black/40 p-6 rounded-3xl border border-white/5 text-white font-bold uppercase outline-none focus:border-[#d4af37] appearance-none text-sm" required>
                        <option value="">SELECT ROUTE</option>
                        {data.routes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 opacity-30" size={18}/>
                </div>
              )}
              {showModal==='brand' && <input name="price" type="number" placeholder="UNIT PRICE" className="w-full bg-black/40 p-6 rounded-3xl border border-white/5 text-white font-bold uppercase outline-none focus:border-[#d4af37] text-base" required autoComplete="off" />}
              <button className="w-full py-6 bg-[#d4af37] text-black font-black rounded-3xl uppercase text-[10px] tracking-widest mt-4">Save Entry</button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
        .animate-progress { animation: progress 2.5s ease-in-out; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
