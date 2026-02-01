import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, deleteDoc, updateDoc, query, orderBy, where, enableIndexedDbPersistence, setDoc } from 'firebase/firestore';
import {
  LayoutDashboard, Store, Plus, X, Trash2, Crown, Settings, LogOut, Edit2,
  MapPin, Package, History, Calendar, Sun, Moon, Save, Star, Search, CheckCircle2, ChevronDown, Share2, TrendingUp, Wallet
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
  const [data, setData] = useState({ routes: [], shops: [], orders: [], brands: [], expenses: [], settings: { name: '', company: '' } });
  const [cart, setCart] = useState({});
  const [selectedShop, setSelectedShop] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastOrder, setLastOrder] = useState(null);

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [shopSearch, setShopSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');

  useEffect(() => {
    const timer = setTimeout(() => setIsSplash(false), 2500);
    const unsubAuth = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => { clearTimeout(timer); unsubAuth(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const cols = ['routes', 'shops', 'orders', 'brands', 'expenses'];
    const unsubs = cols.map(c => {
      const q = query(collection(db, c), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
      return onSnapshot(q, s => setData(prev => ({ ...prev, [c]: s.docs.map(d => ({ id: d.id, ...d.data() })) })));
    });
    const unsubSettings = onSnapshot(doc(db, "settings", user.uid), (d) => {
      if (d.exists()) setData(prev => ({ ...prev, settings: d.data() }));
    });
    return () => { unsubs.forEach(f => f()); unsubSettings(); };
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const name = e.target.repName.value.toUpperCase();
      const company = e.target.companyName.value.toUpperCase();
      await setDoc(doc(db, "settings", user.uid), { name, company, userId: user.uid });
      alert("Settings Saved!");
    } catch (err) { alert("Error: " + err.message); }
  };

  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const getStats = (list, expList = []) => {
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
      const totalExp = expList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const topBrand = Object.entries(summary).sort((a,b) => b[1].units - a[1].units)[0];
      return { totalSales, totalExp, summary: Object.entries(summary), topBrand: topBrand ? topBrand[0] : 'N/A' };
    };

    const dailyOrders = data.orders.filter(o => o.dateString === todayStr);
    const dailyExp = data.expenses.filter(e => new Date(e.timestamp).toLocaleDateString() === todayStr);
    
    const monthlyOrders = data.orders.filter(o => {
      const d = new Date(o.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyExp = data.expenses.filter(e => {
        const d = new Date(e.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    return { daily: getStats(dailyOrders, dailyExp), monthly: getStats(monthlyOrders, monthlyExp) };
  }, [data.orders, data.expenses]);

  const filteredShops = useMemo(() => {
    return data.shops.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(shopSearch.toLowerCase()) || s.area.toLowerCase().includes(shopSearch.toLowerCase());
      const matchesRoute = selectedRouteFilter === 'ALL' || s.area === selectedRouteFilter;
      return matchesSearch && matchesRoute;
    });
  }, [data.shops, shopSearch, selectedRouteFilter]);

  const shareToWhatsApp = (order) => {
    let msg = `*${order.companyName} - INVOICE*\n`;
    msg += `--------------------------\n`;
    msg += `🏪 *Shop:* ${order.shopName}\n`;
    msg += `📅 *Date:* ${new Date(order.timestamp).toLocaleString()}\n\n`;
    msg += `*ITEMS:*\n`;
    order.items.forEach(i => {
      msg += `• ${i.name} (${i.qty} x ${i.price}) = *Rs.${i.subtotal.toLocaleString()}*\n`;
    });
    msg += `\n--------------------------\n`;
    msg += `💰 *TOTAL BILL: Rs.${order.total.toLocaleString()}*\n`;
    msg += `--------------------------\n`;
    msg += `_Generated by Monarch Pro_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (isSplash || loading) return (
    <div className="h-screen bg-[#050505] flex flex-col items-center justify-center">
      <Crown size={60} className="text-[#d4af37] animate-bounce" />
      <h1 className="mt-4 text-[#d4af37] text-xl font-black tracking-widest italic uppercase">Monarch Pro</h1>
      <div className="mt-4 w-32 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#d4af37] animate-progress shadow-[0_0_15px_#d4af37]"></div></div>
    </div>
  );

  if (!user) return (
    <div className="h-screen bg-black flex items-center justify-center p-8">
      <div className="w-full max-sm space-y-8 text-center">
        <Crown size={50} className="text-[#d4af37] mx-auto" />
        <h2 className="text-white font-black text-sm tracking-widest uppercase">{isRegisterMode ? "Create Account" : "Welcome Back"}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const email = e.target.email.value;
          const password = e.target.password.value;
          try {
            if(isRegisterMode) { await createUserWithEmailAndPassword(auth, email, password); }
            else { await signInWithEmailAndPassword(auth, email, password); }
          } catch (err) { alert(err.message); }
        }} className="space-y-4">
          <input name="email" type="email" placeholder="EMAIL" className="w-full bg-[#111] p-4 rounded-2xl border border-white/10 text-white text-[10px] font-bold outline-none focus:border-[#d4af37]" required />
          <input name="password" type="password" placeholder="PASSWORD" className="w-full bg-[#111] p-4 rounded-2xl border border-white/10 text-white text-[10px] font-bold outline-none focus:border-[#d4af37]" required />
          <button className="w-full py-4 bg-[#d4af37] text-black font-black rounded-2xl shadow-lg text-[10px] uppercase">{isRegisterMode ? "Sign Up" : "Login"}</button>
          <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-[#d4af37] text-[9px] font-black uppercase tracking-widest opacity-60">
            {isRegisterMode ? "Already have an account? Login" : "New User? Create Account"}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen pb-40 transition-colors duration-500 ${isDarkMode ? "bg-[#050505] text-white" : "bg-gray-50 text-black"}`}>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>

      <header className={`p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl border-b ${isDarkMode ? "bg-black/80 border-white/5" : "bg-white/80 border-black/5"}`}>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#d4af37] rounded-lg text-black"><Crown size={18} /></div>
          <div>
            <h1 className="font-black text-sm tracking-tight leading-none uppercase">{data.settings.company || "MONARCH"}</h1>
            <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{data.settings.name || "Sales Rep"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-xl border border-white/10 bg-white/5 text-[#d4af37]">{isDarkMode ? <Sun size={16}/> : <Moon size={16}/>}</button>
          <button onClick={() => signOut(auth)} className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20"><LogOut size={16}/></button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-[#d4af37] to-[#b8860b] p-6 rounded-[2.5rem] text-black shadow-2xl relative overflow-hidden">
                <Star className="absolute -right-4 -top-4 opacity-10" size={100} />
                <p className="text-[9px] font-black uppercase opacity-60 mb-1 tracking-widest">Today's Revenue</p>
                <h2 className="text-3xl font-black italic tracking-tighter">Rs.{stats.daily.totalSales.toLocaleString()}</h2>
                <div className="mt-4 flex items-center gap-2 bg-black/10 w-fit px-3 py-1 rounded-full border border-black/5">
                  <span className="text-[9px] font-black uppercase italic">Top: {stats.daily.topBrand}</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className={`p-4 rounded-[2rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/5"}`}>
                    <p className="text-[8px] font-black opacity-40 uppercase mb-1">Daily Expenses</p>
                    <p className="text-sm font-black text-red-500">Rs.{stats.daily.totalExp.toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-[2rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/5"}`}>
                    <p className="text-[8px] font-black opacity-40 uppercase mb-1">Net Profit</p>
                    <p className="text-sm font-black text-green-500">Rs.{(stats.daily.totalSales - stats.daily.totalExp).toLocaleString()}</p>
                </div>
            </div>

            <div className={`p-6 rounded-[2.5rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/10"}`}>
                <h3 className="text-[9px] font-black text-[#d4af37] uppercase tracking-widest mb-4">Monthly Performance</h3>
                <div className="space-y-2">
                  {stats.monthly.summary.map(([name, s]) => (
                    <div key={name} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] font-black uppercase">{name}</span>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-[#d4af37]">{s.units} U</p>
                          <p className="text-[8px] opacity-40 font-bold">Rs.{s.rev.toLocaleString()}</p>
                        </div>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        )}

        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
            <div className={`p-3 rounded-xl border flex items-center gap-3 ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/10"}`}>
                <Search size={14} className="opacity-30"/>
                <input value={shopSearch} onChange={(e) => setShopSearch(e.target.value)} placeholder="SEARCH..." className="bg-transparent text-[10px] font-black uppercase outline-none w-full" />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['ALL', ...data.routes.map(r => r.name)].map(route => (
                    <button key={route} onClick={() => setSelectedRouteFilter(route)} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all whitespace-nowrap border ${selectedRouteFilter === route ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-black/20 border-white/10 text-white/40'}`}>{route}</button>
                ))}
            </div>
            <button onClick={() => setShowModal('shop')} className="w-full py-4 rounded-2xl border-2 border-dashed border-[#d4af37]/40 text-[#d4af37] font-black uppercase text-[10px] flex items-center justify-center gap-2 bg-[#d4af37]/5"><Plus size={14}/> Add Shop</button>
            <div className="grid gap-2">
                {filteredShops.map(s => (
                <div key={s.id} className={`p-4 rounded-[1.5rem] border flex justify-between items-center ${isDarkMode ? "bg-[#0f0f0f] border-white/5" : "bg-white border-black/5"}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#d4af37]/10 rounded-xl text-[#d4af37]"><Store size={18}/></div>
                      <div>
                          <h4 className="text-[11px] font-black uppercase leading-tight">{s.name}</h4>
                          <p className="text-[9px] opacity-40 font-bold uppercase tracking-tighter italic">{s.area}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={async () => { if(window.confirm('Delete Shop?')) await deleteDoc(doc(db, 'shops', s.id)) }} className="p-2 text-red-500/30"><Trash2 size={16}/></button>
                        <button onClick={() => { setSelectedShop(s); setShowModal('invoice'); }} className="bg-[#d4af37] text-black px-5 py-2.5 rounded-xl text-[9px] font-black uppercase shadow-lg">BILL</button>
                    </div>
                </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-500">
             <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/5"}`}>
                <Calendar size={16} className="text-[#d4af37]"/>
                <input type="date" className="bg-transparent text-[10px] font-black uppercase outline-none w-full [color-scheme:dark]" onChange={(e) => setSearchDate(e.target.value)} value={searchDate}/>
            </div>
            {data.orders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === searchDate).map((o) => (
              <div key={o.id} className={`p-5 rounded-[2rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/5" : "bg-white border-black/5"}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-[#d4af37]">{o.shopName}</h4>
                    <p className="text-[8px] opacity-40 font-black uppercase">{o.companyName}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => shareToWhatsApp(o)} className="text-[#d4af37] p-1"><Share2 size={16}/></button>
                    <button onClick={async () => { if(window.confirm('Delete Bill?')) await deleteDoc(doc(db, 'orders', o.id)) }} className="text-red-500/20 p-1"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="space-y-1.5 border-y border-white/5 py-3 my-3">
                  {o.items.map((i, k) => (
                    <div key={k} className="flex justify-between text-[9px] uppercase font-bold">
                      <span className="opacity-50">{i.name} x {i.qty}</span>
                      <span>Rs.{i.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center font-black">
                    <span className="text-[9px] opacity-30 uppercase">Total</span>
                    <span className="text-sm text-[#d4af37]">Rs.{o.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500 pb-20">
            <form onSubmit={handleSaveProfile} className={`p-6 rounded-[2rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/10"} space-y-4`}>
              <h3 className="text-[9px] font-black text-[#d4af37] uppercase tracking-widest">Profile</h3>
              <input name="repName" defaultValue={data.settings.name} placeholder="NAME" className="w-full bg-black/20 p-4 rounded-xl border border-white/5 text-[10px] font-black uppercase outline-none focus:border-[#d4af37]" />
              <input name="companyName" defaultValue={data.settings.company} placeholder="COMPANY" className="w-full bg-black/20 p-4 rounded-xl border border-white/5 text-[10px] font-black uppercase outline-none focus:border-[#d4af37]" />
              <button className="w-full py-4 bg-green-600 text-white font-black rounded-xl text-[9px] uppercase flex items-center justify-center gap-2"><Save size={14}/> SAVE</button>
            </form>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowModal('route')} className="py-5 rounded-2xl border border-white/5 bg-[#0f0f0f] text-[#d4af37] font-black uppercase text-[9px] flex flex-col items-center gap-1"><MapPin size={18}/> Route</button>
              <button onClick={() => setShowModal('brand')} className="py-5 rounded-2xl border border-white/5 bg-[#0f0f0f] text-[#d4af37] font-black uppercase text-[9px] flex flex-col items-center gap-1"><Package size={18}/> Brand</button>
            </div>

            {/* --- DAILY EXPENSES --- */}
            <div className={`p-6 rounded-[2rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/10"}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-[9px] font-black text-red-500 uppercase tracking-widest">Daily Expenses</h3>
                    <button onClick={() => setShowModal('expense')} className="p-1.5 bg-red-500/10 text-red-500 rounded-lg"><Plus size={14}/></button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {data.expenses.map(e => (
                        <div key={e.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                            <div>
                                <p className="text-[10px] font-black uppercase">{e.note}</p>
                                <p className="text-[8px] opacity-40 font-bold">{new Date(e.timestamp).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-red-400">Rs.{e.amount}</span>
                                <button onClick={async () => { if(window.confirm('Delete Expense?')) await deleteDoc(doc(db, 'expenses', e.id)) }} className="text-red-500/30"><Trash2 size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-[9px] font-black opacity-30 uppercase px-4 mb-2">Manage Brands</h4>
                <div className="grid gap-2">
                {data.brands.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-[10px] font-black uppercase">{b.name} ({b.size}) - Rs.{b.price}</span>
                    <div className="flex gap-1">
                        <button onClick={() => { setEditItem(b); setShowModal('editBrand'); }} className="text-[#d4af37]/40 p-1.5"><Edit2 size={14}/></button>
                        <button onClick={async () => { if(window.confirm('Delete Brand?')) await deleteDoc(doc(db, 'brands', b.id)) }} className="text-red-500/40 p-1.5"><Trash2 size={14}/></button>
                    </div>
                    </div>
                ))}
                </div>
            </div>
          </div>
        )}
      </main>

      <nav className={`fixed bottom-6 inset-x-6 h-18 rounded-[2rem] border flex items-center justify-around z-50 shadow-2xl ${isDarkMode ? "bg-black/90 border-white/10" : "bg-white/95 border-black/10"}`}>
        {[ {id: 'dashboard', icon: LayoutDashboard}, {id: 'shops', icon: Store}, {id: 'history', icon: History}, {id: 'settings', icon: Settings} ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`p-4 transition-all relative ${activeTab === t.id ? 'text-[#d4af37] scale-110' : 'opacity-20'}`}>
            <t.icon size={20} />
            {activeTab === t.id && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#d4af37] rounded-full"></div>}
          </button>
        ))}
      </nav>

      {/* --- INVOICE MODAL --- */}
      {showModal === 'invoice' && (
        <div className="fixed inset-0 bg-black z-[100] animate-in slide-in-from-bottom overflow-y-auto p-6">
            <div className="max-w-lg mx-auto pb-40">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-black py-4 border-b border-white/10">
                 <div>
                   <h2 className="text-xl font-black uppercase text-white">{selectedShop?.name}</h2>
                   <p className="text-[9px] text-[#d4af37] font-black uppercase tracking-widest">New Bill</p>
                 </div>
                 <button onClick={() => { setShowModal(null); setCart({}); }} className="p-3 bg-white/10 rounded-full text-white"><X size={20}/></button>
              </div>
              <div className="space-y-3">
                {data.brands.map(b => (
                  <div key={b.id} className="bg-[#0f0f0f] p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-[11px] font-black uppercase text-white">{b.name} ({b.size})</h4>
                      <p className="text-[10px] text-[#d4af37] font-bold">Rs.{b.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1)})} className="w-10 h-10 bg-white/5 rounded-xl text-white font-black text-lg">-</button>
                      <input type="number" value={cart[b.id] || ''} onChange={(e) => setCart({...cart, [b.id]: e.target.value})} className="w-8 bg-transparent text-center font-black text-[#d4af37] text-sm outline-none" placeholder="0" />
                      <button onClick={() => setCart({...cart, [b.id]: (Number(cart[b.id])||0)+1})} className="w-10 h-10 bg-white/5 rounded-xl text-white font-black text-lg">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="fixed bottom-0 inset-x-0 p-8 bg-black/95 border-t border-white/10 backdrop-blur-2xl flex flex-col items-center">
                 <div className="flex justify-between w-full mb-4 px-2 text-white">
                   <span className="font-black uppercase text-[10px] opacity-40">Total</span>
                   <span className="font-black text-xl">Rs.{Object.entries(cart).reduce((acc, [id, q]) => acc + (data.brands.find(b=>b.id===id)?.price||0) * Number(q), 0).toLocaleString()}</span>
                 </div>
                 <button onClick={async () => {
                   const items = Object.entries(cart).filter(([_, q]) => q > 0).map(([id, q]) => {
                     const b = data.brands.find(x => x.id === id);
                     return { name: `${b.name} ${b.size}`, qty: Number(q), price: b.price, subtotal: b.price * Number(q) };
                   });
                   if (!items.length) return alert("Empty Cart!");
                   const orderData = {
                     shopName: selectedShop.name,
                     companyName: data.settings.company || "MONARCH",
                     items,
                     total: items.reduce((s, i) => s + i.subtotal, 0),
                     userId: user.uid,
                     timestamp: Date.now(),
                     dateString: new Date().toLocaleDateString()
                   };
                   await addDoc(collection(db, 'orders'), orderData);
                   setCart({}); setLastOrder(orderData); setShowModal('preview');
                 }} className="w-full py-4 bg-[#d4af37] text-black font-black rounded-2xl uppercase tracking-widest text-[10px]">Confirm Order</button>
              </div>
            </div>
        </div>
      )}

      {/* --- ADD / EDIT / EXPENSE MODALS --- */}
      {['route', 'shop', 'brand', 'editBrand', 'expense'].includes(showModal) && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl">
          <div className="bg-[#0f0f0f] w-full max-w-sm p-8 rounded-[2.5rem] border border-white/10 relative">
            <button onClick={() => { setShowModal(null); setEditItem(null); }} className="absolute top-6 right-6 text-white/20"><X size={20}/></button>
            <h3 className="text-center font-black text-[#d4af37] mb-8 uppercase text-[10px] tracking-widest">{showModal} Entry</h3>
            <form onSubmit={async (e) => {
              e.preventDefault(); const f = e.target;
              const payload = { userId: user.uid, timestamp: Date.now() };

              if(showModal==='route') await addDoc(collection(db, 'routes'), { ...payload, name: f.name.value.toUpperCase() });
              if(showModal==='shop') await addDoc(collection(db, 'shops'), { ...payload, name: f.name.value.toUpperCase(), area: f.area.value });
              if(showModal==='brand') await addDoc(collection(db, 'brands'), { ...payload, name: f.name.value.toUpperCase(), size: f.size.value.toUpperCase(), price: parseFloat(f.price.value) });
              if(showModal==='editBrand') await updateDoc(doc(db, 'brands', editItem.id), { name: f.name.value.toUpperCase(), size: f.size.value.toUpperCase(), price: parseFloat(f.price.value) });
              if(showModal==='expense') await addDoc(collection(db, 'expenses'), { ...payload, note: f.note.value.toUpperCase(), amount: parseFloat(f.amount.value) });

              setShowModal(null); setEditItem(null);
            }} className="space-y-4">
              {showModal === 'expense' ? (
                <>
                  <input name="note" placeholder="EXPENSE NOTE (FUEL, MEALS)" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white text-[10px] font-bold uppercase outline-none focus:border-red-500" required />
                  <input name="amount" type="number" step="0.01" placeholder="AMOUNT" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white text-[10px] font-bold outline-none focus:border-red-500" required />
                </>
              ) : (
                <>
                  <input name="name" defaultValue={editItem?.name || ''} placeholder="NAME" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white text-[10px] font-bold uppercase outline-none focus:border-[#d4af37]" required />
                  {showModal==='shop' && (
                    <div className="relative">
                        <select name="area" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white text-[10px] font-bold uppercase appearance-none" required>
                            <option value="">SELECT ROUTE</option>
                            {data.routes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30" size={14}/>
                    </div>
                  )}
                  {(showModal==='brand' || showModal==='editBrand') && (
                    <>
                      <input name="size" defaultValue={editItem?.size || ''} placeholder="SIZE (500ML / 1KG)" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white text-[10px] font-bold uppercase outline-none focus:border-[#d4af37]" required />
                      <input name="price" defaultValue={editItem?.price || ''} type="number" step="0.01" placeholder="UNIT PRICE" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white text-[10px] font-bold outline-none focus:border-[#d4af37]" required />
                    </>
                  )}
                </>
              )}
              <button className={`w-full py-4 ${showModal==='expense'?'bg-red-500':'bg-[#d4af37]'} text-black font-black rounded-2xl uppercase text-[10px] tracking-widest`}>Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {showModal === 'preview' && lastOrder && (
        <div className="fixed inset-0 bg-black z-[110] flex items-center justify-center p-6 backdrop-blur-3xl">
          <div className="bg-[#0f0f0f] w-full max-w-sm p-8 rounded-[2.5rem] border border-[#d4af37]/30 shadow-2xl text-center">
            <CheckCircle2 size={40} className="text-green-500 mx-auto mb-4" />
            <h3 className="text-sm font-black text-white uppercase mb-4">Bill Confirmed!</h3>
            <button onClick={() => shareToWhatsApp(lastOrder)} className="w-full py-4 bg-[#25D366] text-white font-black rounded-xl uppercase text-[10px] mb-2">WhatsApp Share</button>
            <button onClick={() => { setShowModal(null); setLastOrder(null); }} className="w-full py-4 bg-white/5 text-white/40 font-black rounded-xl uppercase text-[10px]">Close</button>
          </div>
        </div>
      )}

      <style>{`.animate-progress { animation: progress 2.5s ease-in-out; } @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } } .scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
