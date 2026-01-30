import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, deleteDoc, query, orderBy, where, enableIndexedDbPersistence } from 'firebase/firestore';
import { 
  LayoutDashboard, Store, Plus, X, Trash2, Crown, Settings, LogOut, 
  Send, MapPin, Package, Wallet, CheckCircle2, History, Calendar, 
  Sun, Moon, TrendingUp, Briefcase 
} from 'lucide-react';

// --- FIREBASE CONFIG (පරණ Code එකේ තිබූ පරිදි) ---
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

// OFFLINE SUPPORT
try { enableIndexedDbPersistence(db); } catch (err) { console.warn("Offline persistence active"); }

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [data, setData] = useState({ routes: [], shops: [], orders: [], expenses: [], brands: [], settings: [] });
  const [selectedRouteId, setSelectedRouteId] = useState('all');
  const [cart, setCart] = useState({});
  const [payStatus, setPayStatus] = useState('PAID');
  const [selectedShop, setSelectedShop] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  const [searchDate, setSearchDate] = useState(new Date().toLocaleDateString());

  // 1. AUTH
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // 2. DATA LISTENING
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

  // 3. CALCULATIONS (Dashboard Logic)
  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString();
    const curMonthYear = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const todayOrders = data.orders.filter(o => o.date === today);
    const monthOrders = data.orders.filter(o => o.monthYear === curMonthYear);
    
    const daySales = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
    const monthSales = monthOrders.reduce((s, o) => s + (o.total || 0), 0);
    const todayExp = data.expenses.filter(e => e.date === today).reduce((s, e) => s + (e.amount || 0), 0);

    // Brand Summary Logic
    const bSummary = {};
    todayOrders.forEach(o => o.items.forEach(i => {
      const key = i.name;
      if (!bSummary[key]) bSummary[key] = { units: 0, rev: 0 };
      bSummary[key].units += i.qty;
      bSummary[key].rev += i.subtotal;
    }));

    // Top Selling Brand
    const topBrand = Object.entries(bSummary).sort((a,b) => b[1].units - a[1].units)[0]?.[0] || 'N/A';

    return { daySales, monthSales, todayExp, bSummary: Object.entries(bSummary), topBrand };
  }, [data]);

  // 4. ACTIONS
  const addItem = async (col, payload) => {
    await addDoc(collection(db, col), { ...payload, userId: user.uid, timestamp: Date.now(), date: new Date().toLocaleDateString() });
    setShowModal(null);
  };

  const deleteItem = async (col, id) => {
    if (window.confirm("Delete?")) await deleteDoc(doc(db, col, id));
  };

  const submitOrder = async () => {
    const items = Object.entries(cart).filter(([_, q]) => q > 0).map(([id, q]) => {
      const b = data.brands.find(x => x.id === id);
      return { name: b.name, size: b.size, price: b.price, qty: Number(q), subtotal: b.price * Number(q) };
    });
    if (items.length === 0) return alert("Select Items!");

    const orderData = {
      shopName: selectedShop.name,
      items,
      total: items.reduce((s, i) => s + i.subtotal, 0),
      status: payStatus,
      timestamp: Date.now(),
      date: new Date().toLocaleDateString(),
      monthYear: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      repName: data.settings[0]?.name || 'N/A'
    };

    const docRef = await addDoc(collection(db, 'orders'), { ...orderData, userId: user.uid });
    setLastOrder({ id: docRef.id, ...orderData });
    setCart({});
    setShowModal('receipt');
  };

  const shareWhatsApp = (o) => {
    const text = `*${data.settings[0]?.company || 'MONARCH PRO'}*%0A*Rep:* ${o.repName}%0A*Shop:* ${o.shopName}%0A------------------%0A` + 
      o.items.map(i => `${i.name} x ${i.qty} = ${i.subtotal}`).join('%0A') + `%0A------------------%0A*TOTAL: Rs.${o.total}*`;
    window.open(`https://wa.me/?text=${text}`);
  };

  // UI THEME HELPERS
  const theme = isDarkMode ? "bg-[#050505] text-white" : "bg-gray-100 text-gray-900";
  const card = isDarkMode ? "bg-[#0f0f0f] border-white/5" : "bg-white border-gray-200 shadow-sm";

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-[#d4af37] font-black animate-pulse uppercase italic tracking-tighter">Monarch Loading...</div>;

  if (!user) return (
    <div className="h-screen bg-[#050505] flex items-center justify-center p-8">
      <div className="w-full max-w-sm bg-[#0f0f0f] p-10 rounded-[3rem] border border-[#d4af37]/20 text-center shadow-2xl">
        <Crown className="text-[#d4af37] mx-auto mb-6" size={50} />
        <h2 className="text-white text-2xl font-black italic uppercase mb-8 tracking-tighter">Monarch <span className="text-[#d4af37]">Login</span></h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try { await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value); } 
          catch (err) { try { await createUserWithEmailAndPassword(auth, e.target.email.value, e.target.password.value); } catch (e2) { alert("Error!"); } }
        }} className="space-y-4">
          <input name="email" type="email" placeholder="Email" className="w-full bg-black p-5 rounded-2xl text-white border border-white/5 outline-none" required />
          <input name="password" type="password" placeholder="Password" className="w-full bg-black p-5 rounded-2xl text-white border border-white/5 outline-none" required />
          <button className="w-full py-5 bg-[#d4af37] text-black font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-yellow-500/10">Sign In</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen pb-40 transition-all duration-500 ${theme}`}>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
      
      {/* HEADER */}
      <header className={`p-6 flex justify-between items-center sticky top-0 z-40 border-b ${card} backdrop-blur-xl`}>
        <div className="flex items-center gap-2"><div className="w-9 h-9 bg-gradient-to-tr from-[#d4af37] to-[#f9e29c] rounded-xl flex items-center justify-center"><Briefcase size={20} className="text-black"/></div><h1 className="text-lg font-black tracking-tighter uppercase">MONARCH <span className="text-[#d4af37]">PRO</span></h1></div>
        <div className="flex gap-2">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-3 rounded-2xl ${card} border`}>{isDarkMode ? <Sun size={20} className="text-yellow-500"/> : <Moon size={20}/>}</button>
          <button onClick={() => signOut(auth)} className="p-3 bg-red-500/10 rounded-2xl text-red-500"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-6">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5">
            <div className="grid grid-cols-2 gap-4">
              <div className={`${card} p-5 rounded-[2.5rem] border`}>
                <p className="text-[10px] font-black opacity-40 uppercase">Today Sales</p>
                <h2 className="text-xl font-black text-[#d4af37]">Rs.{stats.daySales}</h2>
              </div>
              <div className={`${card} p-5 rounded-[2.5rem] border`}>
                <p className="text-[10px] font-black opacity-40 uppercase">Net Income</p>
                <h2 className="text-xl font-black text-green-500">Rs.{stats.daySales - stats.todayExp}</h2>
              </div>
            </div>

            <div className={`${card} p-6 rounded-[2.5rem] border relative overflow-hidden`}>
               <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp size={80}/></div>
               <h3 className="text-[10px] font-black uppercase text-[#d4af37] mb-4 tracking-widest">Monthly Summary</h3>
               <div className="flex justify-between items-end">
                  <div><p className="text-2xl font-black">Rs.{stats.monthSales}</p><p className="text-[10px] opacity-40 uppercase">Total Sales This Month</p></div>
                  <div className="text-right"><p className="text-xs font-black text-yellow-500 uppercase">{stats.topBrand}</p><p className="text-[9px] opacity-40 uppercase">Top Selling Brand</p></div>
               </div>
            </div>

            <div className={`${card} p-6 rounded-[2.5rem] border`}>
              <h3 className="text-xs font-black uppercase mb-4 text-[#d4af37] flex items-center gap-2"><Package size={14}/> Today Brand Stats</h3>
              <div className="space-y-4">
                {stats.bSummary.length === 0 && <p className="text-[10px] text-center opacity-20 py-4">NO SALES RECORDED TODAY</p>}
                {stats.bSummary.map(([name, s]) => (
                  <div key={name} className="flex justify-between items-center border-b border-white/5 pb-2">
                    <div><p className="text-xs font-bold uppercase">{name}</p><p className="text-[10px] opacity-40">{s.units} Units</p></div>
                    <p className="font-black text-xs">Rs.{s.rev}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SHOPS TAB */}
        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              <button onClick={()=>setSelectedRouteId('all')} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase transition-all ${selectedRouteId==='all' ? 'bg-[#d4af37] text-black' : 'bg-white/5 opacity-40'}`}>All Routes</button>
              {data.routes.map(r => (
                <button key={r.id} onClick={()=>setSelectedRouteId(r.id)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all ${selectedRouteId===r.id ? 'bg-[#d4af37] text-black' : 'bg-white/5 opacity-40'}`}>{r.name}</button>
              ))}
            </div>
            <button onClick={()=>setShowModal('shop')} className={`w-full py-5 rounded-2xl border border-dashed border-[#d4af37]/40 flex items-center justify-center gap-2 text-[#d4af37] text-[10px] font-black uppercase ${card}`}><Plus size={16}/> New Shop</button>
            <div className="grid gap-3">
              {data.shops.filter(s => selectedRouteId === 'all' || s.routeId === selectedRouteId).map(s => (
                <div key={s.id} className={`${card} p-5 rounded-[2rem] border flex justify-between items-center`}>
                  <div><h4 className="text-sm font-black uppercase">{s.name}</h4><p className="text-[9px] opacity-40 font-black uppercase">{s.area}</p></div>
                  <div className="flex gap-2">
                    <button onClick={()=>deleteItem('shops', s.id)} className="p-3 opacity-20 hover:text-red-500"><Trash2 size={16}/></button>
                    <button onClick={()=>{setSelectedShop(s); setShowModal('invoice')}} className="bg-[#d4af37] text-black px-8 py-3 rounded-xl text-[10px] font-black uppercase">Create Bill</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in">
            <div className={`${card} p-4 rounded-2xl border flex items-center gap-3`}>
              <Calendar size={18} className="text-[#d4af37]"/><input type="date" style={{ colorScheme: isDarkMode ? 'dark' : 'light' }} className="bg-transparent text-xs font-black uppercase outline-none w-full" onChange={(e) => setSearchDate(new Date(e.target.value).toLocaleDateString())}/>
            </div>
            <p className="text-[10px] font-black opacity-20 uppercase px-2">Records for: {searchDate}</p>
            {data.orders.filter(o => o.date === searchDate).reverse().map((o) => (
              <div key={o.id} className={`${card} p-5 rounded-[2.2rem] border`}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black uppercase text-[#d4af37]">{o.shopName}</h4>
                  <div className="flex gap-2">
                    <button onClick={() => deleteItem('orders', o.id)} className="text-red-500/20 p-2"><Trash2 size={14}/></button>
                    <button onClick={() => shareWhatsApp(o)} className="text-green-500 p-2 bg-green-500/10 rounded-full"><Send size={14}/></button>
                  </div>
                </div>
                <div className="space-y-1">
                  {o.items.map((i, k) => <p key={k} className="text-[10px] opacity-40 uppercase">▪ {i.name} x {i.qty} = {i.subtotal}</p>)}
                </div>
                <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center font-black">
                   <span className={`text-[8px] px-2 py-1 rounded-full ${o.status==='PAID' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{o.status}</span>
                   <span className="text-sm uppercase">Total: Rs.{o.total}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* SETUP TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in">
            <div className={`${card} p-6 rounded-[2.5rem] border space-y-4 shadow-xl`}>
              <h3 className="text-[10px] font-black text-[#d4af37] uppercase">Business Profile</h3>
              <input value={data.settings[0]?.name || ''} onChange={(e)=>addItem('settings', { name: e.target.value.toUpperCase(), company: data.settings[0]?.company || '' })} placeholder="REP NAME" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-xs font-bold uppercase outline-none" />
              <input value={data.settings[0]?.company || ''} onChange={(e)=>addItem('settings', { name: data.settings[0]?.name || '', company: e.target.value.toUpperCase() })} placeholder="COMPANY NAME" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-xs font-bold uppercase outline-none" />
            </div>
            <div className="grid gap-3">
              <button onClick={()=>setShowModal('route')} className={`${card} py-5 rounded-2xl border text-[10px] font-black uppercase flex items-center justify-center gap-2 text-[#d4af37]`}><MapPin size={16}/> Add Routes</button>
              <button onClick={()=>setShowModal('brand')} className={`${card} py-5 rounded-2xl border text-[10px] font-black uppercase flex items-center justify-center gap-2 text-[#d4af37]`}><Package size={16}/> Add Brands</button>
              <button onClick={()=>setShowModal('expense')} className={`py-5 rounded-2xl border border-red-500/20 bg-red-500/5 text-[10px] font-black uppercase flex items-center justify-center gap-2 text-red-500`}><Wallet size={16}/> Add Expense</button>
            </div>
          </div>
        )}

      </main>

      {/* SIGNATURE (FOR MY LOVE) */}
      <div className="fixed bottom-28 w-full text-center pointer-events-none">
        <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-10 italic">For My Love</p>
      </div>

      {/* NAVIGATION BAR */}
      <nav className={`fixed bottom-8 inset-x-8 h-20 rounded-[2.5rem] border flex items-center justify-around z-40 shadow-2xl ${card} backdrop-blur-2xl`}>
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
          { id: 'shops', icon: Store, label: 'Shops' },
          { id: 'history', icon: History, label: 'Logs' },
          { id: 'settings', icon: Settings, label: 'Setup' }
        ].map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`flex flex-col items-center gap-1 transition-all ${activeTab===t.id ? 'text-[#d4af37] scale-110' : 'opacity-20'}`}>
            <t.icon size={22}/><span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* MODALS (INVOICE, SHOP, BRAND, etc.) */}
      {showModal === 'invoice' && (
        <div className="fixed inset-0 bg-black z-50 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-8 sticky top-0 bg-black/90 py-4 z-10 border-b border-white/5">
            <div><h2 className="text-xl font-black uppercase">{selectedShop?.name}</h2><p className="text-[10px] text-[#d4af37] font-black tracking-widest uppercase">Create Bill</p></div>
            <button onClick={()=>setShowModal(null)} className="p-3 bg-white/5 rounded-full"><X/></button>
          </div>
          <div className="flex gap-2 mb-8">
            <button onClick={()=>setPayStatus('PAID')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase border ${payStatus==='PAID' ? 'bg-green-500 text-black border-green-500' : 'border-white/10 opacity-30'}`}>Cash</button>
            <button onClick={()=>setPayStatus('CREDIT')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase border ${payStatus==='CREDIT' ? 'bg-red-500 text-black border-red-500' : 'border-white/10 opacity-30'}`}>Credit</button>
          </div>
          <div className="space-y-4 pb-48">
            {data.brands.map(b => (
              <div key={b.id} className={`${card} p-5 rounded-[2.5rem] flex items-center justify-between border shadow-xl`}>
                <div><h4 className="text-xs font-black uppercase">{b.name}</h4><p className="text-[9px] opacity-40">Rs.{b.price} | {b.size}</p></div>
                <div className="flex items-center gap-3">
                  <button onClick={()=>setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1)})} className="w-10 h-10 bg-black/40 rounded-xl border border-white/5 text-[#d4af37] font-black">-</button>
                  <input type="number" value={cart[b.id] || ''} onChange={(e)=>setCart({...cart, [b.id]: e.target.value})} className="w-14 bg-transparent text-center font-black text-[#d4af37] text-lg outline-none" placeholder="0" />
                  <button onClick={()=>setCart({...cart, [b.id]: (Number(cart[b.id])||0)+1})} className="w-10 h-10 bg-black/40 rounded-xl border border-white/5 text-[#d4af37] font-black">+</button>
                </div>
              </div>
            ))}
          </div>
          <div className="fixed bottom-0 inset-x-0 p-8 bg-black/90 backdrop-blur-2xl border-t border-white/10">
            <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Grand Total</span><span className="text-3xl font-black text-[#d4af37]">Rs.{Object.entries(cart).reduce((s, [id, q]) => s + (data.brands.find(x=>x.id===id)?.price||0)*Number(q), 0)}</span></div>
            <button onClick={submitOrder} className="w-full py-6 bg-[#d4af37] text-black font-black rounded-[2rem] uppercase text-xs tracking-widest shadow-2xl">Confirm & Submit</button>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showModal === 'receipt' && lastOrder && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className={`${card} w-full max-w-sm p-10 rounded-[3.5rem] border border-[#d4af37]/30 text-center shadow-2xl animate-in zoom-in`}>
            <div className="w-20 h-20 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="text-[#d4af37]" size={40}/></div>
            <h3 className="text-[#d4af37] font-black uppercase text-xl italic tracking-tighter">Order Placed!</h3>
            <div className="space-y-2 mb-8 text-left border-y border-white/5 py-6 mt-6">
               {lastOrder.items.map((i, k) => (<div key={k} className="flex justify-between text-[11px] font-black uppercase"><span className="opacity-40">{i.name} x {i.qty}</span><span>Rs.{i.subtotal}</span></div>))}
               <div className="flex justify-between font-black text-lg text-[#d4af37] mt-4 pt-4 border-t border-white/5 uppercase italic"><span>Total</span><span>Rs.{lastOrder.total}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>shareWhatsApp(lastOrder)} className="flex-1 py-5 bg-[#25D366] text-white font-black rounded-2xl text-[10px] flex items-center justify-center gap-2 uppercase"><Send size={16}/> WhatsApp</button>
              <button onClick={()=>setShowModal(null)} className="flex-1 py-5 bg-white/5 text-white font-black rounded-2xl text-[10px] uppercase">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* COMMON ADD MODALS (SHOP, BRAND, etc.) */}
      {['route', 'shop', 'brand', 'expense'].includes(showModal) && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-8 backdrop-blur-md">
          <div className={`${card} w-full max-w-sm p-10 rounded-[3rem] border border-white/5 shadow-2xl`}>
            <h3 className="text-center font-black text-[#d4af37] mb-8 uppercase text-xs tracking-widest">Add {showModal}</h3>
            <form onSubmit={(e)=>{
              e.preventDefault(); const f = e.target;
              if(showModal==='route') addItem('routes', { name: f.name.value.toUpperCase() });
              if(showModal==='shop') addItem('shops', { name: f.name.value.toUpperCase(), area: f.area.value.toUpperCase(), routeId: f.routeId.value });
              if(showModal==='brand') addItem('brands', { name: f.name.value.toUpperCase(), size: f.size.value.toUpperCase(), price: Number(f.price.value) });
              if(showModal==='expense') addItem('expenses', { reason: f.reason.value.toUpperCase(), amount: Number(f.amount.value) });
            }} className="space-y-4">
               {showModal==='shop' && (<select name="routeId" className="w-full bg-black/40 p-5 rounded-2xl text-white border border-white/5 text-xs font-black uppercase outline-none">{data.routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>)}
               <input name={showModal==='expense' ? 'reason' : 'name'} placeholder="Name / Reason" className="w-full bg-black/40 p-5 rounded-2xl text-white border border-white/5 text-sm font-bold uppercase outline-none focus:border-[#d4af37]/40" required />
               {showModal==='shop' && <input name="area" placeholder="Area" className="w-full bg-black/40 p-5 rounded-2xl text-white border border-white/5 text-sm font-bold uppercase outline-none" required />}
               {showModal==='brand' && <input name="size" placeholder="Size (500ml)" className="w-full bg-black/40 p-5 rounded-2xl text-white border border-white/5 text-sm font-bold uppercase outline-none" required />}
               {(showModal==='brand' || showModal==='expense') && <input name={showModal==='brand' ? 'price' : 'amount'} type="number" placeholder="Price / Amount" className="w-full bg-black/40 p-5 rounded-2xl text-white border border-white/5 text-sm font-bold uppercase outline-none" required />}
               <button className="w-full py-5 bg-[#d4af37] text-black font-black rounded-2xl uppercase text-xs mt-4 shadow-xl">Save Record</button>
               <button type="button" onClick={()=>setShowModal(null)} className="w-full opacity-20 text-[10px] font-black uppercase mt-4 tracking-widest">Cancel</button>
            </form>
          </div>
        </div>
      )}

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
