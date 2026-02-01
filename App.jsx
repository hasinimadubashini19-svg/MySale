මට ඔබගේ අවශ්‍යතා තේරෙනවා. ඔබට පහත දේවල් අවශ්‍ය:

1. **රෙප්ගේ අතින් විකුණන දේවල් (Add products manually)** - දැනට brands list එකෙන් පමණක් නොව, අතින් දාන්න පුළුවන් වීම
2. **එකතුව (Total) බලාගන්න option එක** - වෙනම total calculation පිටුවක්
3. **එකතු කරන brands edit කරන්න option එක** - brands update/delete කිරීම
4. **Font size කුඩා කර තිරයට ගැලපෙන පරිදි** - responsive improvements
5. **වෙනත් දේවල් එකතු කරන්න** - අමතර features

මම ඔබගේ සම්පූර්ණ කේතය යාවත්කාලීන කර පහත වෙනස්කම් ඇතුළත් කරනවා:

```jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, deleteDoc, query, orderBy, where, enableIndexedDbPersistence, setDoc, updateDoc } from 'firebase/firestore';
import {
  LayoutDashboard, Store, Plus, X, Trash2, Crown, Settings, LogOut,
  MapPin, Package, History, Calendar, Sun, Moon, Save, Star, Search, 
  CheckCircle2, ChevronDown, Share2, TrendingUp, Edit2, Calculator,
  ListOrdered, DollarSign, ShoppingBag, Layers
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
  const [lastOrder, setLastOrder] = useState(null);

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [shopSearch, setShopSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');

  // NEW STATES
  const [manualItems, setManualItems] = useState([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
  const [showTotalCalculator, setShowTotalCalculator] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [totalCalculation, setTotalCalculation] = useState({ subtotal: 0, discount: 0, tax: 0, grandTotal: 0 });

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

  const filteredShops = useMemo(() => {
    return data.shops.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(shopSearch.toLowerCase()) || s.area.toLowerCase().includes(shopSearch.toLowerCase());
      const matchesRoute = selectedRouteFilter === 'ALL' || s.area === selectedRouteFilter;
      return matchesSearch && matchesRoute;
    });
  }, [data.shops, shopSearch, selectedRouteFilter]);

  // NEW: Manual Items Handlers
  const addManualItem = () => {
    setManualItems([...manualItems, { name: '', qty: 1, price: 0, subtotal: 0 }]);
  };

  const updateManualItem = (index, field, value) => {
    const updated = [...manualItems];
    updated[index][field] = value;
    
    // Calculate subtotal
    if (field === 'qty' || field === 'price') {
      const qty = parseFloat(updated[index].qty) || 0;
      const price = parseFloat(updated[index].price) || 0;
      updated[index].subtotal = qty * price;
    }
    
    setManualItems(updated);
  };

  const removeManualItem = (index) => {
    if (manualItems.length > 1) {
      setManualItems(manualItems.filter((_, i) => i !== index));
    }
  };

  // NEW: Calculate total for manual items
  const calculateManualTotal = () => {
    const subtotal = manualItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const discount = parseFloat(totalCalculation.discount) || 0;
    const tax = parseFloat(totalCalculation.tax) || 0;
    const grandTotal = subtotal - discount + tax;
    
    setTotalCalculation({
      subtotal,
      discount,
      tax,
      grandTotal
    });
  };

  // NEW: Save manual order
  const saveManualOrder = async () => {
    const validItems = manualItems.filter(item => item.name && item.qty > 0 && item.price > 0);
    if (!validItems.length) return alert("Please add at least one valid item!");
    
    if (!selectedShop) return alert("Please select a shop first!");

    const orderData = {
      shopName: selectedShop.name,
      companyName: data.settings.company || "MONARCH",
      items: validItems.map(item => ({
        name: item.name,
        qty: Number(item.qty),
        price: Number(item.price),
        subtotal: Number(item.subtotal)
      })),
      total: validItems.reduce((sum, item) => sum + item.subtotal, 0),
      userId: user.uid,
      timestamp: Date.now(),
      dateString: new Date().toLocaleDateString(),
      isManual: true
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      setLastOrder(orderData);
      setShowModal('preview');
      setManualItems([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
    } catch (err) {
      alert("Error saving order: " + err.message);
    }
  };

  // NEW: Edit Brand Function
  const handleEditBrand = async (brandId, updatedData) => {
    try {
      await updateDoc(doc(db, 'brands', brandId), {
        ...updatedData,
        updatedAt: Date.now()
      });
      setEditingBrand(null);
      alert("Brand updated successfully!");
    } catch (err) {
      alert("Error updating brand: " + err.message);
    }
  };

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
      <Crown size={80} className="text-[#d4af37] animate-bounce" />
      <h1 className="mt-6 text-[#d4af37] text-3xl font-black tracking-widest italic uppercase">Monarch Pro</h1>
      <div className="mt-4 w-48 h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-[#d4af37] animate-progress shadow-[0_0_15px_#d4af37]"></div></div>
    </div>
  );

  if (!user) return (
    <div className="h-screen bg-black flex items-center justify-center p-8">
      <div className="w-full max-sm space-y-8 text-center">
        <Crown size={70} className="text-[#d4af37] mx-auto" />
        <h2 className="text-white font-black text-xl tracking-widest uppercase">{isRegisterMode ? "Create Account" : "Welcome Back"}</h2>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const email = e.target.email.value;
          const password = e.target.password.value;
          try {
            if(isRegisterMode) {
              await createUserWithEmailAndPassword(auth, email, password);
            } else {
              await signInWithEmailAndPassword(auth, email, password);
            }
          }
          catch (err) { alert(err.message); }
        }} className="space-y-4">
          <input name="email" type="email" placeholder="EMAIL" className="w-full bg-[#111] p-5 rounded-3xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37]" required />
          <input name="password" type="password" placeholder="PASSWORD" className="w-full bg-[#111] p-5 rounded-3xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37]" required />
          <button className="w-full py-5 bg-[#d4af37] text-black font-black rounded-3xl shadow-lg uppercase">{isRegisterMode ? "Sign Up" : "Login"}</button>

          <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest opacity-60">
            {isRegisterMode ? "Already have an account? Login" : "New User? Create Account"}
          </button>
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
          <button onClick={() => setShowTotalCalculator(true)} className="p-3 rounded-2xl border border-white/10 bg-white/5 text-[#d4af37]"><Calculator size={20}/></button>
          <button onClick={() => signOut(auth)} className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="p-5 max-w-lg mx-auto space-y-8" style={{ fontSize: '0.9rem' }}>
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-br from-[#d4af37] to-[#b8860b] p-8 rounded-[3rem] text-black shadow-2xl relative overflow-hidden">
                <Star className="absolute -right-4 -top-4 opacity-10" size={140} />
                <p className="text-[11px] font-black uppercase opacity-60 mb-1 tracking-widest">Today's Revenue</p>
                <h2 className="text-5xl font-black italic tracking-tighter">Rs.{stats.daily.totalSales.toLocaleString()}</h2>
                <div className="mt-6 flex items-center gap-2 bg-black/10 w-fit px-4 py-1.5 rounded-full border border-black/5">
                  <span className="text-[11px] font-black uppercase italic">Top Brand: {stats.daily.topBrand}</span>
                </div>
            </div>

            <div className={`p-8 rounded-[3rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10 shadow-xl" : "bg-white border-black/5 shadow-md"}`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.3em]">Monthly Performance</h3>
                  <TrendingUp size={16} className="text-[#d4af37] opacity-50" />
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black opacity-40 uppercase">Total Monthly Revenue</p>
                      <p className="text-lg font-black text-white mt-1">Rs.{stats.monthly.totalSales.toLocaleString()}</p>
                   </div>
                   <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                      <p className="text-[8px] font-black opacity-40 uppercase">Monthly Top Brand</p>
                      <p className="text-lg font-black text-[#d4af37] mt-1">{stats.monthly.topBrand}</p>
                   </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[9px] font-black opacity-30 uppercase tracking-widest ml-1">Volume by Product</p>
                  {stats.monthly.summary.map(([name, s]) => (
                    <div key={name} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5">
                        <span className="text-xs font-black uppercase">{name}</span>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-[#d4af37]">{s.units} UNITS</p>
                          <p className="text-[9px] opacity-40 font-bold">Rs.{s.rev.toLocaleString()}</p>
                        </div>
                    </div>
                  ))}
                  {stats.monthly.summary.length === 0 && <p className="text-[10px] opacity-30 italic text-center py-4">No data for this month</p>}
                </div>
            </div>

            <div className={`p-8 rounded-[3rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10 shadow-xl" : "bg-white border-black/5 shadow-md"}`}>
                <h3 className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.3em] mb-6">Today's Breakdown</h3>
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
          </div>
        )}

        {activeTab === 'shops' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-500">
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

            <div className="flex gap-2">
              <button onClick={() => setShowModal('shop')} className="flex-1 py-5 rounded-3xl border-2 border-dashed border-[#d4af37]/40 text-[#d4af37] font-black uppercase text-xs flex items-center justify-center gap-2 bg-[#d4af37]/5">
                <Plus size={18}/> New Shop
              </button>
              <button onClick={() => { setSelectedShop(null); setShowModal('manual'); }} className="flex-1 py-5 rounded-3xl border-2 border-dashed border-green-500/40 text-green-500 font-black uppercase text-xs flex items-center justify-center gap-2 bg-green-500/5">
                <ShoppingBag size={18}/> Manual Order
              </button>
            </div>

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
                    <div className="flex items-center gap-2">
                        <button onClick={async () => { if(window.confirm('Delete this Shop?')) await deleteDoc(doc(db, 'shops', s.id)) }} className="p-3 text-red-500/30 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                        <button onClick={() => { setSelectedShop(s); setShowModal('invoice'); }} className="bg-[#d4af37] text-black px-8 py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-90 transition-all">BILL</button>
                    </div>
                </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-500">
             <div className={`p-5 rounded-3xl border flex items-center gap-4 ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/5"}`}>
                <Calendar size={20} className="text-[#d4af37]"/>
                <input type="date" className="bg-transparent text-sm font-black uppercase outline-none w-full [color-scheme:dark]" onChange={(e) => setSearchDate(e.target.value)} value={searchDate}/>
            </div>
            {data.orders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === searchDate).map((o) => (
              <div key={o.id} className={`p-7 rounded-[3rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/5" : "bg-white border-black/5 shadow-lg"}`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#d4af37]">{o.shopName}</h4>
                    <p className="text-[9px] opacity-40 font-black uppercase">{o.companyName}</p>
                    {o.isManual && <span className="text-[8px] bg-green-500/20 text-green-500 px-2 py-1 rounded-full">MANUAL</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => shareToWhatsApp(o)} className="text-[#d4af37] p-2"><Share2 size={18}/></button>
                    <button onClick={async () => { if(window.confirm('Delete Bill?')) await deleteDoc(doc(db, 'orders', o.id)) }} className="text-red-500/20 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                  </div>
                </div>
                <div className="space-y-2 border-y border-white/5 py-4 my-4">
                  {o.items.map((i, k) => (
                    <div key={k} className="flex justify-between text-[11px] uppercase font-bold">
                      <span className="opacity-50">{i.name} x {i.qty}</span>
                      <span>Rs.{i.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center font-black">
                    <span className="text-[10px] opacity-30 uppercase">Total</span>
                    <span className="text-xl text-[#d4af37]">Rs.{o.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in slide-in-from-left-4 duration-500 pb-20">
            <form onSubmit={handleSaveProfile} className={`p-8 rounded-[3rem] border ${isDarkMode ? "bg-[#0f0f0f] border-white/10 shadow-xl" : "bg-white border-black/10"} space-y-5`}>
              <h3 className="text-[11px] font-black text-[#d4af37] uppercase tracking-[0.3em]">Identity</h3>
              <input name="repName" defaultValue={data.settings.name} placeholder="YOUR NAME" className="w-full bg-black/20 p-5 rounded-2xl border border-white/5 text-sm font-black uppercase outline-none focus:border-[#d4af37]" />
              <input name="companyName" defaultValue={data.settings.company} placeholder="COMPANY" className="w-full bg-black/20 p-5 rounded-2xl border border-white/5 text-sm font-black uppercase outline-none focus:border-[#d4af37]" />
              <button className="w-full py-5 bg-green-600 text-white font-black rounded-2xl text-[10px] uppercase flex items-center justify-center gap-2"><Save size={18}/> SAVE</button>
            </form>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowModal('route')} className="py-6 rounded-[2rem] border border-white/5 bg-[#0f0f0f] text-[#d4af37] font-black uppercase text-[10px] flex flex-col items-center gap-2"><MapPin size={22}/> ADD ROUTE</button>
              <button onClick={() => setShowModal('brand')} className="py-6 rounded-[2rem] border border-white/5 bg-[#0f0f0f] text-[#d4af37] font-black uppercase text-[10px] flex flex-col items-center gap-2"><Package size={22}/> ADD BRAND</button>
            </div>

            <div className="space-y-6">
                <div>
                    <h4 className="text-[10px] font-black opacity-30 uppercase px-4 mb-3 tracking-widest">Active Brands</h4>
                    <div className="grid gap-2">
                    {data.brands.map(b => (
                        <div key={b.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="text-[11px] font-black uppercase">
                          {editingBrand === b.id ? (
                            <div className="space-y-2">
                              <input 
                                defaultValue={b.name}
                                className="bg-black/30 p-2 rounded w-full text-xs"
                                onBlur={(e) => handleEditBrand(b.id, { ...b, name: e.target.value.toUpperCase() })}
                              />
                              <input 
                                defaultValue={b.size}
                                className="bg-black/30 p-2 rounded w-full text-xs"
                                onBlur={(e) => handleEditBrand(b.id, { ...b, size: e.target.value.toUpperCase() })}
                              />
                              <input 
                                defaultValue={b.price}
                                type="number"
                                className="bg-black/30 p-2 rounded w-full text-xs"
                                onBlur={(e) => handleEditBrand(b.id, { ...b, price: parseFloat(e.target.value) })}
                              />
                            </div>
                          ) : (
                            <span>{b.name} ({b.size}) @ Rs.{b.price}</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setEditingBrand(editingBrand === b.id ? null : b.id)} className="text-blue-500/40 hover:text-blue-500 p-2">
                            <Edit2 size={16}/>
                          </button>
                          <button onClick={async () => { if(window.confirm('Delete Brand?')) await deleteDoc(doc(db, 'brands', b.id)) }} className="text-red-500/40 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-[10px] font-black opacity-30 uppercase px-4 mb-3 tracking-widest">Active Routes</h4>
                    <div className="grid gap-2">
                    {data.routes.map(r => (
                        <div key={r.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-[11px] font-black uppercase">{r.name}</span>
                        <button onClick={async () => { if(window.confirm('Delete Route?')) await deleteDoc(doc(db, 'routes', r.id)) }} className="text-red-500/40 p-2"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    </div>
                </div>
            </div>
          </div>
        )}
      </main>

      <nav className={`fixed bottom-8 inset-x-8 h-22 rounded-[3rem] border flex items-center justify-around z-50 shadow-2xl ${isDarkMode ? "bg-black/90 border-white/10" : "bg-white/95 border-black/10"}`}>
        {[ {id: 'dashboard', icon: LayoutDashboard}, {id: 'shops', icon: Store}, {id: 'history', icon: History}, {id: 'settings', icon: Settings} ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`p-5 transition-all relative ${activeTab === t.id ? 'text-[#d4af37] scale-125' : 'opacity-20'}`}>
            <t.icon size={26} />
            {activeTab === t.id && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#d4af37] rounded-full"></div>}
          </button>
        ))}
      </nav>

      {/* --- INVOICE MODAL --- */}
      {showModal === 'invoice' && (
        <div className="fixed inset-0 bg-black z-[100] animate-in slide-in-from-bottom overflow-y-auto p-8">
            <div className="max-w-lg mx-auto pb-60">
              <div className="flex justify-between items-center mb-10 sticky top-0 bg-black py-4 border-b border-white/10">
                 <div>
                   <h2 className="text-3xl font-black uppercase text-white">{selectedShop?.name}</h2>
                   <p className="text-[11px] text-[#d4af37] font-black uppercase italic">New Bill Entry</p>
                 </div>
                 <button onClick={() => { setShowModal(null); setCart({}); }} className="p-4 bg-white/10 rounded-full text-white"><X size={24}/></button>
              </div>
              <div className="space-y-4">
                {data.brands.map(b => (
                  <div key={b.id} className="bg-[#0f0f0f] p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-base font-black uppercase text-white">{b.name} ({b.size})</h4>
                      <p className="text-xs text-[#d4af37] font-bold">Rs.{b.price.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1)})} className="w-12 h-12 bg-white/5 rounded-2xl text-white font-black text-xl">-</button>
                      <input type="number" value={cart[b.id] || ''} onChange={(e) => setCart({...cart, [b.id]: e.target.value})} className="w-12 bg-transparent text-center font-black text-[#d4af37] text-xl outline-none" placeholder="0" />
                      <button onClick={() => setCart({...cart, [b.id]: (Number(cart[b.id
