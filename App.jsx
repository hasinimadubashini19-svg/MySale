import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, deleteDoc, query, orderBy, where, enableIndexedDbPersistence, setDoc, updateDoc } from 'firebase/firestore';
import {
  LayoutDashboard, Store, Plus, X, Trash2, Crown, Settings, LogOut,
  MapPin, Package, History, Calendar, Sun, Moon, Save, Star, Search,
  CheckCircle2, ChevronDown, Share2, TrendingUp, Edit2, Calculator,
  ShoppingBag, DollarSign, Fuel, FileText, Navigation, AlertCircle,
  CreditCard, Coffee, Target, Percent, BarChart3, Hash, Package2,
  BookOpen, Filter, Eye, Clock, Download
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

try {
  enableIndexedDbPersistence(db);
} catch (err) {
  console.log("Offline mode ready");
}

export default function App() {
  // State Variables
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
  const [noteSearchDate, setNoteSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastOrder, setLastOrder] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [shopSearch, setShopSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');
  const [manualItems, setManualItems] = useState([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
  const [editingBrand, setEditingBrand] = useState(null);
  const [totalCalculation, setTotalCalculation] = useState({
    subtotal: 0,
    discount: 0,
    tax: 0,
    grandTotal: 0
  });
  const [expenseType, setExpenseType] = useState('fuel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [repNote, setRepNote] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showAllMonthlyBrands, setShowAllMonthlyBrands] = useState(false);

  // Toast Notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Splash Screen & Auth Listener
  useEffect(() => {
    const timer = setTimeout(() => setIsSplash(false), 1500);
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => {
      clearTimeout(timer);
      unsubAuth();
    };
  }, []);

  // Real-time Data Fetching
  useEffect(() => {
    if (!user) return;

    const unsubscribeFunctions = [];

    try {
      const collections = ['routes', 'shops', 'orders', 'brands', 'expenses', 'notes', 'locations'];

      collections.forEach(collectionName => {
        try {
          const q = query(
            collection(db, collectionName),
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc")
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            setData(prev => ({
              ...prev,
              [collectionName]: items
            }));
          }, (error) => {
            console.error(`Error fetching ${collectionName}:`, error);
          });

          unsubscribeFunctions.push(unsubscribe);
        } catch (error) {
          console.error(`Error setting up listener for ${collectionName}:`, error);
        }
      });

      const settingsUnsubscribe = onSnapshot(doc(db, "settings", user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            setData(prev => ({
              ...prev,
              settings: docSnap.data()
            }));
          }
        },
        (error) => {
          console.error("Error fetching settings:", error);
        }
      );

      unsubscribeFunctions.push(settingsUnsubscribe);

    } catch (error) {
      console.error("Error in data fetching useEffect:", error);
    }

    return () => {
      unsubscribeFunctions.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error("Error unsubscribing:", error);
        }
      });
    };
  }, [user]);

  // Get Current Location
  const getLocation = () => {
    if (!user) {
      showToast("Please login first!", "error");
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now()
          };
          setCurrentLocation(location);

          addDoc(collection(db, 'locations'), {
            ...location,
            userId: user.uid,
            date: new Date().toISOString().split('T')[0],
            type: 'user_location',
            name: `${data.settings.name || 'Rep'} Location`
          }).then(() => {
            showToast("📍 Location saved successfully!", "success");
          }).catch(err => {
            console.error("Error saving location:", err);
            showToast("Error saving location", "error");
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          showToast("Location access denied or unavailable", "error");
        }
      );
    } else {
      showToast("Geolocation is not supported by this browser.", "error");
    }
  };

  // Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login first!", "error");
      return;
    }

    try {
      const name = e.target.repName.value.toUpperCase();
      const company = e.target.companyName.value.toUpperCase();
      await setDoc(doc(db, "settings", user.uid), {
        name,
        company,
        userId: user.uid
      });
      showToast("✅ Profile Saved Successfully!", "success");
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // Save Expense
  const saveExpense = async () => {
    if (!user) {
      showToast("Please login first!", "error");
      return;
    }

    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      showToast("Please enter a valid amount", "error");
      return;
    }

    setIsSavingExpense(true);
    try {
      await addDoc(collection(db, 'expenses'), {
        type: expenseType,
        amount: parseFloat(expenseAmount),
        note: expenseNote,
        userId: user.uid,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      });
      showToast("✅ Expense saved successfully!", "success");
      setExpenseAmount('');
      setExpenseNote('');
      setShowModal(null);
    } catch (err) {
      showToast("Error saving expense: " + err.message, "error");
    } finally {
      setIsSavingExpense(false);
    }
  };

  // Delete Expense
  const deleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await deleteDoc(doc(db, 'expenses', expenseId));
        showToast("Expense deleted successfully!", "success");
      } catch (err) {
        showToast("Error deleting expense: " + err.message, "error");
      }
    }
  };

  // Delete Route
  const deleteRoute = async (routeId) => {
    if (window.confirm('Are you sure you want to delete this route?')) {
      try {
        await deleteDoc(doc(db, 'routes', routeId));
        showToast("Route deleted successfully!", "success");
      } catch (err) {
        showToast("Error deleting route: " + err.message, "error");
      }
    }
  };

  // Save Note
  const saveNote = async () => {
    if (!user) {
      showToast("Please login first!", "error");
      return;
    }

    if (!repNote.trim()) {
      showToast("Please enter a note", "error");
      return;
    }

    setIsSavingNote(true);
    try {
      await addDoc(collection(db, 'notes'), {
        text: repNote,
        userId: user.uid,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      });
      showToast("✅ Note saved successfully!", "success");
      setRepNote('');
      setShowModal(null);
    } catch (err) {
      showToast("Error saving note: " + err.message, "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Save Manual Order
  const saveManualOrder = async () => {
    if (!user) {
      showToast("Please login first!", "error");
      return;
    }

    const validItems = manualItems.filter(item => item.name && item.qty > 0 && item.price > 0);
    if (!validItems.length) {
      showToast("Please add at least one valid item!", "error");
      return;
    }

    if (!selectedShop) {
      showToast("Please select a shop first!", "error");
      return;
    }

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
      showToast("Error saving order: " + err.message, "error");
    }
  };

  // Calculate Total
  const calculateTotal = () => {
    const subtotal = parseFloat(totalCalculation.subtotal) || 0;
    const discount = parseFloat(totalCalculation.discount) || 0;
    const tax = parseFloat(totalCalculation.tax) || 0;
    const grandTotal = subtotal - discount + tax;

    setTotalCalculation(prev => ({
      ...prev,
      grandTotal: grandTotal
    }));

    showToast(`💰 Grand Total: Rs.${grandTotal.toLocaleString()}`, "info");
  };

  // FIXED Statistics Calculation
  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const getStats = (list) => {
      const summary = {};
      let totalSales = 0;
      let totalUnits = 0;

      list.forEach(o => {
        totalSales += o.total || 0;
        if (o.items && Array.isArray(o.items)) {
          o.items.forEach(i => {
            const qty = i.qty || 0;
            const price = i.price || 0;
            const subtotal = i.subtotal || 0;

            const itemName = i.name.split('(')[0].trim();

            totalUnits += qty;

            if (!summary[itemName]) {
              summary[itemName] = {
                units: 0,
                revenue: 0,
                price: price
              };
            }
            summary[itemName].units += qty;
            summary[itemName].revenue += subtotal;
          });
        }
      });

      // Sort by units sold (most to least)
      const sortedByUnits = Object.entries(summary).sort((a, b) => b[1].units - a[1].units);
      const topBrandByUnits = sortedByUnits[0];

      // Sort by revenue (most to least)
      const sortedByRevenue = Object.entries(summary).sort((a, b) => b[1].revenue - a[1].revenue);
      const topBrandByRevenue = sortedByRevenue[0];

      // Get all brands sorted by revenue
      const allBrandsSorted = Object.entries(summary)
        .map(([name, data]) => ({
          name,
          units: data.units,
          revenue: data.revenue,
          avgPrice: data.units > 0 ? data.revenue / data.units : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        totalSales,
        totalUnits,
        summary: allBrandsSorted,
        topBrand: topBrandByUnits ? topBrandByUnits[0] : 'N/A',
        topBrandUnits: topBrandByUnits ? topBrandByUnits[1].units : 0,
        topBrandRevenue: topBrandByRevenue ? topBrandByRevenue[1].revenue : 0,
        avgPrice: totalUnits > 0 ? totalSales / totalUnits : 0,
        allBrands: allBrandsSorted
      };
    };

    const dailyOrders = data.orders.filter(o => {
      try {
        return o.dateString === todayStr;
      } catch {
        return false;
      }
    });

    const monthlyOrders = data.orders.filter(o => {
      try {
        const d = new Date(o.timestamp);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      } catch {
        return false;
      }
    });

    const todayExpenses = data.expenses.filter(e => e.date === todayStr);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const todayNotes = data.notes.filter(n => n.date === todayStr);

    return {
      daily: getStats(dailyOrders),
      monthly: getStats(monthlyOrders),
      expenses: totalExpenses,
      notes: todayNotes.length,
      todayExpenses: todayExpenses
    };
  }, [data.orders, data.expenses, data.notes]);

  // Filter Shops
  const filteredShops = useMemo(() => {
    return data.shops.filter(s => {
      const shopName = s.name || '';
      const shopArea = s.area || '';
      const searchTerm = shopSearch.toLowerCase();

      const matchesSearch = shopName.toLowerCase().includes(searchTerm) ||
                           shopArea.toLowerCase().includes(searchTerm);
      const matchesRoute = selectedRouteFilter === 'ALL' || s.area === selectedRouteFilter;
      return matchesSearch && matchesRoute;
    });
  }, [data.shops, shopSearch, selectedRouteFilter]);

  // Filter Notes by Date
  const filteredNotes = useMemo(() => {
    return data.notes.filter(note => {
      try {
        return note.date === noteSearchDate;
      } catch {
        return false;
      }
    });
  }, [data.notes, noteSearchDate]);

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

  // WhatsApp Share Functions
  const shareToWhatsApp = (order) => {
    if (!order) return;

    let msg = `*${order.companyName || "MONARCH"} - INVOICE*\n`;
    msg += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
    msg += `🏪 *Shop:* ${order.shopName || "Unknown Shop"}\n`;
    msg += `📅 *Date:* ${order.timestamp ? new Date(order.timestamp).toLocaleString() : new Date().toLocaleString()}\n`;

    if (currentLocation) {
      const mapsUrl = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
      msg += `📍 *Location:* ${mapsUrl}\n`;
    }

    msg += `\n*ITEMS:*\n`;
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(i => {
        msg += `• ${i.name || "Item"} (${i.qty || 0} x Rs.${i.price || 0}) = *Rs.${(i.subtotal || 0).toLocaleString()}*\n`;
      });
    }
    msg += `\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
    msg += `💰 *TOTAL BILL: Rs.${(order.total || 0).toLocaleString()}*\n`;
    msg += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
    msg += `_Generated by Monarch Pro_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const shareBillWithLocation = (order) => {
    if (!order) return;

    let msg = `*${order.companyName || "MONARCH"} - INVOICE*\n`;
    msg += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
    msg += `🏪 *Shop:* ${order.shopName || "Unknown Shop"}\n`;
    msg += `📅 *Date:* ${order.timestamp ? new Date(order.timestamp).toLocaleString() : new Date().toLocaleString()}\n`;

    if (currentLocation) {
      const mapsUrl = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
      msg += `📍 *Delivery Location:* ${mapsUrl}\n`;
    } else {
      showToast("Location not available. Sending bill without location.", "info");
    }

    msg += `\n*ITEMS:*\n`;
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(i => {
        msg += `• ${i.name || "Item"} (${i.qty || 0} x Rs.${i.price || 0}) = *Rs.${(i.subtotal || 0).toLocaleString()}*\n`;
      });
    }
    msg += `\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
    msg += `💰 *TOTAL BILL: Rs.${(order.total || 0).toLocaleString()}*\n`;
    msg += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
    msg += `_Generated by Monarch Pro_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Auth Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      if (isRegisterMode) {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("Account created successfully!", "success");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Welcome back!", "success");
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  // Cart Total
  const calculateCartTotal = () => {
    return Object.entries(cart).reduce((acc, [id, q]) => {
      const brand = data.brands.find(b => b.id === id);
      const price = brand?.price || 0;
      const quantity = Number(q) || 0;
      return acc + (price * quantity);
    }, 0);
  };

  // Create Order from Cart
  const handleCreateOrder = async () => {
    if (!user) {
      showToast("Please login first!", "error");
      return;
    }

    if (!selectedShop) {
      showToast("Please select a shop first!", "error");
      return;
    }

    const items = Object.entries(cart)
      .filter(([_, q]) => q > 0)
      .map(([id, q]) => {
        const b = data.brands.find(x => x.id === id);
        const quantity = Number(q) || 0;
        const price = b?.price || 0;
        return {
          name: `${b?.name || 'Unknown'} (${b?.size || ''})`,
          qty: quantity,
          price: price,
          subtotal: price * quantity
        };
      });

    if (items.length === 0) {
      showToast("Cart is empty!", "error");
      return;
    }

    const orderData = {
      shopName: selectedShop.name,
      companyName: data.settings.company || "MONARCH",
      items,
      total: items.reduce((s, i) => s + i.subtotal, 0),
      userId: user.uid,
      timestamp: Date.now(),
      dateString: new Date().toLocaleDateString(),
      location: currentLocation
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      setCart({});
      setLastOrder(orderData);
      setShowModal('preview');
      showToast("Order saved successfully!", "success");
    } catch (err) {
      showToast("Error saving order: " + err.message, "error");
    }
  };

  // Delete Note
  const deleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      try {
        await deleteDoc(doc(db, 'notes', noteId));
        showToast("Note deleted successfully!", "success");
      } catch (err) {
        showToast("Error deleting note: " + err.message, "error");
      }
    }
  };

  // Save Brand Edit
  const saveBrandEdit = async (brandId, field, value) => {
    try {
      await updateDoc(doc(db, 'brands', brandId), { 
        [field]: field === 'price' ? parseFloat(value) : value.toUpperCase()
      });
      showToast("Brand updated successfully!", "success");
    } catch (err) {
      showToast("Error updating brand: " + err.message, "error");
    }
  };

  // --- RENDER ---

  // Splash Screen
  if (isSplash || loading) return (
    <div className="h-screen bg-gradient-to-br from-black to-gray-900 flex flex-col items-center justify-center">
      <Crown size={70} className="text-[#d4af37] animate-pulse" />
      <h1 className="mt-6 text-[#d4af37] text-3xl font-black tracking-widest italic uppercase">Monarch Pro</h1>
      <p className="mt-2 text-white/50 text-sm uppercase tracking-widest">For My Love</p>
      <div className="mt-6 w-56 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] animate-progress shadow-[0_0_15px_#d4af37]"></div>
      </div>
    </div>
  );

  // Login Screen
  if (!user) return (
    <div className="h-screen bg-gradient-to-br from-black to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-4">
          <Crown size={60} className="text-[#d4af37] mx-auto animate-bounce" />
          <h2 className="text-white font-black text-2xl tracking-widest uppercase">
            {isRegisterMode ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-white/60 text-sm">
            {isRegisterMode ? "Join Monarch Pro Today" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input
              name="email"
              type="email"
              placeholder="EMAIL ADDRESS"
              className="w-full bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37] transition-all"
              required
            />
          </div>
          <div>
            <input
              name="password"
              type="password"
              placeholder="PASSWORD"
              className="w-full bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37] transition-all"
              required
            />
          </div>

          <button type="submit" className="w-full py-4 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-2xl shadow-lg uppercase text-sm tracking-widest hover:opacity-90 transition-all">
            {isRegisterMode ? "Sign Up" : "Login"}
          </button>

          <button
            type="button"
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-[#d4af37] text-sm font-bold uppercase tracking-widest opacity-80 hover:opacity-100 transition-all"
          >
            {isRegisterMode ? "Already have an account? Login" : "New User? Create Account"}
          </button>
        </form>
      </div>
    </div>
  );

  // Main App
  return (
    <div className={`min-h-screen pb-40 transition-all duration-500 ${isDarkMode ? "bg-gradient-to-b from-black to-gray-900 text-white" : "bg-gradient-to-b from-gray-50 to-gray-100 text-gray-900"}`}>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-6 py-3 rounded-xl shadow-2xl backdrop-blur-xl border ${
          toast.type === 'success' ? 'bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-500 border-green-500/30' :
          toast.type === 'error' ? 'bg-gradient-to-r from-red-500/20 to-rose-600/20 text-red-500 border-red-500/30' :
          'bg-gradient-to-r from-blue-500/20 to-cyan-600/20 text-blue-500 border-blue-500/30'
        }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' && <CheckCircle2 size={20} />}
            {toast.type === 'error' && <AlertCircle size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl border-b ${isDarkMode ? "bg-black/90 border-white/5" : "bg-white/95 border-gray-200 shadow-sm"}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-xl text-black shadow-lg">
            <Crown size={20} />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-none uppercase">
              {data.settings.company || "MONARCH"}
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isDarkMode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
              {data.settings.name || "Sales Representative"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-xl border ${isDarkMode ? "bg-white/5 text-[#d4af37] border-white/10" : "bg-gray-100 text-gray-700 border-gray-200"} hover:opacity-80 transition-all`}
          >
            {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
          <button
            onClick={() => setShowModal('expense')}
            className={`p-2.5 rounded-xl border ${isDarkMode ? "bg-white/5 text-[#d4af37] border-white/10" : "bg-gray-100 text-gray-700 border-gray-200"} hover:opacity-80 transition-all`}
          >
            <CreditCard size={18}/>
          </button>
          <button
            onClick={() => setShowCalculator(true)}
            className={`p-2.5 rounded-xl border ${isDarkMode ? "bg-white/5 text-[#d4af37] border-white/10" : "bg-gray-100 text-gray-700 border-gray-200"} hover:opacity-80 transition-all`}
          >
            <Calculator size={18}/>
          </button>
          <button
            onClick={() => signOut(auth)}
            className="p-2.5 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            <LogOut size={18}/>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 max-w-lg mx-auto space-y-4" style={{ fontSize: '0.80rem' }}>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">

            {/* Today's Revenue Card */}
            <div className="bg-gradient-to-br from-[#d4af37] via-[#c19a2e] to-[#b8860b] p-5 rounded-2xl text-black shadow-2xl relative overflow-hidden">
              <Star className="absolute -right-4 -top-4 opacity-10" size={100} />
              <div className="relative z-10">
                <p className="text-xs font-black uppercase opacity-80 mb-1 tracking-widest">Today's Revenue</p>
                <h2 className="text-3xl font-black italic tracking-tighter">Rs.{stats.daily.totalSales.toLocaleString()}</h2>
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-full border border-black/10">
                    <Target size={12} />
                    <span className="text-xs font-black uppercase italic">Top: {stats.daily.topBrand}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase opacity-80">Expenses</p>
                    <p className="text-sm font-black text-red-700">Rs.{stats.expenses.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setShowModal('expense')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 hover:scale-[1.02] transition-all ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 text-white"
                    : "bg-white border-gray-200 text-gray-800 shadow-sm"
                }`}
              >
                <Fuel size={18} className="text-[#d4af37]" />
                <span className="text-[9px] font-black uppercase">Expense</span>
              </button>
              <button
                onClick={getLocation}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 hover:scale-[1.02] transition-all ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 text-white"
                    : "bg-white border-gray-200 text-gray-800 shadow-sm"
                }`}
              >
                <Navigation size={18} className="text-[#d4af37]" />
                <span className="text-[9px] font-black uppercase">Location</span>
              </button>
              <button
                onClick={() => setShowModal('note')}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 hover:scale-[1.02] transition-all ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 text-white"
                    : "bg-white border-gray-200 text-gray-800 shadow-sm"
                }`}
              >
                <FileText size={18} className="text-[#d4af37]" />
                <span className="text-[9px] font-black uppercase">Note</span>
              </button>
              <button
                onClick={() => setShowCalculator(true)}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 hover:scale-[1.02] transition-all ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 text-white"
                    : "bg-white border-gray-200 text-gray-800 shadow-sm"
                }`}
              >
                <Calculator size={18} className="text-[#d4af37]" />
                <span className="text-[9px] font-black uppercase">Calc</span>
              </button>
            </div>

            {/* Monthly Performance - ENHANCED */}
            <div className={`p-5 rounded-2xl border shadow-xl ${
              isDarkMode
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                : "bg-white border-gray-200 shadow-lg"
            }`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black text-[#d4af37] uppercase tracking-widest">Monthly Performance</h3>
                  <p className="text-[9px] opacity-50 mt-1">Current Month Statistics</p>
                </div>
                <BarChart3 size={16} className="text-[#d4af37] opacity-60" />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className={`p-3 rounded-xl border ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5"
                    : "bg-gray-50 border-gray-100"
                }`}>
                  <p className="text-[9px] font-black uppercase mb-1" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Revenue</p>
                  <p className="text-lg font-black" style={{ color: isDarkMode ? 'white' : 'black' }}>Rs.{stats.monthly.totalSales.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5"
                    : "bg-gray-50 border-gray-100"
                }`}>
                  <p className="text-[9px] font-black uppercase mb-1" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Total Units</p>
                  <p className="text-lg font-black text-[#d4af37]">{stats.monthly.totalUnits || 0}</p>
                </div>
              </div>

              {/* Monthly Top Brand Section - IMPROVED */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-black uppercase" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Monthly Top Brands</p>
                  <button
                    onClick={() => setShowAllMonthlyBrands(!showAllMonthlyBrands)}
                    className="text-[#d4af37] text-[9px] font-black uppercase"
                  >
                    {showAllMonthlyBrands ? 'Show Less' : 'Show All'}
                  </button>
                </div>

                {/* Top Brand Highlight */}
                <div className={`p-3 rounded-xl border mb-2 ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5"
                    : "bg-gray-50 border-gray-100"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Target size={14} className="text-[#d4af37]" />
                        <p className="text-sm font-black uppercase" style={{ color: isDarkMode ? 'white' : 'black' }}>
                          {stats.monthly.topBrand || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Package2 size={11} style={{ opacity: 0.5 }} />
                          <span className="text-xs" style={{ opacity: 0.7, color: isDarkMode ? 'white' : 'black' }}>
                            {stats.monthly.topBrandUnits} units
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign size={11} style={{ opacity: 0.5 }} />
                          <span className="text-xs" style={{ opacity: 0.7, color: isDarkMode ? 'white' : 'black' }}>
                            Rs.{stats.monthly.topBrandRevenue?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-50 mb-1">Revenue Share</p>
                      <p className="text-base font-black text-[#d4af37]">
                        {stats.monthly.totalSales > 0 ?
                          ((stats.monthly.topBrandRevenue / stats.monthly.totalSales) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Show All Brands Performance */}
                {showAllMonthlyBrands && stats.monthly.allBrands.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="text-[9px] font-black uppercase opacity-60">All Brands Performance</p>
                    {stats.monthly.allBrands.slice(0, 5).map((brand, index) => (
                      <div key={index} className={`p-2.5 rounded-xl border flex justify-between items-center ${
                        isDarkMode
                          ? "bg-black/40 border-white/5"
                          : "bg-gray-50/50 border-gray-100"
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                            isDarkMode ? "bg-white/10" : "bg-gray-200"
                          }`}>
                            <span className="text-xs font-black">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold" style={{ color: isDarkMode ? 'white' : 'black' }}>
                              {brand.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] opacity-50">{brand.units} units</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-[#d4af37]">Rs.{brand.revenue.toLocaleString()}</p>
                          <p className="text-[10px] opacity-50 mt-0.5">
                            {stats.monthly.totalSales > 0 ?
                              ((brand.revenue / stats.monthly.totalSales) * 100).toFixed(1) : 0}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {stats.monthly.allBrands.length === 0 && (
                  <div className="text-center py-4">
                    <Package2 size={30} className="mx-auto opacity-20 mb-2" />
                    <p className="text-xs opacity-30 italic">No monthly sales data available</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-black uppercase" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Avg Price per Unit</p>
                  <p className="text-xs font-black" style={{ color: isDarkMode ? 'white' : 'black' }}>Rs.{stats.monthly.avgPrice.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-black uppercase" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>Today's Notes</p>
                  <p className="text-xs font-black text-[#d4af37]">{stats.notes}</p>
                </div>
              </div>
            </div>

            {/* Today's Sales - FIXED */}
            <div className={`p-5 rounded-2xl border shadow-xl ${
              isDarkMode
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                : "bg-white border-gray-200 shadow-lg"
            }`}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-black text-[#d4af37] uppercase tracking-widest">Today's Sales</h3>
                  <p className="text-[9px] opacity-50 mt-1">Itemized Breakdown</p>
                </div>
                <TrendingUp size={16} className="text-[#d4af37] opacity-60" />
              </div>

              <div className="space-y-2">
                {stats.daily.summary.slice(0, 4).map((item, index) => (
                  <div key={index} className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                    isDarkMode
                      ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 hover:border-[#d4af37]/30"
                      : "bg-gray-50 border-gray-100 hover:border-[#d4af37]"
                  }`}>
                    <div className="flex-1">
                      <p className="text-xs font-black uppercase tracking-tight mb-1" style={{ color: isDarkMode ? 'white' : 'black' }}>{item.name}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Hash size={9} style={{ opacity: 0.5 }} />
                          <span className="text-[9px]" style={{ opacity: 0.7, color: isDarkMode ? 'white' : 'black' }}>{item.units} UNITS</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-base tabular-nums text-[#d4af37]">Rs.{item.revenue.toLocaleString()}</p>
                      <p className="text-[8px] opacity-50" style={{ color: isDarkMode ? 'white' : 'black' }}>Revenue</p>
                    </div>
                  </div>
                ))}
                {stats.daily.summary.length === 0 && (
                  <div className="text-center py-6">
                    <Package2 size={30} className="mx-auto opacity-20 mb-2" />
                    <p className="text-xs opacity-30 italic">No sales recorded today</p>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Expenses Breakdown */}
            {stats.todayExpenses.length > 0 && (
              <div className={`p-5 rounded-2xl border shadow-xl ${
                isDarkMode
                  ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                  : "bg-white border-gray-200 shadow-lg"
              }`}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-black text-[#d4af37] uppercase tracking-widest">Today's Expenses</h3>
                    <p className="text-[9px] opacity-50 mt-1">Breakdown by Category</p>
                  </div>
                  <CreditCard size={16} className="text-[#d4af37] opacity-60" />
                </div>

                <div className="space-y-2">
                  {Object.entries(
                    stats.todayExpenses.reduce((acc, expense) => {
                      const type = expense.type || 'other';
                      if (!acc[type]) acc[type] = 0;
                      acc[type] += expense.amount || 0;
                      return acc;
                    }, {})
                  ).map(([type, amount], index) => (
                    <div key={index} className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                      isDarkMode
                        ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 hover:border-red-500/30"
                        : "bg-gray-50 border-gray-100 hover:border-red-500"
                    }`}>
                      <div className="flex items-center gap-2">
                        {type === 'fuel' && <Fuel size={16} className="text-red-500" />}
                        {type === 'food' && <Coffee size={16} className="text-amber-500" />}
                        {type === 'transport' && <Navigation size={16} className="text-blue-500" />}
                        {type === 'other' && <AlertCircle size={16} className="text-gray-500" />}
                        <div>
                          <p className="text-xs font-black uppercase" style={{ color: isDarkMode ? 'white' : 'black' }}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-base tabular-nums text-red-500">Rs.{amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shops Tab */}
        {activeTab === 'shops' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className={`p-3 rounded-2xl border flex items-center gap-2 ${
                isDarkMode
                  ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                  : "bg-white border-gray-200 shadow-sm"
              }`}>
                <Search size={16} className="opacity-30"/>
                <input
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  placeholder="SEARCH SHOP BY NAME OR AREA..."
                  className="bg-transparent text-xs font-black uppercase outline-none w-full placeholder:opacity-30"
                  style={{ 
                    color: isDarkMode ? 'white' : 'black',
                    fontFamily: "'Roboto', 'Segoe UI', sans-serif",
                    fontWeight: '900',
                    letterSpacing: '0.5px'
                  }}
                />
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedRouteFilter('ALL')}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border flex-shrink-0 ${
                    selectedRouteFilter === 'ALL'
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]'
                      : isDarkMode
                        ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/10 text-white/60'
                        : 'bg-gray-100 border-gray-200 text-gray-600'
                  }`}
                >
                  ALL
                </button>
                {data.routes.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRouteFilter(r.name)}
                    className={`px-4 py-2 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap border flex-shrink-0 ${
                      selectedRouteFilter === r.name
                        ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]'
                        : isDarkMode
                          ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/10 text-white/60'
                          : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowModal('shop')}
                className={`flex-1 py-4 rounded-2xl border-2 border-dashed text-[#d4af37] font-black uppercase text-xs flex items-center justify-center gap-1.5 hover:border-[#d4af37] transition-all ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-[#d4af37]/40'
                    : 'bg-gray-50 border-[#d4af37]/60'
                }`}
              >
                <Plus size={16}/> New Shop
              </button>
              <button
                onClick={() => { setSelectedShop(null); setShowModal('manual'); }}
                className={`flex-1 py-4 rounded-2xl border-2 border-dashed text-green-500 font-black uppercase text-xs flex items-center justify-center gap-1.5 hover:border-green-500 transition-all ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-green-500/40'
                    : 'bg-gray-50 border-green-500/60'
                }`}
              >
                <ShoppingBag size={16}/> Manual
              </button>
            </div>

            <div className="grid gap-2">
              {filteredShops.map(s => (
                <div
                  key={s.id}
                  className={`p-4 rounded-2xl border flex justify-between items-center transition-all ${
                    isDarkMode
                      ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/5 hover:border-[#d4af37]/30"
                      : "bg-white border-gray-200 shadow-sm hover:border-[#d4af37] hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-[#d4af37]/10 to-[#b8860b]/5 rounded-xl text-[#d4af37] border border-[#d4af37]/20">
                      <Store size={18}/>
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase leading-tight" style={{ color: isDarkMode ? 'white' : 'black' }}>{s.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin size={11} className="opacity-40" />
                        <p className="text-[10px] font-bold uppercase tracking-tighter" style={{ opacity: 0.6, color: isDarkMode ? 'white' : 'black' }}>{s.area}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={async () => {
                        if(window.confirm('Delete this shop?'))
                          await deleteDoc(doc(db, 'shops', s.id))
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        isDarkMode
                          ? 'text-red-500/30 hover:text-red-500 hover:bg-red-500/10'
                          : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={16}/>
                    </button>
                    <button
                      onClick={() => { setSelectedShop(s); setShowModal('invoice'); }}
                      className="bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg hover:opacity-90 transition-all"
                    >
                      BILL
                    </button>
                  </div>
                </div>
              ))}
              {filteredShops.length === 0 && (
                <div className="text-center py-6">
                  <Store size={30} className="mx-auto opacity-20 mb-2" />
                  <p className="text-xs opacity-30 italic">No shops found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isDarkMode
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                : "bg-white border-gray-200 shadow-sm"
            }`}>
              <Calendar size={18} className="text-[#d4af37]"/>
              <input
                type="date"
                className="bg-transparent text-xs font-black uppercase outline-none w-full"
                onChange={(e) => setSearchDate(e.target.value)}
                value={searchDate}
                style={{ color: isDarkMode ? 'white' : 'black' }}
              />
            </div>

            {data.orders
              .filter(o => {
                try {
                  const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
                  return orderDate === searchDate;
                } catch {
                  return false;
                }
              })
              .map((o) => (
              <div
                key={o.id}
                className={`p-5 rounded-2xl border ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/5 shadow-xl"
                    : "bg-white border-gray-200 shadow-lg"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#d4af37] mb-1">{o.shopName}</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] opacity-60 font-black uppercase" style={{ color: isDarkMode ? 'white' : 'black' }}>{o.companyName}</p>
                      {o.isManual && (
                        <span className="text-[8px] bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-500 px-2 py-0.5 rounded-full border border-green-500/30">
                          MANUAL
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => shareBillWithLocation(o)}
                      className={`p-2 rounded-lg transition-all ${
                        isDarkMode
                          ? 'text-[#d4af37] hover:bg-[#d4af37]/10'
                          : 'text-[#d4af37] hover:bg-[#d4af37]/20'
                      }`}
                      title="Share with Location"
                    >
                      <Navigation size={16}/>
                    </button>
                    <button
                      onClick={() => shareToWhatsApp(o)}
                      className={`p-2 rounded-lg transition-all ${
                        isDarkMode
                          ? 'text-[#d4af37] hover:bg-[#d4af37]/10'
                          : 'text-[#d4af37] hover:bg-[#d4af37]/20'
                      }`}
                      title="Share Bill"
                    >
                      <Share2 size={16}/>
                    </button>
                    <button
                      onClick={async () => {
                        if(window.confirm('Delete this bill?'))
                          await deleteDoc(doc(db, 'orders', o.id))
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        isDarkMode
                          ? 'text-red-500/30 hover:text-red-500 hover:bg-red-500/10'
                          : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 border-y py-3 my-3" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }}>
                  {o.items && o.items.map((i, k) => (
                    <div key={k} className="flex justify-between items-center text-xs uppercase font-bold">
                      <div className="flex items-center gap-2">
                        <span style={{ opacity: 0.6, color: isDarkMode ? 'white' : 'black' }}>{i.name}</span>
                        <span className="text-[9px]" style={{ opacity: 0.4, color: isDarkMode ? 'white' : 'black' }}>x{i.qty} @ Rs.{i.price}</span>
                      </div>
                      <span className="text-[#d4af37] font-black">Rs.{i.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center font-black pt-2">
                  <span className="text-xs uppercase" style={{ opacity: 0.4, color: isDarkMode ? 'white' : 'black' }}>Total Amount</span>
                  <span className="text-xl text-[#d4af37]">Rs.{o.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
            {data.orders.filter(o => {
              try {
                const orderDate = new Date(o.timestamp).toISOString().split('T')[0];
                return orderDate === searchDate;
              } catch {
                return false;
              }
            }).length === 0 && (
              <div className="text-center py-6">
                <History size={30} className="mx-auto opacity-20 mb-2" />
                <p className="text-xs opacity-30 italic">No orders found for this date</p>
              </div>
            )}
          </div>
        )}

        {/* NEW NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
              isDarkMode
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                : "bg-white border-gray-200 shadow-sm"
            }`}>
              <Calendar size={18} className="text-[#d4af37]"/>
              <input
                type="date"
                className="bg-transparent text-xs font-black uppercase outline-none w-full"
                onChange={(e) => setNoteSearchDate(e.target.value)}
                value={noteSearchDate}
                style={{ color: isDarkMode ? 'white' : 'black' }}
              />
              <button
                onClick={() => setShowModal('note')}
                className="bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black px-3 py-2 rounded-xl text-xs font-black uppercase shadow-lg hover:opacity-90 transition-all"
              >
                Add Note
              </button>
            </div>

            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className={`p-5 rounded-2xl border ${
                    isDarkMode
                      ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/5 shadow-xl"
                      : "bg-white border-gray-200 shadow-lg"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg text-blue-500 border border-blue-500/20">
                        <BookOpen size={16}/>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Clock size={11} className="opacity-50"/>
                          <span className="text-[10px] opacity-60">
                            {new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-[10px] opacity-40 mt-0.5">{note.date}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        isDarkMode
                          ? 'text-red-500/30 hover:text-red-500 hover:bg-red-500/10'
                          : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs leading-relaxed" style={{ color: isDarkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.8)' }}>
                      {note.text}
                    </p>
                  </div>
                </div>
              ))}

              {filteredNotes.length === 0 && (
                <div className="text-center py-8">
                  <BookOpen size={40} className="mx-auto opacity-20 mb-3" />
                  <p className="text-xs opacity-30 italic">No notes found for this date</p>
                  <button
                    onClick={() => setShowModal('note')}
                    className="mt-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase shadow-lg hover:opacity-90 transition-all"
                  >
                    Add Your First Note
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4 pb-16">
            {/* Profile Settings */}
            <form
              onSubmit={handleSaveProfile}
              className={`p-5 rounded-2xl border space-y-4 ${
                isDarkMode
                  ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10 shadow-xl"
                  : "bg-white border-gray-200 shadow-lg"
              }`}
            >
              <div>
                <h3 className="text-xs font-black text-[#d4af37] uppercase tracking-widest mb-1">Profile Settings</h3>
                <p className="text-[10px]" style={{ opacity: 0.5, color: isDarkMode ? 'white' : 'black' }}>Update your personal information</p>
              </div>

              <input
                name="repName"
                defaultValue={data.settings.name}
                placeholder="YOUR FULL NAME"
                className={`w-full p-3 rounded-xl border text-xs font-black uppercase outline-none focus:border-[#d4af37] transition-all ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />

              <input
                name="companyName"
                defaultValue={data.settings.company}
                placeholder="COMPANY NAME"
                className={`w-full p-3 rounded-xl border text-xs font-black uppercase outline-none focus:border-[#d4af37] transition-all ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 hover:opacity-90 transition-all">
                <Save size={16}/> SAVE PROFILE
              </button>
            </form>

            {/* Quick Add Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowModal('route')}
                className={`py-4 rounded-xl border text-[#d4af37] font-black uppercase text-xs flex flex-col items-center gap-1.5 hover:border-[#d4af37] transition-all ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <MapPin size={20}/> ADD ROUTE
              </button>
              <button
                onClick={() => setShowModal('brand')}
                className={`py-4 rounded-xl border text-[#d4af37] font-black uppercase text-xs flex flex-col items-center gap-1.5 hover:border-[#d4af37] transition-all ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Package size={20}/> ADD BRAND
              </button>
            </div>

            {/* Routes Management Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Routes List</h4>
                <span className="text-[10px]" style={{ opacity: 0.5, color: isDarkMode ? 'white' : 'black' }}>{data.routes.length} routes</span>
              </div>

              <div className="grid gap-1.5 mb-4">
                {data.routes.map(r => (
                  <div
                    key={r.id}
                    className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                      isDarkMode
                        ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 hover:border-[#d4af37]/30'
                        : 'bg-gray-50 border-gray-100 hover:border-[#d4af37]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#d4af37]" />
                      <span className="text-xs font-black uppercase" style={{ color: isDarkMode ? 'white' : 'black' }}>{r.name}</span>
                    </div>
                    <button
                      onClick={() => deleteRoute(r.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        isDarkMode
                          ? 'text-red-500/40 hover:text-red-500 hover:bg-red-500/10'
                          : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                ))}
                {data.routes.length === 0 && (
                  <div className="text-center py-4">
                    <MapPin size={25} className="mx-auto opacity-20 mb-1.5" />
                    <p className="text-xs opacity-30 italic">No routes added yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Brands List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Brands List</h4>
                <span className="text-[10px]" style={{ opacity: 0.5, color: isDarkMode ? 'white' : 'black' }}>{data.brands.length} brands</span>
              </div>

              <div className="grid gap-1.5">
                {data.brands.map(b => (
                  <div
                    key={b.id}
                    className={`p-3 rounded-xl border flex justify-between items-center hover:border-[#d4af37]/30 transition-all ${
                      isDarkMode
                        ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    {editingBrand === b.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <input
                            defaultValue={b.name}
                            className={`p-2 rounded-lg flex-1 text-xs border outline-none ${
                              isDarkMode
                                ? 'bg-black/50 border-white/10 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            onBlur={(e) => saveBrandEdit(b.id, 'name', e.target.value)}
                            autoFocus
                          />
                          <input
                            defaultValue={b.size}
                            className={`p-2 rounded-lg w-20 text-xs border outline-none ${
                              isDarkMode
                                ? 'bg-black/50 border-white/10 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            onBlur={(e) => saveBrandEdit(b.id, 'size', e.target.value)}
                          />
                          <input
                            defaultValue={b.price}
                            type="number"
                            className={`p-2 rounded-lg w-24 text-xs border outline-none ${
                              isDarkMode
                                ? 'bg-black/50 border-white/10 text-white'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                            onBlur={(e) => saveBrandEdit(b.id, 'price', e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingBrand(null)}
                            className={`flex-1 py-1.5 text-xs font-black rounded-lg border transition-all ${
                              isDarkMode
                                ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white/60 border-white/5 hover:border-white/10'
                                : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => setEditingBrand(null)}
                            className="flex-1 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-black rounded-lg hover:opacity-90 transition-all"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-black uppercase">
                          <span className="block" style={{ color: isDarkMode ? 'white' : 'black' }}>{b.name} ({b.size})</span>
                          <span className="text-[#d4af37] text-[10px] mt-0.5">Rs.{b.price}/unit</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingBrand(b.id)}
                            className={`p-1.5 rounded-lg transition-all ${
                              isDarkMode
                                ? 'text-blue-500/40 hover:text-blue-500 hover:bg-blue-500/10'
                                : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                          >
                            <Edit2 size={14}/>
                          </button>
                          <button
                            onClick={async () => {
                              if(window.confirm('Delete this brand?'))
                                await deleteDoc(doc(db, 'brands', b.id))
                            }}
                            className={`p-1.5 rounded-lg transition-all ${
                              isDarkMode
                                ? 'text-red-500/40 hover:text-red-500 hover:bg-red-500/10'
                                : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {data.brands.length === 0 && (
                  <div className="text-center py-4">
                    <Package size={25} className="mx-auto opacity-20 mb-1.5" />
                    <p className="text-xs opacity-30 italic">No brands added yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Today's Expenses - WITH DELETE OPTION */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Today's Expenses</h4>
                <span className="text-[10px]" style={{ opacity: 0.5, color: isDarkMode ? 'white' : 'black' }}>Rs.{stats.expenses.toLocaleString()}</span>
              </div>

              <div className="space-y-1.5">
                {data.expenses
                  .filter(e => e.date === new Date().toISOString().split('T')[0])
                  .map(exp => (
                  <div
                    key={exp.id}
                    className={`p-3 rounded-xl border flex justify-between items-center hover:border-red-500/30 transition-all ${
                      isDarkMode
                        ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {exp.type === 'fuel' && <Fuel size={12} className="text-red-500" />}
                          {exp.type === 'food' && <Coffee size={12} className="text-amber-500" />}
                          {exp.type === 'transport' && <Navigation size={12} className="text-blue-500" />}
                          {exp.type === 'other' && <AlertCircle size={12} className="text-gray-500" />}
                          <span className="text-xs font-black uppercase" style={{ color: isDarkMode ? 'white' : 'black' }}>{exp.type}</span>
                        </div>
                        {exp.note && <p className="text-[10px] mt-0.5" style={{ opacity: 0.6, color: isDarkMode ? 'white' : 'black' }}>{exp.note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-red-500">Rs.{exp.amount.toLocaleString()}</span>
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className={`p-1 rounded-lg transition-all ${
                          isDarkMode
                            ? 'text-red-500/30 hover:text-red-500 hover:bg-red-500/10'
                            : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </div>
                ))}

                {data.expenses.filter(e => e.date === new Date().toISOString().split('T')[0]).length === 0 && (
                  <div className="text-center py-4">
                    <CreditCard size={30} className="mx-auto opacity-20 mb-1.5" />
                    <p className="text-xs opacity-30 italic">No expenses recorded today</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation - UPDATED WITH NOTES TAB */}
      <nav className={`fixed bottom-4 inset-x-4 h-16 rounded-2xl border flex items-center justify-around z-50 shadow-2xl ${
        isDarkMode
          ? "bg-gradient-to-br from-black/95 to-gray-900/95 border-white/10 backdrop-blur-xl"
          : "bg-white/95 border-gray-200 backdrop-blur-xl shadow-lg"
      }`}>
        {[
          {id: 'dashboard', icon: LayoutDashboard, label: 'Home'},
          {id: 'shops', icon: Store, label: 'Shops'},
          {id: 'history', icon: History, label: 'History'},
          {id: 'notes', icon: BookOpen, label: 'Notes'},
          {id: 'settings', icon: Settings, label: 'More'}
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`p-2 transition-all relative flex flex-col items-center ${
              activeTab === t.id
                ? 'text-[#d4af37]'
                : isDarkMode
                  ? 'opacity-40 hover:opacity-70 text-white/60'
                  : 'opacity-40 hover:opacity-70 text-gray-600'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${
              activeTab === t.id
                ? isDarkMode
                  ? 'bg-[#d4af37]/10'
                  : 'bg-[#d4af37]/20'
                : ''
            }`}>
              <t.icon size={20} />
            </div>
            <span className="text-[8px] font-black uppercase mt-1">{t.label}</span>
            {activeTab === t.id && (
              <div className="absolute -bottom-1 w-6 h-0.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full"></div>
            )}
          </button>
        ))}
      </nav>

      {/* --- COMPACT CALCULATOR MODAL --- */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-3 backdrop-blur-3xl">
          <div className={`w-full max-w-xs p-4 rounded-2xl border relative shadow-2xl ${
            isDarkMode 
              ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30 text-white"
              : "bg-gradient-to-br from-white to-gray-50 border-[#d4af37]/50 text-gray-900"
          }`}>
            <button
              onClick={() => setShowCalculator(false)}
              className="absolute top-2 right-2 text-white/20 hover:text-white/40 transition-all p-1"
            >
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <Calculator size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">CALCULATOR</h3>
              <p className="text-[10px] opacity-50">Calculate totals</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">Subtotal (Rs.)</label>
                <input
                  type="number"
                  value={totalCalculation.subtotal}
                  onChange={(e) => setTotalCalculation({...totalCalculation, subtotal: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                  className={`w-full p-3 rounded-lg border text-white font-bold text-center outline-none focus:border-[#d4af37] transition-all text-sm ${
                    isDarkMode 
                      ? "bg-black/40 border-white/5" 
                      : "bg-gray-100 border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">Discount</label>
                  <input
                    type="number"
                    value={totalCalculation.discount}
                    onChange={(e) => setTotalCalculation({...totalCalculation, discount: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className={`w-full p-2 rounded-lg border text-white font-bold text-center outline-none focus:border-[#d4af37] transition-all text-sm ${
                      isDarkMode 
                        ? "bg-black/40 border-white/5" 
                        : "bg-gray-100 border-gray-300 text-gray-900"
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">Tax (Rs.)</label>
                  <input
                    type="number"
                    value={totalCalculation.tax}
                    onChange={(e) => setTotalCalculation({...totalCalculation, tax: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                    className={`w-full p-2 rounded-lg border text-white font-bold text-center outline-none focus:border-[#d4af37] transition-all text-sm ${
                      isDarkMode 
                        ? "bg-black/40 border-white/5" 
                        : "bg-gray-100 border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
              </div>

              <div className={`p-3 rounded-lg border ${
                isDarkMode
                  ? "bg-gradient-to-br from-black/60 to-black/40 border-[#d4af37]/30"
                  : "bg-gradient-to-br from-gray-100 to-gray-50 border-[#d4af37]/30"
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-black uppercase opacity-60">Total</p>
                </div>
                <p className="text-lg font-black text-[#d4af37] text-center">
                  Rs.{(totalCalculation.subtotal - totalCalculation.discount + totalCalculation.tax).toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={calculateTotal}
                  className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all"
                >
                  CALCULATE
                </button>

                <button
                  onClick={() => {
                    setTotalCalculation({ subtotal: 0, discount: 0, tax: 0, grandTotal: 0 });
                  }}
                  className={`w-full py-2 font-black rounded-lg uppercase text-[10px] tracking-widest border transition-all ${
                    isDarkMode
                      ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white/60 border-white/5 hover:border-white/10"
                      : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 border-gray-300 hover:border-gray-400"
                  }`}
                >
                  RESET
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- COMPACT EXPENSE MODAL --- */}
      {showModal === 'expense' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-3 backdrop-blur-3xl">
          <div className={`w-full max-w-xs p-4 rounded-2xl border relative shadow-2xl ${
            isDarkMode
              ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30 text-white"
              : "bg-gradient-to-br from-white to-gray-50 border-[#d4af37]/50 text-gray-900"
          }`}>
            <button onClick={() => setShowModal(null)} className="absolute top-2 right-2 text-white/20 hover:text-white/40 p-1">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <CreditCard size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">ADD EXPENSE</h3>
              <p className="text-[10px] opacity-50">Record your expenses</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase opacity-40 mb-2">Expense Type</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    {type: 'fuel', icon: Fuel, label: 'Fuel', color: 'text-red-400'},
                    {type: 'food', icon: Coffee, label: 'Food', color: 'text-amber-400'},
                    {type: 'transport', icon: Navigation, label: 'Travel', color: 'text-blue-400'},
                    {type: 'other', icon: AlertCircle, label: 'Other', color: 'text-gray-400'}
                  ].map(item => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setExpenseType(item.type)}
                      className={`p-2 rounded-lg border flex flex-col items-center gap-0.5 transition-all ${expenseType === item.type ? 'border-[#d4af37]' : 'border-white/5 hover:border-white/20'} ${
                        isDarkMode ? 'bg-black/40' : 'bg-gray-100'
                      }`}
                    >
                      <item.icon size={16} className={expenseType === item.type ? 'text-[#d4af37]' : item.color} />
                      <span className="text-[9px] font-black uppercase">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase opacity-40 mb-1">Amount (Rs.)</p>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className={`w-full p-3 rounded-lg border text-white font-bold text-center outline-none focus:border-[#d4af37] transition-all text-base ${
                    isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase opacity-40 mb-1">Note (Optional)</p>
                <textarea
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="Add expense details..."
                  className={`w-full p-2 rounded-lg border text-white text-xs outline-none resize-none h-16 focus:border-[#d4af37] transition-all ${
                    isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <button
                onClick={saveExpense}
                disabled={isSavingExpense}
                className={`w-full py-3 rounded-lg uppercase text-xs tracking-widest font-black transition-all ${isSavingExpense ? 'bg-gray-700 text-gray-400' : 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black hover:opacity-90'}`}
              >
                {isSavingExpense ? 'SAVING...' : 'SAVE EXPENSE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- COMPACT NOTE MODAL --- */}
      {showModal === 'note' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-3 backdrop-blur-3xl">
          <div className={`w-full max-w-xs p-4 rounded-2xl border relative shadow-2xl ${
            isDarkMode
              ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30 text-white"
              : "bg-gradient-to-br from-white to-gray-50 border-[#d4af37]/50 text-gray-900"
          }`}>
            <button onClick={() => setShowModal(null)} className="absolute top-2 right-2 text-white/20 hover:text-white/40 p-1">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <FileText size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">ADD NOTE</h3>
              <p className="text-[10px] opacity-50">Record important information</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <textarea
                  value={repNote}
                  onChange={(e) => setRepNote(e.target.value)}
                  placeholder="Type your note here..."
                  className={`w-full p-3 rounded-lg border text-white text-xs outline-none resize-none h-24 focus:border-[#d4af37] transition-all ${
                    isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <button
                onClick={saveNote}
                disabled={isSavingNote}
                className={`w-full py-3 rounded-lg uppercase text-xs tracking-widest font-black transition-all ${isSavingNote ? 'bg-gray-700 text-gray-400' : 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black hover:opacity-90'}`}
              >
                {isSavingNote ? 'SAVING...' : 'SAVE NOTE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- INVOICE MODAL --- */}
      {showModal === 'invoice' && selectedShop && (
        <div className="fixed inset-0 bg-black z-[100] overflow-y-auto">
          <div className="min-h-screen p-3 max-w-lg mx-auto pb-32">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-black/95 py-3 border-b border-white/10 backdrop-blur-xl z-10">
              <div>
                <h2 className="text-xl font-black uppercase text-white">{selectedShop.name}</h2>
                <p className="text-xs text-[#d4af37] font-black uppercase mt-0.5">Create New Bill</p>
              </div>
              <button
                onClick={() => { setShowModal(null); setCart({}); }}
                className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
              >
                <X size={20}/>
              </button>
            </div>

            {/* Brand List */}
            <div className="space-y-2">
              {data.brands.map(b => (
                <div
                  key={b.id}
                  className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] p-3 rounded-xl border border-white/5 flex items-center justify-between hover:border-[#d4af37]/30 transition-all"
                >
                  <div className="flex-1">
                    <h4 className="text-xs font-black uppercase text-white">{b.name} ({b.size})</h4>
                    <p className="text-xs text-[#d4af37] font-bold mt-0.5">Rs.{b.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1)})}
                      className="w-8 h-8 bg-white/5 rounded-lg text-white font-black hover:bg-white/10 transition-all text-sm"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={cart[b.id] || ''}
                      onChange={(e) => setCart({...cart, [b.id]: e.target.value})}
                      className="w-12 bg-transparent text-center font-black text-[#d4af37] text-base outline-none"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setCart({...cart, [b.id]: (Number(cart[b.id])||0)+1})}
                      className="w-8 h-8 bg-white/5 rounded-lg text-white font-black hover:bg-white/10 transition-all text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
              {data.brands.length === 0 && (
                <div className="text-center py-6">
                  <Package size={30} className="mx-auto opacity-20 mb-2" />
                  <p className="text-xs opacity-30 italic">No brands added yet. Add brands in Settings.</p>
                </div>
              )}
            </div>

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 inset-x-0 p-3 bg-black/95 border-t border-white/10 backdrop-blur-2xl z-20">
              <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase opacity-40">Total Items</span>
                    <p className="text-sm font-black text-white">
                      {Object.values(cart).filter(q => q > 0).length}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase opacity-40">Total Amount</span>
                    <p className="text-xl font-black text-[#d4af37]">
                      Rs.{calculateCartTotal().toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCreateOrder}
                  className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-xl uppercase text-xs tracking-widest hover:opacity-90 transition-all"
                >
                  CONFIRM ORDER
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MANUAL ORDER MODAL --- */}
      {showModal === 'manual' && (
        <div className="fixed inset-0 bg-black z-[100] overflow-y-auto">
          <div className="min-h-screen p-3 max-w-lg mx-auto pb-40">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-black/95 py-3 border-b border-white/10 backdrop-blur-xl z-10">
              <div>
                <h2 className="text-xl font-black uppercase text-white">Manual Order</h2>
                <p className="text-xs text-[#d4af37] font-black uppercase">Add Custom Items</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(null);
                  setManualItems([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
                }}
                className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
              >
                <X size={20}/>
            </button>
            </div>

            {/* Shop Selection */}
            <div className="mb-4">
              <label className="text-xs font-black uppercase opacity-60 mb-2 block">Select Shop</label>
              <select
                className="w-full bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] p-3 rounded-xl border border-white/5 text-white font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all"
                onChange={(e) => {
                  const shopId = e.target.value;
                  const shop = data.shops.find(s => s.id === shopId);
                  setSelectedShop(shop);
                }}
                defaultValue=""
              >
                <option value="">-- SELECT SHOP --</option>
                {data.shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name} - {s.area}</option>
                ))}
              </select>
            </div>

            {/* Manual Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase opacity-60">Custom Items</h3>
                <button
                  type="button"
                  onClick={addManualItem}
                  className="text-[#d4af37] text-xs font-black uppercase flex items-center gap-1.5 hover:opacity-80 transition-all"
                >
                  <Plus size={16}/> ADD ITEM
                </button>
              </div>

              {manualItems.map((item, index) => (
                <div key={index} className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase opacity-60">Item #{index + 1}</span>
                    {manualItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeManualItem(index)}
                        className="p-1.5 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                      >
                        <Trash2 size={14}/>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-40 mb-1">Item Name</p>
                      <input
                        value={item.name}
                        onChange={(e) => updateManualItem(index, 'name', e.target.value)}
                        placeholder="PRODUCT NAME"
                        className="w-full bg-black/40 p-2 rounded border border-white/5 text-white font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all"
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase opacity-40 mb-1">Quantity</p>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateManualItem(index, 'qty', e.target.value)}
                        className="w-full bg-black/40 p-2 rounded border border-white/5 text-white font-bold text-center outline-none text-xs focus:border-[#d4af37] transition-all"
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase opacity-40 mb-1">Unit Price (Rs.)</p>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateManualItem(index, 'price', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/40 p-2 rounded border border-white/5 text-white font-bold text-center outline-none text-xs focus:border-[#d4af37] transition-all"
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase opacity-40 mb-1">Subtotal (Rs.)</p>
                      <div className="w-full bg-black/40 p-2 rounded border border-white/5 text-center">
                        <span className="text-[#d4af37] font-black text-sm">Rs.{item.subtotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Fixed Bottom Bar */}
            <div className="fixed bottom-0 inset-x-0 p-3 bg-black/95 border-t border-white/10 backdrop-blur-2xl z-20">
              <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-40">Selected Shop</p>
                    <p className="text-sm font-black text-white">
                      {selectedShop?.name || "Not Selected"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase opacity-40">Order Total</p>
                    <p className="text-lg font-black text-[#d4af37]">
                      Rs.{manualItems.reduce((sum, item) => sum + (item.subtotal || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={saveManualOrder}
                  disabled={!selectedShop}
                  className={`w-full py-3 font-black rounded-xl uppercase tracking-widest text-xs transition-all ${selectedShop ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black hover:opacity-90' : 'bg-gray-700 text-gray-400'}`}
                >
                  {selectedShop ? 'SAVE MANUAL ORDER' : 'SELECT SHOP FIRST'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PREVIEW MODAL --- */}
      {showModal === 'preview' && lastOrder && (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-3 backdrop-blur-3xl">
          <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] w-full max-w-sm p-4 rounded-2xl border border-[#d4af37]/30 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-600/20 text-green-500 rounded-full flex items-center justify-center mb-3 border border-green-500/30">
                <CheckCircle2 size={24}/>
              </div>
              <h3 className="text-lg font-black text-white uppercase">Bill Confirmed!</h3>
              <p className="text-xs text-white/60 uppercase font-bold mt-1">{lastOrder.shopName}</p>
            </div>

            {/* Order Summary */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-xl p-3 mb-4 border border-white/5">
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                {lastOrder.items && lastOrder.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs uppercase font-bold py-1 border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-white/80">{it.name}</span>
                      <span className="text-white text-[10px] ml-1">x{it.qty} @ Rs.{it.price}</span>
                    </div>
                    <span className="text-white font-black">Rs.{it.subtotal.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-white">Total</span>
                <span className="text-lg font-black text-[#d4af37]">Rs.{lastOrder.total.toLocaleString()}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => shareBillWithLocation(lastOrder)}
                className="w-full py-2.5 bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-black rounded-lg uppercase text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              >
                <Navigation size={14} /> Share with Location
              </button>
              <button
                type="button"
                onClick={() => shareToWhatsApp(lastOrder)}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black rounded-lg uppercase text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              >
                <Share2 size={14} /> Share Bill Only
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(null);
                  setLastOrder(null);
                }}
                className="w-full py-2.5 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white/60 font-black rounded-lg uppercase text-xs border border-white/5 hover:border-white/10 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- REGISTER MODALS (Shop, Brand, Route) --- */}
      {['route', 'shop', 'brand'].includes(showModal) && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-3 backdrop-blur-3xl">
          <div className={`w-full max-w-xs p-4 rounded-2xl border relative shadow-2xl ${
            isDarkMode
              ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30 text-white"
              : "bg-gradient-to-br from-white to-gray-50 border-[#d4af37]/50 text-gray-900"
          }`}>
            <button onClick={() => setShowModal(null)} className="absolute top-2 right-2 text-white/20 hover:text-white/40 p-1">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              {showModal === 'route' && <MapPin size={28} className="text-[#d4af37] mx-auto mb-2" />}
              {showModal === 'shop' && <Store size={28} className="text-[#d4af37] mx-auto mb-2" />}
              {showModal === 'brand' && <Package size={28} className="text-[#d4af37] mx-auto mb-2" />}

              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">
                New {showModal.charAt(0).toUpperCase() + showModal.slice(1)}
              </h3>
              <p className="text-[10px] opacity-50">
                {showModal === 'route' && 'Add new sales route'}
                {showModal === 'shop' && 'Register new shop'}
                {showModal === 'brand' && 'Add new product brand'}
              </p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = e.target;

              if (!user) {
                showToast("Please login first!", "error");
                return;
              }

              const payload = { userId: user.uid, timestamp: Date.now() };

              try {
                if(showModal==='route') {
                  await addDoc(collection(db, 'routes'), {
                    ...payload,
                    name: f.name.value.toUpperCase()
                  });
                  showToast("✅ Route added successfully!", "success");
                }

                if(showModal==='shop') {
                  await addDoc(collection(db, 'shops'), {
                    ...payload,
                    name: f.name.value.toUpperCase(),
                    area: f.area.value
                  });
                  showToast("✅ Shop registered successfully!", "success");
                }

                if(showModal==='brand') {
                  await addDoc(collection(db, 'brands'), {
                    ...payload,
                    name: f.name.value.toUpperCase(),
                    size: f.size.value.toUpperCase(),
                    price: parseFloat(f.price.value)
                  });
                  showToast("✅ Brand added successfully!", "success");
                }

                setShowModal(null);
              } catch (err) {
                showToast("Error: " + err.message, "error");
              }
            }} className="space-y-3">

              <input
                name="name"
                placeholder={
                  showModal === 'brand' ? "BRAND NAME" :
                  showModal === 'shop' ? "SHOP NAME" :
                  "ROUTE NAME"
                }
                className={`w-full p-3 rounded-lg border text-white font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
                required
              />

              {showModal==='shop' && (
                <div className="relative">
                  <select
                    name="area"
                    className={`w-full p-3 rounded-lg border text-white font-bold uppercase outline-none appearance-none text-xs focus:border-[#d4af37] transition-all ${
                      isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-300 text-gray-900'
                    }`}
                    required
                  >
                    <option value="">SELECT ROUTE AREA</option>
                    {data.routes.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 opacity-30" size={16}/>
                </div>
              )}

              {showModal==='brand' && (
                <>
                  <input
                    name="size"
                    placeholder="SIZE (e.g., 500ML, 1KG)"
                    className={`w-full p-3 rounded-lg border text-white font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all ${
                      isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="UNIT PRICE (Rs.)"
                    className={`w-full p-3 rounded-lg border text-white font-bold outline-none text-xs focus:border-[#d4af37] transition-all ${
                      isDarkMode ? 'bg-black/40 border-white/5' : 'bg-gray-100 border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </>
              )}

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all">
                SAVE {showModal.toUpperCase()}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Styles - FIXED FONT ISSUES */}
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        .animate-progress {
          animation: progress 2.5s ease-in-out;
        }

        /* Font Family Fix */
        * {
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif !important;
          font-weight: 500;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          font-size: 14px;
        }

        input, button, select, textarea {
          font-family: inherit !important;
          font-size: 14px;
          font-weight: 600;
        }

        .font-black {
          font-weight: 700 !important;
        }

        /* Mobile Optimizations */
        @media (max-width: 640px) {
          body {
            font-size: 13px;
          }
          
          input, button, select, textarea {
            font-size: 13px;
          }
          
          .text-xs {
            font-size: 0.7rem !important;
          }
          
          .text-sm {
            font-size: 0.75rem !important;
          }
          
          h1, h2, h3, h4 {
            font-size: 0.9rem !important;
          }
        }

        @media (max-width: 400px) {
          body {
            font-size: 12px;
          }
          
          input, button, select, textarea {
            font-size: 12px;
          }
          
          main {
            padding: 0.5rem !important;
          }
          
          .p-3 {
            padding: 0.6rem !important;
          }
          
          .p-4 {
            padding: 0.75rem !important;
          }
          
          .p-5 {
            padding: 1rem !important;
          }
          
          .rounded-2xl {
            border-radius: 1rem !important;
          }
        }

        @media (max-width: 320px) {
          body {
            font-size: 11px;
          }
          
          .text-xs {
            font-size: 0.65rem !important;
          }
          
          .p-2 {
            padding: 0.4rem !important;
          }
          
          .gap-2 {
            gap: 0.5rem !important;
          }
        }

        /* Better button sizing for mobile */
        button {
          min-height: 44px;
          min-width: 44px;
        }

        /* Improve input readability */
        input, select, textarea {
          font-size: 16px !important; /* Prevents iOS zoom on focus */
        }

        /* Better modal positioning for small screens */
        @media (max-height: 600px) {
          .fixed.inset-0 {
            align-items: flex-start;
            padding-top: 1rem;
            overflow-y: auto;
          }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 3px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.5);
          border-radius: 10px;
        }

        /* Touch-friendly buttons */
        button, input[type="button"], input[type="submit"] {
          min-height: 40px;
          min-width: 40px;
        }

        /* Better touch feedback */
        .transition-all {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}
