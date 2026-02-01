import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, deleteDoc, query, orderBy, where, enableIndexedDbPersistence, setDoc, updateDoc } from 'firebase/firestore';
import {
  LayoutDashboard, Store, Plus, X, Trash2, Crown, Settings, LogOut,
  MapPin, Package, History, Calendar, Sun, Moon, Save, Star, Search, 
  CheckCircle2, ChevronDown, Share2, TrendingUp, Edit2, Calculator,
  ShoppingBag, DollarSign, Layers, ListOrdered, Fuel, FileText,
  Navigation, Pin, AlertCircle, CreditCard, Coffee, Home, Wifi
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
  const [data, setData] = useState({ 
    routes: [], 
    shops: [], 
    orders: [], 
    brands: [], 
    settings: { name: '', company: '' },
    expenses: [],
    notes: [],
    locations: []
  });
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
  const [expenseType, setExpenseType] = useState('fuel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [repNote, setRepNote] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsSplash(false), 2500);
    const unsubAuth = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => { clearTimeout(timer); unsubAuth(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    const cols = ['routes', 'shops', 'orders', 'brands', 'expenses', 'notes', 'locations'];
    const unsubs = cols.map(c => {
      const q = query(collection(db, c), where("userId", "==", user.uid), orderBy("timestamp", "desc"));
      return onSnapshot(q, s => setData(prev => ({ ...prev, [c]: s.docs.map(d => ({ id: d.id, ...d.data() })) })));
    });
    const unsubSettings = onSnapshot(doc(db, "settings", user.uid), (d) => {
      if (d.exists()) setData(prev => ({ ...prev, settings: d.data() }));
    });
    return () => { unsubs.forEach(f => f()); unsubSettings(); };
  }, [user]);

  // Get current location
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          };
          setCurrentLocation(location);
          // Save to Firebase
          addDoc(collection(db, 'locations'), {
            ...location,
            userId: user.uid,
            date: new Date().toISOString().split('T')[0]
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Location access denied or unavailable");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const name = e.target.repName.value.toUpperCase();
      const company = e.target.companyName.value.toUpperCase();
      await setDoc(doc(db, "settings", user.uid), { name, company, userId: user.uid });
      alert("Settings Saved!");
    } catch (err) { alert("Error: " + err.message); }
  };

  // Save Expense
  const saveExpense = async () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      await addDoc(collection(db, 'expenses'), {
        type: expenseType,
        amount: parseFloat(expenseAmount),
        note: expenseNote,
        userId: user.uid,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      });
      alert("Expense saved!");
      setExpenseAmount('');
      setExpenseNote('');
    } catch (err) {
      alert("Error saving expense: " + err.message);
    }
  };

  // Save Note
  const saveNote = async () => {
    if (!repNote.trim()) {
      alert("Please enter a note");
      return;
    }

    try {
      await addDoc(collection(db, 'notes'), {
        text: repNote,
        userId: user.uid,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      });
      alert("Note saved!");
      setRepNote('');
    } catch (err) {
      alert("Error saving note: " + err.message);
    }
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

    // Calculate expenses
    const todayExpenses = data.expenses.filter(e => e.date === todayStr);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    return { 
      daily: getStats(dailyOrders), 
      monthly: getStats(monthlyOrders),
      expenses: totalExpenses
    };
  }, [data.orders, data.expenses]);

  const filteredShops = useMemo(() => {
    return data.shops.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(shopSearch.toLowerCase()) || s.area.toLowerCase().includes(shopSearch.toLowerCase());
      const matchesRoute = selectedRouteFilter === 'ALL' || s.area === selectedRouteFilter;
      return matchesSearch && matchesRoute;
    });
  }, [data.shops, shopSearch, selectedRouteFilter]);

  // Manual Items Handlers
  const addManualItem = () => {
    setManualItems([...manualItems, { name: '', qty: 1, price: 0, subtotal: 0 }]);
  };

  const updateManualItem = (index, field, value) => {
    const updated = [...manualItems];
    updated[index][field] = value;
    
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
      <h1 className="mt-4 text-[#d4af37] text-2xl font-black tracking-widest italic uppercase">Monarch Pro</h1>
      <div className="mt-3 w-40 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-[#d4af37] animate-progress shadow-[0_0_10px_#d4af37]"></div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="h-screen bg-black flex items-center justify-center p-6">
      <div className="w-full max-sm space-y-6 text-center">
        <Crown size={50} className="text-[#d4af37] mx-auto" />
        <h2 className="text-white font-black text-lg tracking-widest uppercase">{isRegisterMode ? "Create Account" : "Welcome Back"}</h2>
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
        }} className="space-y-3">
          <input name="email" type="email" placeholder="EMAIL" className="w-full bg-[#111] p-4 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37]" required />
          <input name="password" type="password" placeholder="PASSWORD" className="w-full bg-[#111] p-4 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37]" required />
          <button className="w-full py-4 bg-[#d4af37] text-black font-black rounded-2xl shadow-lg uppercase text-sm">{
            isRegisterMode ? "Sign Up" : "Login"}</button>

          <button type="button" onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-[#d4af37] text-xs font-black uppercase tracking-widest opacity-60">
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
            <h1 className="font-black text-base tracking-tight leading-none uppercase">{data.settings.company || "MONARCH"}</h1>
            <p className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{data.settings.name || "Sales Rep"}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl border border-white/10 bg-white/5 text-[#d4af37]">
            {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
          <button onClick={() => setShowModal('expense')} className="p-2 rounded-xl border border-white/10 bg-white/5 text-[#d4af37]">
            <CreditCard size={16}/>
          </button>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20">
            <LogOut size={16}/>
          </button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-6" style={{ fontSize: '0.85rem' }}>
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            {/* Today's Stats Card */}
            <div className="bg-gradient-to-br from-[#d4af37] to-[#b8860b] p-6 rounded-2xl text-black shadow-xl relative overflow-hidden">
                <Star className="absolute -right-3 -top-3 opacity-10" size={100} />
                <p className="text-xs font-black uppercase opacity-60 mb-1 tracking-widest">Today's Revenue</p>
                <h2 className="text-3xl font-black italic tracking-tighter">Rs.{stats.daily.totalSales.toLocaleString()}</h2>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-black/10 px-3 py-1 rounded-full border border-black/5">
                    <span className="text-xs font-black uppercase italic">Top: {stats.daily.topBrand}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase opacity-60">Expenses</p>
                    <p className="text-sm font-black text-red-600">Rs.{stats.expenses.toLocaleString()}</p>
                  </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setShowModal('expense')} className="bg-[#0f0f0f] p-4 rounded-xl border border-white/5 flex flex-col items-center gap-1">
                <Fuel size={18} className="text-[#d4af37]" />
                <span className="text-[10px] font-black uppercase">Expense</span>
              </button>
              <button onClick={getLocation} className="bg-[#0f0f0f] p-4 rounded-xl border border-white/5 flex flex-col items-center gap-1">
                <Navigation size={18} className="text-[#d4af37]" />
                <span className="text-[10px] font-black uppercase">Location</span>
              </button>
              <button onClick={() => setShowModal('note')} className="bg-[#0f0f0f] p-4 rounded-xl border border-white/5 flex flex-col items-center gap-1">
                <FileText size={18} className="text-[#d4af37]" />
                <span className="text-[10px] font-black uppercase">Note</span>
              </button>
            </div>

            {/* Monthly Performance */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#0f0f0f] border-white/10 shadow-lg" : "bg-white border-black/5 shadow-md"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Monthly Performance</h3>
                  <TrendingUp size={14} className="text-[#d4af37] opacity-50" />
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                   <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <p className="text-[9px] font-black opacity-40 uppercase">Revenue</p>
                      <p className="text-base font-black text-white mt-1">Rs.{stats.monthly.totalSales.toLocaleString()}</p>
                   </div>
                   <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <p className="text-[9px] font-black opacity-40 uppercase">Top Brand</p>
                      <p className="text-base font-black text-[#d4af37] mt-1">{stats.monthly.topBrand}</p>
                   </div>
                </div>
            </div>

            {/* Today's Items */}
            <div className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#0f0f0f] border-white/10 shadow-lg" : "bg-white border-black/5 shadow-md"}`}>
                <h3 className="text-xs font-black text-[#d4af37] uppercase tracking-widest mb-4">Today's Sales</h3>
                <div className="space-y-2">
                  {stats.daily.summary.map(([name, s]) => (
                    <div key={name} className="flex justify-between items-center p-3 rounded-xl bg-black/5 border border-white/5">
                        <div>
                          <p className="text-xs font-black uppercase tracking-tight">{name}</p>
                          <p className="text-[10px] opacity-40 font-bold italic">{s.units} UNITS</p>
                        </div>
                        <span className="font-black text-sm tabular-nums text-[#d4af37]">Rs.{s.rev.toLocaleString()}</span>
                    </div>
                  ))}
                  {stats.daily.summary.length === 0 && <p className="text-xs opacity-30 italic text-center py-3">No sales today yet</p>}
                </div>
            </div>
          </div>
        )}

        {activeTab === 'shops' && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
                <div className={`p-3 rounded-xl border flex items-center gap-2 ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/10"}`}>
                    <Search size={16} className="opacity-30"/>
                    <input value={shopSearch} onChange={(e) => setShopSearch(e.target.value)} placeholder="SEARCH SHOP..." className="bg-transparent text-xs font-black uppercase outline-none w-full" />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => setSelectedRouteFilter('ALL')} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all whitespace-nowrap border ${selectedRouteFilter === 'ALL' ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-black/20 border-white/10 text-white/40'}`}>ALL</button>
                    {data.routes.map(r => (
                        <button key={r.id} onClick={() => setSelectedRouteFilter(r.name)} className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all whitespace-nowrap border ${selectedRouteFilter === r.name ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-black/20 border-white/10 text-white/40'}`}>{r.name}</button>
                    ))}
                </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowModal('shop')} className="flex-1 py-4 rounded-2xl border-2 border-dashed border-[#d4af37]/40 text-[#d4af37] font-black uppercase text-xs flex items-center justify-center gap-1 bg-[#d4af37]/5">
                <Plus size={16}/> New Shop
              </button>
              <button onClick={() => { setSelectedShop(null); setShowModal('manual'); }} className="flex-1 py-4 rounded-2xl border-2 border-dashed border-green-500/40 text-green-500 font-black uppercase text-xs flex items-center justify-center gap-1 bg-green-500/5">
                <ShoppingBag size={16}/> Manual
              </button>
            </div>

            <div className="grid gap-2">
                {filteredShops.map(s => (
                <div key={s.id} className={`p-4 rounded-2xl border flex justify-between items-center ${isDarkMode ? "bg-[#0f0f0f] border-white/5" : "bg-white border-black/5"}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-[#d4af37]/10 rounded-xl text-[#d4af37]"><Store size={18}/></div>
                      <div>
                          <h4 className="text-sm font-black uppercase leading-tight">{s.name}</h4>
                          <p className="text-[10px] opacity-40 font-bold uppercase mt-0.5 tracking-tighter italic">{s.area}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={async () => { if(window.confirm('Delete Shop?')) await deleteDoc(doc(db, 'shops', s.id)) }} className="p-2 text-red-500/30 hover:text-red-500"><Trash2 size={16}/></button>
                        <button onClick={() => { setSelectedShop(s); setShowModal('invoice'); }} className="bg-[#d4af37] text-black px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg">BILL</button>
                    </div>
                </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 animate-in fade-in duration-500">
             <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isDarkMode ? "bg-[#0f0f0f] border-white/10" : "bg-white border-black/5"}`}>
                <Calendar size={18} className="text-[#d4af37]"/>
                <input type="date" className="bg-transparent text-sm font-black uppercase outline-none w-full [color-scheme:dark]" onChange={(e) => setSearchDate(e.target.value)} value={searchDate}/>
            </div>
            {data.orders.filter(o => new Date(o.timestamp).toISOString().split('T')[0] === searchDate).map((o) => (
              <div key={o.id} className={`p-5 rounded-2xl border ${isDarkMode ? "bg-[#0f0f0f] border-white/5" : "bg-white border-black/5 shadow-lg"}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#d4af37]">{o.shopName}</h4>
                    <p className="text-[10px] opacity-40 font-black uppercase">{o.companyName}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => shareToWhatsApp(o)} className="text-[#d4af37] p-1"><Share2 size={16}/></button>
                    <button onClick={async () => { if(window.confirm('Delete Bill?')) await deleteDoc(doc(db, 'orders', o.id)) }} className="text-red-500/20 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="space-y-1 border-y border-white/5 py-3 my-3">
                  {o.items.map((i, k) => (
                    <div key={k} className="flex justify-between text-xs uppercase font-bold">
                      <span className="opacity-50">{i.name} x {i.qty}</span>
                      <span>Rs.{i.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center font-black">
                    <span className="text-xs opacity-30 uppercase">Total</span>
                    <span className="text-lg text-[#d4af37]">Rs.{o.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500 pb-16">
            {/* Profile Settings */}
            <form onSubmit={handleSaveProfile} className={`p-6 rounded-2xl border ${isDarkMode ? "bg-[#0f0f0f] border-white/10 shadow-lg" : "bg-white border-black/10"} space-y-4`}>
              <h3 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Profile</h3>
              <input name="repName" defaultValue={data.settings.name} placeholder="YOUR NAME" className="w-full bg-black/20 p-4 rounded-xl border border-white/5 text-sm font-black uppercase outline-none focus:border-[#d4af37]" />
              <input name="companyName" defaultValue={data.settings.company} placeholder="COMPANY" className="w-full bg-black/20 p-4 rounded-xl border border-white/5 text-sm font-black uppercase outline-none focus:border-[#d4af37]" />
              <button className="w-full py-4 bg-green-600 text-white font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1"><Save size={16}/> SAVE</button>
            </form>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowModal('route')} className="py-4 rounded-xl border border-white/5 bg-[#0f0f0f] text-[#d4af37] font-black uppercase text-xs flex flex-col items-center gap-1">
                <MapPin size={18}/> ADD ROUTE
              </button>
              <button onClick={() => setShowModal('brand')} className="py-4 rounded-xl border border-white/5 bg-[#0f0f0f] text-[#d4af37] font-black uppercase text-xs flex flex-col items-center gap-1">
                <Package size={18}/> ADD BRAND
              </button>
            </div>

            {/* Brands List */}
            <div>
                <h4 className="text-xs font-black opacity-30 uppercase px-3 mb-2 tracking-widest">Brands</h4>
                <div className="grid gap-1">
                {data.brands.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="text-xs font-black uppercase">
                      {editingBrand === b.id ? (
                        <div className="space-y-1">
                          <input 
                            defaultValue={b.name}
                            className="bg-black/30 p-1.5 rounded w-full text-xs"
                            onBlur={(e) => updateDoc(doc(db, 'brands', b.id), { name: e.target.value.toUpperCase() })}
                          />
                          <input 
                            defaultValue={b.size}
                            className="bg-black/30 p-1.5 rounded w-full text-xs"
                            onBlur={(e) => updateDoc(doc(db, 'brands', b.id), { size: e.target.value.toUpperCase() })}
                          />
                          <input 
                            defaultValue={b.price}
                            type="number"
                            className="bg-black/30 p-1.5 rounded w-full text-xs"
                            onBlur={(e) => updateDoc(doc(db, 'brands', b.id), { price: parseFloat(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <span>{b.name} ({b.size}) @ Rs.{b.price}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingBrand(editingBrand === b.id ? null : b.id)} className="text-blue-500/40 hover:text-blue-500 p-1">
                        <Edit2 size={14}/>
                      </button>
                      <button onClick={async () => { if(window.confirm('Delete Brand?')) await deleteDoc(doc(db, 'brands', b.id)) }} className="text-red-500/40 hover:text-red-500 p-1"><Trash2 size={14}/></button>
                    </div>
                    </div>
                ))}
                </div>
            </div>

            {/* Expenses History */}
            <div>
                <h4 className="text-xs font-black opacity-30 uppercase px-3 mb-2 tracking-widest">Today's Expenses</h4>
                <div className="space-y-1">
                {data.expenses.filter(e => e.date === new Date().toISOString().split('T')[0]).map(exp => (
                    <div key={exp.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <div>
                        <div className="flex items-center gap-1">
                          {exp.type === 'fuel' && <Fuel size={12} className="text-[#d4af37]" />}
                          {exp.type === 'food' && <Coffee size={12} className="text-[#d4af37]" />}
                          {exp.type === 'transport' && <Car size={12} className="text-[#d4af37]" />}
                          {exp.type === 'other' && <AlertCircle size={12} className="text-[#d4af37]" />}
                          <span className="text-xs font-black uppercase">{exp.type}</span>
                        </div>
                        {exp.note && <p className="text-[10px] opacity-40 mt-0.5">{exp.note}</p>}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-red-500">Rs.{exp.amount.toLocaleString()}</span>
                        <p className="text-[10px] opacity-30">{new Date(exp.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                ))}
                </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-6 inset-x-6 h-18 rounded-2xl border flex items-center justify-around z-50 shadow-xl ${isDarkMode ? "bg-black/90 border-white/10" : "bg-white/95 border-black/10"}`}>
        {[ 
          {id: 'dashboard', icon: LayoutDashboard, label: 'Home'},
          {id: 'shops', icon: Store, label: 'Shops'},
          {id: 'history', icon: History, label: 'History'},
          {id: 'settings', icon: Settings, label: 'More'}
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`p-4 transition-all relative flex flex-col items-center ${activeTab === t.id ? 'text-[#d4af37]' : 'opacity-30'}`}>
            <t.icon size={22} />
            <span className="text-[8px] font-black uppercase mt-0.5">{t.label}</span>
            {activeTab === t.id && <div className="absolute -bottom-1 w-1.5 h-1.5 bg-[#d4af37] rounded-full"></div>}
          </button>
        ))}
      </nav>

      {/* --- EXPENSE MODAL --- */}
      {showModal === 'expense' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl">
          <div className="bg-[#0f0f0f] w-full max-w-sm p-8 rounded-2xl border border-[#d4af37]/30 relative">
            <button onClick={() => setShowModal(null)} className="absolute top-6 right-6 text-white/20"><X size={20}/></button>
            <h3 className="text-center font-black text-[#d4af37] mb-6 uppercase text-xs tracking-widest">ADD EXPENSE</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs font-black uppercase opacity-40 mb-1">Expense Type</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {type: 'fuel', icon: Fuel, label: 'Fuel'},
                    {type: 'food', icon: Coffee, label: 'Food'},
                    {type: 'transport', icon: Car, label: 'Travel'},
                    {type: 'other', icon: AlertCircle, label: 'Other'}
                  ].map(item => (
                    <button
                      key={item.type}
                      onClick={() => setExpenseType(item.type)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1 ${expenseType === item.type ? 'bg-[#d4af37]/20 border-[#d4af37]' : 'bg-black/40 border-white/5'}`}
                    >
                      <item.icon size={16} className={expenseType === item.type ? 'text-[#d4af37]' : 'text-white/40'} />
                      <span className="text-[10px] font-black uppercase">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <p className="text-xs font-black uppercase opacity-40 mb-1">Amount (Rs.)</p>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white font-bold text-center outline-none text-lg"
                />
              </div>
              
              <div>
                <p className="text-xs font-black uppercase opacity-40 mb-1">Note (Optional)</p>
                <textarea
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="Add note..."
                  className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white text-sm outline-none resize-none h-20"
                />
              </div>
              
              <button 
                onClick={saveExpense}
                className="w-full py-4 bg-[#d4af37] text-black font-black rounded-xl uppercase text-xs tracking-widest"
              >
                SAVE EXPENSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- NOTE MODAL --- */}
      {showModal === 'note' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl">
          <div className="bg-[#0f0f0f] w-full max-w-sm p-8 rounded-2xl border border-[#d4af37]/30 relative">
            <button onClick={() => setShowModal(null)} className="absolute top-6 right-6 text-white/20"><X size={20}/></button>
            <h3 className="text-center font-black text-[#d4af37] mb-6 uppercase text-xs tracking-widest">ADD NOTE</h3>
            
            <div className="space-y-4">
              <textarea
                value={repNote}
                onChange={(e) => setRepNote(e.target.value)}
                placeholder="Type your note here..."
                className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white text-sm outline-none resize-none h-32"
              />
              
              <button 
                onClick={saveNote}
                className="w-full py-4 bg-[#d4af37] text-black font-black rounded-xl uppercase text-xs tracking-widest"
              >
                SAVE NOTE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- INVOICE MODAL --- */}
      {showModal === 'invoice' && selectedShop && (
        <div className="fixed inset-0 bg-black z-[100] animate-in slide-in-from-bottom overflow-y-auto p-6">
          <div className="max-w-lg mx-auto pb-40">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-black py-3 border-b border-white/10">
              <div>
                <h2 className="text-2xl font-black uppercase text-white">{selectedShop.name}</h2>
                <p className="text-xs text-[#d4af37] font-black uppercase">New Bill</p>
              </div>
              <button onClick={() => { setShowModal(null); setCart({}); }} className="p-3 bg-white/10 rounded-full text-white"><X size={20}/></button>
            </div>
            
            <div className="space-y-3">
              {data.brands.map(b => (
                <div key={b.id} className="bg-[#0f0f0f] p-4 rounded-xl border border-white/5 flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-black uppercase text-white">{b.name} ({b.size})</h4>
                    <p className="text-xs text-[#d4af37] font-bold">Rs.{b.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1})} className="w-10 h-10 bg-white/5 rounded-xl text-white font-black">-</button>
                    <input type="number" value={cart[b.id] || ''} onChange={(e) => setCart({...cart, [b.id]: e.target.value})} className="w-10 bg-transparent text-center font-black text-[#d4af37] text-lg outline-none" placeholder="0" />
                    <button onClick={() => setCart({...cart, [b.id]: (Number(cart[b.id])||0)+1})} className="w-10 h-10 bg-white/5 rounded-xl text-white font-black">+</button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="fixed bottom-0 inset-x-0 p-6 bg-black/95 border-t border-white/10 backdrop-blur-xl">
              <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-black uppercase opacity-40">Total</span>
                  <span className="text-2xl font-black">Rs.{Object.entries(cart).reduce((acc, [id, q]) => acc + (data.brands.find(b=>b.id===id)?.price||0) * Number(q), 0).toLocaleString()}</span>
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
                }} className="w-full py-4 bg-[#d4af37] text-black font-black rounded-xl uppercase text-xs tracking-widest">
                  CONFIRM ORDER
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      {showModal === 'preview' && lastOrder && (
        <div className="fixed inset-0 bg-black z-[110] flex items-center justify-center p-6 backdrop-blur-3xl">
          <div className="bg-[#0f0f0f] w-full max-w-sm p-6 rounded-2xl border border-[#d4af37]/30 shadow-xl">
            <div className="flex flex-col items-center text-center mb-4">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 size={24}/>
                </div>
                <h3 className="text-lg font-black text-white uppercase">Bill Confirmed!</h3>
                <p className="text-xs text-white/40 uppercase font-bold mt-0.5">{lastOrder.shopName}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                   {lastOrder.items.map((it, idx) => (
                       <div key={idx} className="flex justify-between items-center text-xs uppercase font-bold">
                           <span className="text-white/60">{it.name} <span className="text-white">x{it.qty}</span></span>
                           <span className="text-white">Rs.{it.subtotal.toLocaleString()}</span>
                       </div>
                   ))}
                </div>
                <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-white">Total</span>
                    <span className="text-lg font-black text-[#d4af37]">Rs.{lastOrder.total.toLocaleString()}</span>
                </div>
            </div>

            <div className="space-y-2">
              <button onClick={() => shareToWhatsApp(lastOrder)} className="w-full py-3 bg-[#25D366] text-white font-black rounded-xl uppercase text-xs flex items-center justify-center gap-2">
                <Share2 size={14} /> Share to WhatsApp
              </button>
              <button onClick={() => { setShowModal(null); setLastOrder(null); }} className="w-full py-3 bg-white/5 text-white/60 font-black rounded-xl uppercase text-xs border border-white/5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REGISTER MODALS (Shop, Brand, Route) --- */}
      {['route', 'shop', 'brand'].includes(showModal) && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl">
          <div className="bg-[#0f0f0f] w-full max-w-sm p-8 rounded-2xl border border-[#d4af37]/30 relative">
            <button onClick={() => setShowModal(null)} className="absolute top-6 right-6 text-white/20"><X size={20}/></button>
            <h3 className="text-center font-black text-[#d4af37] mb-6 uppercase text-xs tracking-widest">New {showModal}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault(); const f = e.target;
              const payload = { userId: user.uid, timestamp: Date.now() };
              if(showModal==='route') await addDoc(collection(db, 'routes'), { ...payload, name: f.name.value.toUpperCase() });
              if(showModal==='shop') await addDoc(collection(db, 'shops'), { ...payload, name: f.name.value.toUpperCase(), area: f.area.value });
              if(showModal==='brand') await addDoc(collection(db, 'brands'), { ...payload, name: f.name.value.toUpperCase(), size: f.size.value.toUpperCase(), price: parseFloat(f.price.value) });
              setShowModal(null);
            }} className="space-y-3">
              <input name="name" placeholder={showModal === 'brand' ? "BRAND NAME" : showModal === 'shop' ? "SHOP NAME" : "ROUTE NAME"} 
                className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white font-bold uppercase outline-none focus:border-[#d4af37]" required />
              
              {showModal==='shop' && (
                <div className="relative">
                  <select name="area" className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white font-bold uppercase outline-none appearance-none" required>
                    <option value="">SELECT ROUTE</option>
                    {data.routes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 opacity-30" size={16}/>
                </div>
              )}
              
              {showModal==='brand' && (
                <>
                  <input name="size" placeholder="SIZE (500ML, 1KG)" 
                    className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white font-bold uppercase outline-none focus:border-[#d4af37]" required />
                  <input name="price" type="number" step="0.01" placeholder="UNIT PRICE" 
                    className="w-full bg-black/40 p-4 rounded-xl border border-white/5 text-white font-bold outline-none focus:border-[#d4af37]" required />
                </>
              )}
              
              <button className="w-full py-4 bg-[#d4af37] text-black font-black rounded-xl uppercase text-xs tracking-widest">
                SAVE
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .animate-progress { animation: progress 2.5s ease-in-out; } 
        @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } } 
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        
        /* Mobile Optimizations */
        @media (max-width: 640px) {
          main { font-size: 0.8rem !important; padding: 0.75rem !important; }
          h1 { font-size: 1.25rem !important; }
          h2 { font-size: 1.1rem !important; }
          h3 { font-size: 0.9rem !important; }
          .text-xs { font-size: 0.7rem !important; }
          .text-sm { font-size: 0.8rem !important; }
          nav { bottom: 0.5rem !important; inset-x: 0.5rem !important; height: 4rem !important; }
          header { padding: 0.75rem !important; }
        }
      `}</style>
    </div>
  );
}
