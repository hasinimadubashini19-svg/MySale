import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail 
} from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, deleteDoc, query, orderBy, where, enableIndexedDbPersistence, setDoc, updateDoc, disableNetwork, enableNetwork } from 'firebase/firestore';
import {
  LayoutDashboard, Store, Plus, X, Trash2, Crown, Settings, LogOut,
  MapPin, Package, History, Calendar, Sun, Moon, Save, Star, Search,
  CheckCircle2, ChevronDown, Share2, TrendingUp, Edit2, Calculator,
  ShoppingBag, DollarSign, Fuel, FileText, Navigation, AlertCircle,
  CreditCard, Coffee, Target, Percent, BarChart3, Hash, Package2,
  BookOpen, Filter, Eye, Clock, Download, Mail, Lock, User, Printer,
  Wifi, WifiOff, Award, Zap, Briefcase, PieChart, Gift, Activity
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

// Enable offline persistence
try {
  enableIndexedDbPersistence(db).catch((err) => {
    console.log("Persistence:", err.code);
  });
} catch (err) {}

export default function App() {
  // ========== STATE MANAGEMENT ==========
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSplash, setIsSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  // Data State
  const [data, setData] = useState({
    routes: [], shops: [], orders: [], brands: [], 
    settings: { name: '', company: '' }, expenses: [], notes: [],
    targets: [], shopProfiles: []
  });
  
  // UI States
  const [cart, setCart] = useState({});
  const [selectedShop, setSelectedShop] = useState(null);
  const [selectedShopProfile, setSelectedShopProfile] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteSearchDate, setNoteSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastOrder, setLastOrder] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [shopSearch, setShopSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');
  const [manualItems, setManualItems] = useState([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
  const [editingBrand, setEditingBrand] = useState(null);
  
  // Calculator State - NEW: Percentage Discount
  const [calc, setCalc] = useState({ 
    subtotal: 0, 
    discount: 0, 
    discountPercent: 0, 
    tax: 0, 
    grandTotal: 0,
    usePercentage: false 
  });
  
  // Expense & Note States
  const [expenseType, setExpenseType] = useState('fuel');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [repNote, setRepNote] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  // Target States - NEW
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [targetAmount, setTargetAmount] = useState('');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedTarget, setSelectedTarget] = useState(null);
  
  // Shop Profile States - NEW
  const [shopProfileData, setShopProfileData] = useState({
    ownerName: '', phone: '', email: '', address: '', gst: '', notes: ''
  });
  
  // UI States
  const [showCalculator, setShowCalculator] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [showAllMonthlyBrands, setShowAllMonthlyBrands] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  
  // Delete Confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ show: false, id: null, type: '', name: '' });
  const [brandError, setBrandError] = useState('');
  const [loginError, setLoginError] = useState('');

  // ========== NETWORK LISTENER ==========
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      enableNetwork(db).then(() => {
        showToast("📶 Back online - Syncing data...", "success");
        syncPendingOrders();
      });
    };
    const handleOffline = () => {
      setIsOffline(true);
      disableNetwork(db);
      showToast("📴 Offline mode - Changes saved locally", "info");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ========== TOAST ==========
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ========== SPLASH & AUTH ==========
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

  // ========== DATA FETCHING ==========
  useEffect(() => {
    if (!user) return;

    const unsubscribeFunctions = [];

    try {
      const collections = ['routes', 'shops', 'orders', 'brands', 'expenses', 'notes', 'locations', 'targets', 'shopProfiles'];

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

            if (collectionName === 'brands') {
              items.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
            }

            setData(prev => ({
              ...prev,
              [collectionName]: items
            }));
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

  // ========== SYNC PENDING ORDERS ==========
  const syncPendingOrders = async () => {
    const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    for (const order of pending) {
      try {
        await addDoc(collection(db, 'orders'), order);
        showToast("✅ Synced order for " + order.shopName, "success");
      } catch (err) {
        console.error("Sync failed:", err);
      }
    }
    localStorage.removeItem('pendingOrders');
    setPendingOrders([]);
  };

  // ========== GET LOCATION ==========
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

          const locationData = {
            ...location,
            userId: user.uid,
            date: new Date().toISOString().split('T')[0],
            type: 'user_location',
            name: `${data.settings.name || 'Rep'} Location`
          };

          if (isOffline) {
            const cached = JSON.parse(localStorage.getItem(`locations_${user.uid}`) || '[]');
            cached.unshift({ ...locationData, id: 'temp_' + Date.now() });
            localStorage.setItem(`locations_${user.uid}`, JSON.stringify(cached));
            showToast("📍 Location saved offline", "info");
          } else {
            addDoc(collection(db, 'locations'), locationData)
              .then(() => showToast("📍 Location saved successfully!", "success"))
              .catch(err => showToast("Error saving location", "error"));
          }
        },
        (error) => {
          showToast("Location access denied or unavailable", "error");
        }
      );
    } else {
      showToast("Geolocation is not supported by this browser.", "error");
    }
  };

  // ========== SAVE PROFILE ==========
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
        userId: user.uid,
        updatedAt: Date.now()
      });
      showToast("✅ Profile Saved Successfully!", "success");
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // ========== SAVE EXPENSE ==========
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
      const expenseData = {
        type: expenseType,
        amount: parseFloat(expenseAmount),
        note: expenseNote,
        userId: user.uid,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      };

      if (isOffline) {
        const cached = JSON.parse(localStorage.getItem(`expenses_${user.uid}`) || '[]');
        cached.unshift({ ...expenseData, id: 'temp_' + Date.now() });
        localStorage.setItem(`expenses_${user.uid}`, JSON.stringify(cached));
        showToast("✅ Expense saved offline", "info");
      } else {
        await addDoc(collection(db, 'expenses'), expenseData);
        showToast("✅ Expense saved successfully!", "success");
      }

      setExpenseAmount('');
      setExpenseNote('');
      setShowModal(null);
    } catch (err) {
      showToast("Error saving expense: " + err.message, "error");
    } finally {
      setIsSavingExpense(false);
    }
  };

  // ========== DELETE CONFIRM ==========
  const confirmDelete = (id, type, name) => {
    setShowDeleteConfirm({ show: true, id, type, name });
  };

  const handleDelete = async () => {
    const { id, type } = showDeleteConfirm;
    if (!id || !type) return;

    try {
      if (type === 'route') await deleteDoc(doc(db, 'routes', id));
      if (type === 'shop') await deleteDoc(doc(db, 'shops', id));
      if (type === 'brand') await deleteDoc(doc(db, 'brands', id));
      if (type === 'order') await deleteDoc(doc(db, 'orders', id));
      if (type === 'expense') await deleteDoc(doc(db, 'expenses', id));
      if (type === 'note') await deleteDoc(doc(db, 'notes', id));
      if (type === 'target') await deleteDoc(doc(db, 'targets', id));
      if (type === 'shopProfile') await deleteDoc(doc(db, 'shopProfiles', id));
      
      showToast(`✅ ${type} deleted successfully!`, 'success');
      setShowDeleteConfirm({ show: false, id: null, type: '', name: '' });
    } catch (err) {
      showToast(`Error deleting ${type}: ` + err.message, 'error');
    }
  };

  // ========== SAVE NOTE ==========
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
      const noteData = {
        text: repNote,
        userId: user.uid,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      };

      if (isOffline) {
        const cached = JSON.parse(localStorage.getItem(`notes_${user.uid}`) || '[]');
        cached.unshift({ ...noteData, id: 'temp_' + Date.now() });
        localStorage.setItem(`notes_${user.uid}`, JSON.stringify(cached));
        showToast("✅ Note saved offline", "info");
      } else {
        await addDoc(collection(db, 'notes'), noteData);
        showToast("✅ Note saved successfully!", "success");
      }

      setRepNote('');
      setShowModal(null);
    } catch (err) {
      showToast("Error saving note: " + err.message, "error");
    } finally {
      setIsSavingNote(false);
    }
  };

  // ========== SAVE MANUAL ORDER ==========
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
      shopId: selectedShop.id,
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
      if (isOffline) {
        const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
        pending.push(orderData);
        localStorage.setItem('pendingOrders', JSON.stringify(pending));
        showToast("✅ Order saved offline - Will sync when online", "info");
      } else {
        await addDoc(collection(db, 'orders'), orderData);
      }

      setLastOrder(orderData);
      setShowModal('preview');
      setManualItems([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
    } catch (err) {
      showToast("Error saving order: " + err.message, "error");
    }
  };

  // ========== CALCULATOR WITH PERCENTAGE DISCOUNT - UPDATED ==========
  const calculateTotal = () => {
    const subtotal = parseFloat(calc.subtotal) || 0;
    let discount = parseFloat(calc.discount) || 0;
    const discountPercent = parseFloat(calc.discountPercent) || 0;
    const tax = parseFloat(calc.tax) || 0;
    
    // If percentage mode is on, calculate discount from percentage
    if (calc.usePercentage && discountPercent > 0) {
      discount = (subtotal * discountPercent) / 100;
    }
    
    const grandTotal = subtotal - discount + tax;

    setCalc(prev => ({
      ...prev,
      discount: discount,
      grandTotal: grandTotal
    }));

    showToast(`💰 Grand Total: Rs.${grandTotal.toLocaleString()}`, "success");
  };

  // Reset calculator when closed
  const resetCalculator = () => {
    setCalc({ 
      subtotal: 0, 
      discount: 0, 
      discountPercent: 0, 
      tax: 0, 
      grandTotal: 0,
      usePercentage: false 
    });
  };

  // ========== FORGOT PASSWORD ==========
  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      showToast("Please enter your email address", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetSuccess(true);
      showToast("📧 Password reset link sent! Check your email.", "success");
    } catch (err) {
      let errorMessage = "Error sending reset email";
      if (err.code === 'auth/user-not-found') {
        errorMessage = "No account found with this email";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address";
      }
      showToast(errorMessage, "error");
    } finally {
      setIsSendingReset(false);
    }
  };

  // ========== STATISTICS - UPDATED WITH TARGET ==========
  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

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

      const sortedByUnits = Object.entries(summary).sort((a, b) => b[1].units - a[1].units);
      const topBrandByUnits = sortedByUnits[0];

      const sortedByRevenue = Object.entries(summary).sort((a, b) => b[1].revenue - a[1].revenue);
      const topBrandByRevenue = sortedByRevenue[0];

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
    
    // Monthly total expenses
    const monthlyExpenses = data.expenses.filter(e => {
      try {
        return e.date && e.date.startsWith(currentYear + '-' + String(currentMonth + 1).padStart(2, '0'));
      } catch {
        return false;
      }
    }).reduce((sum, e) => sum + (e.amount || 0), 0);

    const todayNotes = data.notes.filter(n => n.date === todayStr);
    
    // Current month target
    const currentTarget = data.targets?.find(t => t.month === currentMonthStr) || { amount: 0 };
    const monthlySales = monthlyOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const targetProgress = currentTarget.amount > 0 ? (monthlySales / currentTarget.amount) * 100 : 0;

    return {
      daily: getStats(dailyOrders),
      monthly: getStats(monthlyOrders),
      expenses: totalExpenses,
      monthlyExpenses: monthlyExpenses,
      notes: todayNotes.length,
      todayExpenses: todayExpenses,
      monthlySales: monthlySales,
      monthlyTarget: currentTarget.amount || 0,
      targetProgress: targetProgress,
      targetRemaining: Math.max(0, (currentTarget.amount || 0) - monthlySales)
    };
  }, [data.orders, data.expenses, data.notes, data.targets]);

  // ========== SHOP STATISTICS - NEW ==========
  const getShopStats = (shopId) => {
    if (!shopId) return { totalSales: 0, orderCount: 0, lastOrder: null, items: {} };
    
    const shopOrders = data.orders.filter(o => o.shopId === shopId || o.shopName === shopId);
    const totalSales = shopOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const orderCount = shopOrders.length;
    const lastOrder = shopOrders.length > 0 ? shopOrders[0] : null;
    
    const items = {};
    shopOrders.forEach(o => {
      if (o.items) {
        o.items.forEach(i => {
          if (!items[i.name]) items[i.name] = 0;
          items[i.name] += i.qty || 0;
        });
      }
    });
    
    return { totalSales, orderCount, lastOrder, items };
  };

  // ========== FILTER SHOPS ==========
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

  // ========== FILTER NOTES ==========
  const filteredNotes = useMemo(() => {
    return data.notes.filter(note => {
      try {
        return note.date === noteSearchDate;
      } catch {
        return false;
      }
    });
  }, [data.notes, noteSearchDate]);

  // ========== MANUAL ITEMS HANDLERS ==========
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

  // ========== WHATSAPP SHARE ==========
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

  // ========== PRINT BILL ==========
  const printBill = (order) => {
    setPrintOrder(order);
    setShowPrintPreview(true);
  };

  const generateBillHTML = (order) => {
    const companyName = order.companyName || data.settings.company || "MONARCH";
    const shopName = order.shopName || "Unknown Shop";
    const date = order.timestamp ? new Date(order.timestamp).toLocaleString() : new Date().toLocaleString();
    const billNumber = order.id ? order.id.slice(-6) : Math.floor(Math.random() * 1000000);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - ${shopName}</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            margin: 0;
            padding: 10px;
            background: white;
            color: black;
          }
          .bill {
            max-width: 80mm;
            margin: 0 auto;
            padding: 10px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .company {
            font-size: 18px;
            font-weight: bold;
            color: #d4af37;
            margin: 0;
            text-transform: uppercase;
          }
          .shop {
            font-size: 16px;
            font-weight: bold;
            margin: 5px 0;
          }
          .details {
            font-size: 11px;
            margin: 3px 0;
          }
          .items {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          .items th {
            border-bottom: 1px solid #000;
            padding: 5px;
            font-size: 11px;
            text-align: left;
          }
          .items td {
            padding: 5px;
            font-size: 11px;
          }
          .total {
            border-top: 2px solid #000;
            margin-top: 10px;
            padding-top: 10px;
            text-align: right;
            font-size: 14px;
            font-weight: bold;
          }
          .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 9px;
            color: #666;
            border-top: 1px dashed #000;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="bill">
          <div class="header">
            <div class="company">${companyName}</div>
            <div class="shop">${shopName}</div>
            <div class="details">${date}</div>
            <div class="details">Bill #: ${billNumber}</div>
          </div>
    `;

    html += `
          <table class="items">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        html += `
              <tr>
                <td>${item.name || 'Item'}</td>
                <td>${item.qty || 0}</td>
                <td>${(item.price || 0).toLocaleString()}</td>
                <td>${(item.subtotal || 0).toLocaleString()}</td>
              </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
          
          <div class="total">
            TOTAL: Rs.${(order.total || 0).toLocaleString()}
          </div>
          
          <div class="footer">
            Thank you for your business!<br>
            Generated by Monarch Pro
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }
        </script>
      </body>
      </html>
    `;

    return html;
  };

  const handlePrint = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateBillHTML(order));
    printWindow.document.close();
  };

  // ========== AUTH HANDLER ==========
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoginError('');
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      if (isRegisterMode) {
        if (password.length < 6) {
          showToast("Password must be at least 6 characters", "error");
          return;
        }
        
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("🎉 Account created successfully!", "success");
        
        try {
          await setDoc(doc(db, "settings", auth.currentUser.uid), {
            name: email.split('@')[0].toUpperCase(),
            company: "MONARCH",
            userId: auth.currentUser.uid,
            createdAt: Date.now()
          });
        } catch (profileErr) {
          console.log("Profile setup skipped:", profileErr);
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("👑 Welcome back!", "success");
      }
    } catch (err) {
      let errorMessage = "";
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = "❌ Wrong Password or Email";
          break;
        case 'auth/wrong-password':
          errorMessage = "❌ Wrong Password or Email";
          break;
        case 'auth/too-many-requests':
          errorMessage = "❌ Too many failed attempts. Try again later";
          break;
        case 'auth/email-already-in-use':
          errorMessage = "❌ Email already registered. Try login instead";
          break;
        case 'auth/invalid-email':
          errorMessage = "❌ Invalid email address";
          break;
        case 'auth/weak-password':
          errorMessage = "❌ Password should be at least 6 characters";
          break;
        default:
          errorMessage = "❌ Login Failed";
      }
      
      setLoginError(errorMessage);
      showToast(errorMessage, "error");
    }
  };

  // ========== CART TOTAL ==========
  const calculateCartTotal = () => {
    return Object.entries(cart).reduce((acc, [id, q]) => {
      const brand = data.brands.find(b => b.id === id);
      const price = brand?.price || 0;
      const quantity = Number(q) || 0;
      return acc + (price * quantity);
    }, 0);
  };

  // ========== CREATE ORDER ==========
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
      shopId: selectedShop.id,
      companyName: data.settings.company || "MONARCH",
      items,
      total: items.reduce((s, i) => s + i.subtotal, 0),
      userId: user.uid,
      timestamp: Date.now(),
      dateString: new Date().toLocaleDateString(),
      location: currentLocation
    };

    try {
      if (isOffline) {
        const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
        pending.push(orderData);
        localStorage.setItem('pendingOrders', JSON.stringify(pending));
        showToast("✅ Order saved offline - Will sync when online", "info");
      } else {
        await addDoc(collection(db, 'orders'), orderData);
      }
      
      setCart({});
      setLastOrder(orderData);
      setShowModal('preview');
      showToast("Order saved successfully!", "success");
    } catch (err) {
      showToast("Error saving order: " + err.message, "error");
    }
  };

  // ========== SAVE BRAND EDIT ==========
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

  // ========== VALIDATE BRAND ==========
  const validateBrand = (name, size, price) => {
    if (!name.trim()) return 'Brand name required';
    if (!size.trim()) return 'Size required';
    if (!price || price <= 0) return 'Valid price required';
    
    const exists = data.brands.find(b => 
      b.name?.toUpperCase() === name.toUpperCase() && 
      b.size?.toUpperCase() === size.toUpperCase()
    );
    if (exists) return '❌ Brand already exists!';
    return '';
  };

  // ========== ADD BRAND ==========
  const addBrandWithSequence = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login first!", "error");
      return;
    }

    const form = e.target;
    const name = form.name.value.toUpperCase();
    const size = form.size.value.toUpperCase();
    const price = parseFloat(form.price.value);
    
    const error = validateBrand(name, size, price);
    if (error) {
      setBrandError(error);
      showToast(error, "error");
      return;
    }
    
    try {
      const currentCount = data.brands.length;
      const sequence = currentCount + 1;

      const brandData = {
        userId: user.uid,
        timestamp: Date.now(),
        name: name,
        size: size,
        price: price,
        sequence: sequence,
        displayNumber: sequence
      };

      if (isOffline) {
        const cached = JSON.parse(localStorage.getItem(`brands_${user.uid}`) || '[]');
        cached.unshift({ ...brandData, id: 'temp_' + Date.now() });
        cached.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
        localStorage.setItem(`brands_${user.uid}`, JSON.stringify(cached));
        showToast("✅ Brand added offline (Number: " + sequence + ")", "info");
      } else {
        await addDoc(collection(db, 'brands'), brandData);
        showToast(`✅ Brand added successfully! (#${sequence})`, "success");
      }

      setBrandError('');
      setShowModal(null);
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // ========== REORDER BRANDS ==========
  const reorderBrands = async (brandId, direction) => {
    if (!user || isOffline) {
      showToast("Cannot reorder in offline mode", "error");
      return;
    }

    try {
      const currentBrands = [...data.brands];
      const index = currentBrands.findIndex(b => b.id === brandId);
      if (index === -1) return;

      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= currentBrands.length) return;

      const brand1 = currentBrands[index];
      const brand2 = currentBrands[newIndex];
      
      await updateDoc(doc(db, 'brands', brand1.id), { sequence: brand2.sequence });
      await updateDoc(doc(db, 'brands', brand2.id), { sequence: brand1.sequence });

      showToast("✅ Brand reordered successfully!", "success");
    } catch (err) {
      showToast("Error reordering brands: " + err.message, "error");
    }
  };

  // ========== SAVE MONTHLY TARGET - NEW ==========
  const saveMonthlyTarget = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const targetData = {
        userId: user.uid,
        month: targetMonth,
        amount: parseFloat(targetAmount),
        timestamp: Date.now()
      };
      
      // Check if target already exists for this month
      const existingTarget = data.targets?.find(t => t.month === targetMonth);
      
      if (existingTarget) {
        await updateDoc(doc(db, 'targets', existingTarget.id), targetData);
        showToast("✅ Target updated!", "success");
      } else {
        await addDoc(collection(db, 'targets'), targetData);
        showToast("✅ Target set successfully!", "success");
      }
      
      setTargetAmount('');
      setShowModal(null);
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // ========== SAVE SHOP PROFILE - NEW ==========
  const saveShopProfile = async (e) => {
    e.preventDefault();
    if (!user || !selectedShop) {
      showToast("Select a shop first!", "error");
      return;
    }
    
    try {
      const form = e.target;
      const profileData = {
        userId: user.uid,
        shopId: selectedShop.id,
        shopName: selectedShop.name,
        ownerName: form.ownerName?.value?.toUpperCase() || '',
        phone: form.phone?.value || '',
        email: form.email?.value || '',
        address: form.address?.value || '',
        gst: form.gst?.value?.toUpperCase() || '',
        notes: form.notes?.value || '',
        timestamp: Date.now()
      };
      
      // Check if profile already exists for this shop
      const existingProfile = data.shopProfiles?.find(p => p.shopId === selectedShop.id);
      
      if (existingProfile) {
        await updateDoc(doc(db, 'shopProfiles', existingProfile.id), profileData);
        showToast("✅ Shop profile updated!", "success");
      } else {
        await addDoc(collection(db, 'shopProfiles'), profileData);
        showToast("✅ Shop profile saved!", "success");
      }
      
      setShowModal(null);
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // ========== GET SHOP PROFILE ==========
  const getShopProfile = (shopId) => {
    return data.shopProfiles?.find(p => p.shopId === shopId);
  };

  // ========== SPLASH SCREEN ==========
  if (isSplash || loading) return (
    <div className="h-screen bg-gradient-to-br from-black via-[#1a1a1a] to-[#2d2d2d] flex flex-col items-center justify-center">
      <Crown size={70} className="text-[#d4af37] animate-pulse" style={{ filter: 'drop-shadow(0 0 20px rgba(212,175,55,0.5))' }} />
      <h1 className="mt-6 text-[#d4af37] text-3xl font-black tracking-widest italic uppercase">Monarch Pro</h1>
      <p className="mt-2 text-white/50 text-sm uppercase tracking-widest">Sales & Target Manager</p>
      <div className="mt-6 w-56 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#d4af37] via-[#f5e7a3] to-[#b8860b] animate-progress"></div>
      </div>
    </div>
  );

  // ========== FORGOT PASSWORD SCREEN ==========
  if (!user && showForgotPassword) {
    return (
      <div className="h-screen bg-gradient-to-br from-black to-[#1a1a1a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-6 space-y-6 text-center bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-[#d4af37]/30 shadow-2xl">
          <div className="space-y-3">
            <div className="w-20 h-20 bg-gradient-to-br from-[#d4af37]/20 to-[#b8860b]/20 rounded-full flex items-center justify-center mx-auto border border-[#d4af37]/30">
              <Crown size={40} className="text-[#d4af37]" />
            </div>
            <h2 className="text-white font-black text-xl tracking-widest uppercase">
              Reset Password
            </h2>
            <p className="text-white/60 text-sm">
              Enter your email to receive a password reset link
            </p>
          </div>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-600/20 rounded-xl border border-green-500/30">
                <CheckCircle2 size={30} className="text-green-500 mx-auto mb-2" />
                <p className="text-green-500 text-sm font-bold">
                  Password reset link sent successfully!
                </p>
                <p className="text-white/50 text-xs mt-2">
                  Check your email inbox and spam folder
                </p>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSuccess(false);
                    setResetEmail('');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-xl uppercase text-sm tracking-widest hover:opacity-90 transition-all shadow-lg"
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="YOUR EMAIL ADDRESS"
                  className="w-full bg-black/50 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37] transition-all"
                />
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleForgotPassword}
                  disabled={isSendingReset}
                  className={`w-full py-4 font-black rounded-xl uppercase text-sm tracking-widest transition-all ${
                    isSendingReset
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black hover:opacity-90 shadow-lg'
                  }`}
                >
                  {isSendingReset ? 'SENDING...' : 'SEND RESET LINK'}
                </button>

                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmail('');
                  }}
                  className="w-full py-3 text-white/60 font-bold rounded-xl text-sm hover:text-white transition-all"
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== LOGIN SCREEN ==========
  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-black via-[#1a1a1a] to-[#2d2d2d] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-[#d4af37]/20 to-[#b8860b]/20 rounded-full flex items-center justify-center mx-auto border-2 border-[#d4af37]/30 shadow-2xl mb-4">
            <Crown size={50} className="text-[#d4af37]" />
          </div>
          <h2 className="text-white font-black text-2xl tracking-widest uppercase">
            {isRegisterMode ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="text-[#d4af37]/70 text-sm mt-2 font-bold">
            {isRegisterMode ? "Join Monarch Pro Today" : "Sign in to continue"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input
              name="email"
              type="email"
              placeholder="EMAIL ADDRESS"
              className="w-full bg-black/50 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37] transition-all placeholder:text-white/30"
              required
            />
          </div>
          <div>
            <input
              name="password"
              type="password"
              placeholder="PASSWORD"
              className="w-full bg-black/50 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37] transition-all placeholder:text-white/30"
              required
            />
          </div>
          
          {loginError && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
              <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-4 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-xl shadow-lg uppercase text-sm tracking-widest hover:opacity-90 transition-all transform hover:scale-[1.02]"
          >
            {isRegisterMode ? "Sign Up" : "Login"}
          </button>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setLoginError('');
              }}
              className="text-[#d4af37] text-sm font-bold uppercase tracking-widest opacity-80 hover:opacity-100 transition-all"
            >
              {isRegisterMode ? "← Sign In" : "Register"}
            </button>
            
            {!isRegisterMode && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-white/60 text-sm font-bold uppercase tracking-widest opacity-80 hover:opacity-100 hover:text-[#d4af37] transition-all"
              >
                Forgot Password?
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  // ========== MAIN APP ==========
  return (
    <div className={`min-h-screen pb-40 transition-all duration-500 ${
      isDarkMode 
        ? "bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] text-white" 
        : "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 text-gray-900"
    }`}>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-[90] px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-full border border-yellow-500/30 backdrop-blur-xl text-xs font-bold flex items-center gap-2">
          <WifiOff size={14} />
          OFFLINE MODE
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-6 py-3 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-500 border-green-500/30' :
          toast.type === 'error' ? 'bg-gradient-to-r from-red-500/20 to-rose-600/20 text-red-500 border-red-500/30' :
          'bg-gradient-to-r from-blue-500/20 to-cyan-600/20 text-blue-500 border-blue-500/30'
        }`}>
          {toast.type === 'success' && <CheckCircle2 size={20} />}
          {toast.type === 'error' && <AlertCircle size={20} />}
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center p-4 backdrop-blur-3xl">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] w-full max-w-sm p-5 rounded-2xl border border-red-500/30 shadow-2xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-500/30">
                <Trash2 size={30} className="text-red-500" />
              </div>
              <h3 className="text-white font-black text-lg uppercase tracking-widest">Confirm Delete</h3>
              <p className="text-white/60 text-sm mt-2">
                {showDeleteConfirm.type === 'brand' && `Delete "${showDeleteConfirm.name}"?`}
                {showDeleteConfirm.type === 'shop' && `Delete shop "${showDeleteConfirm.name}"?`}
                {showDeleteConfirm.type === 'route' && `Delete route "${showDeleteConfirm.name}"?`}
                {showDeleteConfirm.type === 'order' && 'Delete this bill?'}
                {showDeleteConfirm.type === 'expense' && 'Delete this expense?'}
                {showDeleteConfirm.type === 'note' && 'Delete this note?'}
                {showDeleteConfirm.type === 'target' && 'Delete this target?'}
                {showDeleteConfirm.type === 'shopProfile' && 'Delete shop profile?'}
              </p>
              <p className="text-red-500 text-xs font-bold mt-3">This action cannot be undone!</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:opacity-90 transition-all"
              >
                DELETE
              </button>
              <button
                onClick={() => setShowDeleteConfirm({ show: false, id: null, type: '', name: '' })}
                className="flex-1 py-3 bg-gradient-to-br from-[#333] to-[#444] text-white/80 font-black rounded-xl uppercase text-xs tracking-widest border border-white/10 hover:border-white/30 transition-all"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl border-b ${
        isDarkMode 
          ? "bg-black/90 border-[#d4af37]/20" 
          : "bg-white/95 border-[#d4af37]/30 shadow-sm"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-xl text-black shadow-lg ${
            !isDarkMode && 'shadow-[#d4af37]/30'
          }`}>
            <Crown size={20} />
          </div>
          <div>
            <h1 className="font-black text-lg tracking-tight leading-none uppercase text-[#d4af37]">
              {data.settings.company || "MONARCH"}
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${
              isDarkMode ? 'text-white/60' : 'text-gray-600'
            }`}>
              {data.settings.name || "Sales Representative"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isOffline ? (
            <div className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-xl border border-yellow-500/20">
              <WifiOff size={18} />
            </div>
          ) : (
            <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl border border-green-500/20">
              <Wifi size={18} />
            </div>
          )}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-xl border transition-all ${
              isDarkMode 
                ? "bg-white/5 text-[#d4af37] border-white/10 hover:bg-[#d4af37]/20" 
                : "bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-700 border-amber-200 hover:bg-amber-200"
            }`}
          >
            {isDarkMode ? <Sun size={18}/> : <Moon size={18}/>}
          </button>
          <button
            onClick={() => setShowModal('expense')}
            className={`p-2.5 rounded-xl border transition-all ${
              isDarkMode 
                ? "bg-white/5 text-[#d4af37] border-white/10 hover:bg-[#d4af37]/20" 
                : "bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-700 border-amber-200"
            }`}
          >
            <CreditCard size={18}/>
          </button>
          <button
            onClick={() => {
              setShowCalculator(true);
              resetCalculator();
            }}
            className={`p-2.5 rounded-xl border transition-all ${
              isDarkMode 
                ? "bg-white/5 text-[#d4af37] border-white/10 hover:bg-[#d4af37]/20" 
                : "bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-700 border-amber-200"
            }`}
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
      <main className="p-3 max-w-lg mx-auto space-y-4">

        {/* ========== DASHBOARD TAB ========== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">

            {/* Today's Revenue Card with Expenses Total */}
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

            {/* Target Progress Card - NEW */}
            {stats.monthlyTarget > 0 && (
              <div className={`p-5 rounded-2xl border shadow-xl ${
                isDarkMode
                  ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30"
                  : "bg-white border-[#d4af37]/30 shadow-lg"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award size={20} className="text-[#d4af37]" />
                    <h3 className="text-sm font-black text-[#d4af37] uppercase tracking-widest">Monthly Target</h3>
                  </div>
                  <span className="text-xs font-black">
                    Rs.{stats.monthlySales.toLocaleString()} / Rs.{stats.monthlyTarget.toLocaleString()}
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.targetProgress, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black">
                    {stats.targetProgress.toFixed(1)}% Complete
                  </span>
                  {stats.targetRemaining > 0 ? (
                    <span className="text-xs font-black text-red-500">
                      Rs.{stats.targetRemaining.toLocaleString()} to go
                    </span>
                  ) : (
                    <span className="text-xs font-black text-green-500 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Target Achieved!
                    </span>
                  )}
                </div>
                
                <button
                  onClick={() => setShowModal('target')}
                  className="mt-3 w-full py-2 bg-white/10 rounded-lg text-xs font-black uppercase hover:bg-white/20 transition-all"
                >
                  Set / Update Target
                </button>
              </div>
            )}

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
                onClick={() => {
                  setShowCalculator(true);
                  resetCalculator();
                }}
                className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 hover:scale-[1.02] transition-all ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 text-white"
                    : "bg-white border-gray-200 text-gray-800 shadow-sm"
                }`}
              >
                <Calculator size={18} className="text-[#d4af37]" />
                <span className="text-[9px]font-black uppercase">Calc</span>
              </button>
            </div>

            {/* Monthly Performance */}
            <div className={`p-5 rounded-2xl border shadow-xl ${
              isDarkMode
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                : "bg-white border-gray-200 shadow-lg"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#d4af37]" />
                  <h3 className="text-sm font-black text-[#d4af37] uppercase tracking-widest">Monthly Performance</h3>
                </div>
                <span className="text-xs font-black">
                  Rs.{stats.monthlySales.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-3 rounded-xl border ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5"
                    : "bg-gray-50 border-gray-100"
                }`}>
                  <p className="text-[9px] font-black uppercase mb-1 opacity-60">Total Units</p>
                  <p className="text-lg font-black text-[#d4af37]">{stats.monthly.totalUnits || 0}</p>
                </div>
                <div className={`p-3 rounded-xl border ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5"
                    : "bg-gray-50 border-gray-100"
                }`}>
                  <p className="text-[9px] font-black uppercase mb-1 opacity-60">Expenses</p>
                  <p className="text-lg font-black text-red-500">Rs.{stats.monthlyExpenses.toLocaleString()}</p>
                </div>
              </div>

              {/* Top Brand */}
              <div className={`p-3 rounded-xl border ${
                isDarkMode
                  ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5"
                  : "bg-gray-50 border-gray-100"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-[#d4af37]" />
                    <p className="text-xs font-black uppercase">Top Brand: {stats.monthly.topBrand}</p>
                  </div>
                  <p className="text-sm font-black text-[#d4af37]">Rs.{stats.monthly.topBrandRevenue?.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Today's Sales Summary */}
            <div className={`p-5 rounded-2xl border shadow-xl ${
              isDarkMode
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                : "bg-white border-gray-200 shadow-lg"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#d4af37]" />
                  <h3 className="text-sm font-black text-[#d4af37] uppercase tracking-widest">Today's Sales</h3>
                </div>
                <span className="text-xs font-black">Rs.{stats.daily.totalSales.toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                {stats.daily.summary.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <span className="font-bold">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="opacity-60">{item.units} units</span>
                      <span className="text-[#d4af37] font-black">Rs.{item.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========== SHOPS TAB - WITH PROFILE & STATS ========== */}
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
                  style={{ color: isDarkMode ? 'white' : 'black' }}
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
              {filteredShops.map(s => {
                const shopStats = getShopStats(s.id);
                const shopProfile = getShopProfile(s.id);
                
                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isDarkMode
                        ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/5 hover:border-[#d4af37]/30"
                        : "bg-white border-gray-200 shadow-sm hover:border-[#d4af37] hover:shadow-md"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-[#d4af37]/10 to-[#b8860b]/5 rounded-xl text-[#d4af37] border border-[#d4af37]/20">
                          <Store size={18}/>
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase leading-tight" style={{ color: isDarkMode ? 'white' : 'black' }}>
                            {s.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <MapPin size={11} className="opacity-40" />
                            <p className="text-[10px] font-bold uppercase tracking-tighter" style={{ opacity: 0.6 }}>
                              {s.area}
                            </p>
                          </div>
                          {/* Shop Stats */}
                          <div className="flex items-center gap-3 mt-2">
                            <div className="text-[10px]">
                              <span className="opacity-60">Total:</span>
                              <span className="ml-1 font-black text-[#d4af37]">Rs.{shopStats.totalSales.toLocaleString()}</span>
                            </div>
                            <div className="text-[10px]">
                              <span className="opacity-60">Orders:</span>
                              <span className="ml-1 font-black">{shopStats.orderCount}</span>
                            </div>
                          </div>
                          {/* Shop Profile Indicator */}
                          {shopProfile && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              <span className="text-[8px] opacity-60">Profile Added</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => confirmDelete(s.id, 'shop', s.name)}
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
                          className="bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black px-3 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-lg hover:opacity-90 transition-all"
                        >
                          BILL
                        </button>
                        <button
                          onClick={() => { setSelectedShop(s); setShowModal('shopProfile'); }}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase hover:opacity-90 transition-all"
                        >
                          PROFILE
                        </button>
                      </div>
                    </div>
                    
                    {/* Last Order Info */}
                    {shopStats.lastOrder && (
                      <div className="mt-3 pt-2 border-t border-white/10 text-[9px] opacity-60">
                        Last order: {new Date(shopStats.lastOrder.timestamp).toLocaleDateString()} - Rs.{shopStats.lastOrder.total.toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredShops.length === 0 && (
                <div className="text-center py-6">
                  <Store size={30} className="mx-auto opacity-20 mb-2" />
                  <p className="text-xs opacity-30 italic">No shops found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== HISTORY TAB ========== */}
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
                    <p className="text-[10px] opacity-60">{new Date(o.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => printBill(o)}
                      className={`p-2 rounded-lg transition-all ${
                        isDarkMode
                          ? 'text-blue-500 hover:bg-blue-500/10'
                          : 'text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      <Printer size={16}/>
                    </button>
                    <button
                      onClick={() => shareToWhatsApp(o)}
                      className={`p-2 rounded-lg transition-all ${
                        isDarkMode
                          ? 'text-[#d4af37] hover:bg-[#d4af37]/10'
                          : 'text-[#d4af37] hover:bg-[#d4af37]/20'
                      }`}
                    >
                      <Share2 size={16}/>
                    </button>
                    <button
                      onClick={() => confirmDelete(o.id, 'order', '')}
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

                <div className="space-y-1.5 border-y py-2 my-2" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }}>
                  {o.items && o.items.map((i, k) => (
                    <div key={k} className="flex justify-between items-center text-xs">
                      <span>{i.name} x{i.qty}</span>
                      <span className="text-[#d4af37] font-black">Rs.{i.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center font-black pt-1">
                  <span className="text-xs uppercase opacity-60">Total</span>
                  <span className="text-lg text-[#d4af37]">Rs.{o.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========== NOTES TAB ========== */}
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

            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className={`p-4 rounded-2xl border ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/5"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-[#d4af37]" />
                    <span className="text-[10px] opacity-60">
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <button
                    onClick={() => confirmDelete(note.id, 'note', '')}
                    className="text-red-500/50 hover:text-red-500"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
                <p className="text-sm">{note.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* ========== SETTINGS TAB ========== */}
        {activeTab === 'settings' && (
          <div className="space-y-4 pb-16">
            {/* Profile Settings */}
            <form onSubmit={handleSaveProfile} className={`p-5 rounded-2xl border space-y-4 ${
              isDarkMode
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                : "bg-white border-gray-200"
            }`}>
              <h3 className="text-sm font-black text-[#d4af37] uppercase">Profile Settings</h3>
              <input
                name="repName"
                defaultValue={data.settings.name}
                placeholder="YOUR NAME"
                className={`w-full p-3 rounded-xl border text-xs font-black uppercase outline-none focus:border-[#d4af37] transition-all ${
                  isDarkMode
                    ? 'bg-black/50 border-white/10 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
              <input
                name="companyName"
                defaultValue={data.settings.company}
                placeholder="COMPANY NAME"
                className={`w-full p-3 rounded-xl border text-xs font-black uppercase outline-none focus:border-[#d4af37] transition-all ${
                  isDarkMode
                    ? 'bg-black/50 border-white/10 text-white'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black rounded-xl text-xs uppercase">
                <Save size={16} className="inline mr-1" /> SAVE PROFILE
              </button>
            </form>

            {/* Quick Actions */}
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
              <button
                onClick={() => setShowModal('target')}
                className={`py-4 rounded-xl border text-[#d4af37] font-black uppercase text-xs flex flex-col items-center gap-1.5 hover:border-[#d4af37] transition-all col-span-2 ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Target size={20}/> SET MONTHLY TARGET
              </button>
            </div>

            {/* Routes List */}
            <div>
              <h4 className="text-xs font-black text-[#d4af37] uppercase mb-2">Routes ({data.routes.length})</h4>
              {data.routes.map(r => (
                <div key={r.id} className={`p-3 rounded-xl border flex justify-between items-center mb-2 ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5'
                    : 'bg-gray-50 border-gray-100'
                }`}>
                  <span className="text-sm font-bold">{r.name}</span>
                  <button onClick={() => confirmDelete(r.id, 'route', r.name)} className="text-red-500/50 hover:text-red-500">
                    <Trash2 size={14}/>
                  </button>
                </div>
              ))}
            </div>

            {/* Brands List */}
            <div>
              <h4 className="text-xs font-black text-[#d4af37] uppercase mb-2">Brands ({data.brands.length})</h4>
              {data.brands.map((b, i) => (
                <div key={b.id} className={`p-3 rounded-xl border mb-2 ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5'
                    : 'bg-gray-50 border-gray-100'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-[#d4af37]/20 rounded-lg flex items-center justify-center text-xs font-black text-[#d4af37]">
                        {b.sequence || i + 1}
                      </span>
                      <div>
                        <span className="font-black text-sm">{b.name}</span>
                        <span className="ml-2 text-[10px] px-2 py-0.5 bg-[#d4af37]/20 rounded-full text-[#d4af37]">{b.size}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditingBrand(b.id)} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded">
                        <Edit2 size={14}/>
                      </button>
                      <button onClick={() => confirmDelete(b.id, 'brand', `${b.name} (${b.size})`)} className="p-1 text-red-500/50 hover:text-red-500 rounded">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs mt-1 opacity-60">Rs.{b.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========== BOTTOM NAVIGATION ========== */}
      <nav className={`fixed bottom-4 inset-x-4 h-16 rounded-2xl border flex items-center justify-around z-50 shadow-2xl backdrop-blur-xl ${
        isDarkMode
          ? "bg-black/90 border-[#d4af37]/30"
          : "bg-white/90 border-[#d4af37]/30"
      }`}>
        {[
          {id: 'dashboard', icon: LayoutDashboard, label: 'HOME'},
          {id: 'shops', icon: Store, label: 'SHOPS'},
          {id: 'history', icon: History, label: 'HISTORY'},
          {id: 'notes', icon: BookOpen, label: 'NOTES'},
          {id: 'settings', icon: Settings, label: 'MORE'}
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex flex-col items-center transition-all ${
              activeTab === t.id
                ? 'text-[#d4af37]'
                : isDarkMode
                  ? 'text-white/40 hover:text-white/60'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={20} />
            <span className="text-[8px] font-black uppercase mt-1">{t.label}</span>
            {activeTab === t.id && (
              <div className="absolute -bottom-1 w-6 h-0.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full"></div>
            )}
          </button>
        ))}
      </nav>

      {/* ========== CALCULATOR MODAL - WITH PERCENTAGE DISCOUNT ========== */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl border relative shadow-2xl ${
            isDarkMode
              ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30"
              : "bg-gradient-to-br from-white to-amber-50 border-[#d4af37]/50"
          }`}>
            <button onClick={() => { setShowCalculator(false); resetCalculator(); }} className="absolute top-3 right-3 text-white/50 hover:text-white">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <Calculator size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] text-lg uppercase">CALCULATOR</h3>
              <p className="text-xs opacity-60">Discount (Rs. or %)</p>
            </div>

            <div className="space-y-4">
              <input
                type="number"
                value={calc.subtotal}
                onChange={(e) => setCalc({...calc, subtotal: parseFloat(e.target.value) || 0})}
                placeholder="SUBTOTAL (Rs.)"
                className={`w-full p-3 rounded-lg border text-center font-bold outline-none focus:border-[#d4af37] ${
                  isDarkMode
                    ? 'bg-black/50 border-white/10 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setCalc({...calc, usePercentage: false})}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    !calc.usePercentage
                      ? 'bg-[#d4af37] text-black'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  Rs.
                </button>
                <button
                  onClick={() => setCalc({...calc, usePercentage: true})}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    calc.usePercentage
                      ? 'bg-[#d4af37] text-black'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  %
                </button>
              </div>

              {calc.usePercentage ? (
                <input
                  type="number"
                  value={calc.discountPercent}
                  onChange={(e) => setCalc({...calc, discountPercent: parseFloat(e.target.value) || 0})}
                  placeholder="DISCOUNT %"
                  className={`w-full p-3 rounded-lg border text-center font-bold outline-none focus:border-[#d4af37] ${
                    isDarkMode
                      ? 'bg-black/50 border-white/10 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              ) : (
                <input
                  type="number"
                  value={calc.discount}
                  onChange={(e) => setCalc({...calc, discount: parseFloat(e.target.value) || 0})}
                  placeholder="DISCOUNT (Rs.)"
                  className={`w-full p-3 rounded-lg border text-center font-bold outline-none focus:border-[#d4af37] ${
                    isDarkMode
                      ? 'bg-black/50 border-white/10 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              )}

              <input
                type="number"
                value={calc.tax}
                onChange={(e) => setCalc({...calc, tax: parseFloat(e.target.value) || 0})}
                placeholder="TAX (Rs.)"
                className={`w-full p-3 rounded-lg border text-center font-bold outline-none focus:border-[#d4af37] ${
                  isDarkMode
                    ? 'bg-black/50 border-white/10 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />

              <div className={`p-4 rounded-lg border ${
                isDarkMode
                  ? 'bg-black/30 border-[#d4af37]/30'
                  : 'bg-amber-100/30 border-[#d4af37]/30'
              }`}>
                <p className="text-xs text-center opacity-60 mb-1">GRAND TOTAL</p>
                <p className="text-2xl font-black text-[#d4af37] text-center">
                  Rs.{(
                    (calc.subtotal || 0) - 
                    (calc.usePercentage 
                      ? ((calc.subtotal || 0) * (calc.discountPercent || 0) / 100)
                      : (calc.discount || 0)
                    ) + (calc.tax || 0)
                  ).toLocaleString()}
                </p>
              </div>

              <button
                onClick={calculateTotal}
                className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-sm hover:opacity-90 transition-all"
              >
                CALCULATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== EXPENSE MODAL ========== */}
      {showModal === 'expense' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl border ${
            isDarkMode
              ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30"
              : "bg-gradient-to-br from-white to-amber-50 border-[#d4af37]/50"
          }`}>
            <button onClick={() => setShowModal(null)} className="absolute top-3 right-3 text-white/50 hover:text-white">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <CreditCard size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] text-lg uppercase">ADD EXPENSE</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {['fuel', 'food', 'transport', 'other'].map(type => (
                  <button
                    key={type}
                    onClick={() => setExpenseType(type)}
                    className={`p-2 rounded-lg border uppercase text-xs font-black ${
                      expenseType === type
                        ? 'bg-[#d4af37] text-black border-[#d4af37]'
                        : 'bg-white/10 border-white/10 text-white/60'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="AMOUNT (Rs.)"
                className={`w-full p-3 rounded-lg border text-center font-bold outline-none focus:border-[#d4af37] ${
                  isDarkMode
                    ? 'bg-black/50 border-white/10 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />

              <textarea
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="NOTE (optional)"
                rows="2"
                className={`w-full p-3 rounded-lg border text-sm outline-none focus:border-[#d4af37] ${
                  isDarkMode
                    ? 'bg-black/50 border-white/10 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />

              <button
                onClick={saveExpense}
                disabled={isSavingExpense}
                className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-sm hover:opacity-90 transition-all"
              >
                SAVE EXPENSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== NOTE MODAL ========== */}
      {showModal === 'note' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl border ${
            isDarkMode
              ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30"
              : "bg-gradient-to-br from-white to-amber-50 border-[#d4af37]/50"
          }`}>
            <button onClick={() => setShowModal(null)} className="absolute top-3 right-3 text-white/50 hover:text-white">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <FileText size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] text-lg uppercase">ADD NOTE</h3>
            </div>

            <textarea
              value={repNote}
              onChange={(e) => setRepNote(e.target.value)}
              placeholder="Type your note here..."
              rows="4"
              className={`w-full p-3 rounded-lg border text-sm outline-none focus:border-[#d4af37] ${
                isDarkMode
                  ? 'bg-black/50 border-white/10 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />

            <button
              onClick={saveNote}
              disabled={isSavingNote}
              className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-sm mt-4 hover:opacity-90 transition-all"
            >
              SAVE NOTE
            </button>
          </div>
        </div>
      )}

      {/* ========== INVOICE MODAL ========== */}
      {showModal === 'invoice' && selectedShop && (
        <div className="fixed inset-0 bg-black z-[100] overflow-y-auto">
          <div className="min-h-screen p-4 max-w-lg mx-auto pb-32">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-black py-3 border-b border-white/10">
              <div>
                <h2 className="text-xl font-black text-white">{selectedShop.name}</h2>
                <p className="text-xs text-[#d4af37]">Create New Bill</p>
              </div>
              <button onClick={() => { setShowModal(null); setCart({}); }} className="p-2 bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>

            {data.brands.map((b, i) => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 mb-2">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-[#d4af37]/20 rounded-lg flex items-center justify-center text-[#d4af37] font-black text-xs">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-black text-sm text-white">{b.name} ({b.size})</p>
                    <p className="text-xs text-[#d4af37]">Rs.{b.price}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1)}} className="w-8 h-8 bg-white/10 rounded-lg text-white">-</button>
                  <input
                    type="number"
                    value={cart[b.id] || ''}
                    onChange={(e) => setCart({...cart, [b.id]: e.target.value})}
                    className="w-12 bg-transparent text-center font-black text-[#d4af37] outline-none"
                    placeholder="0"
                  />
                  <button onClick={() => setCart({...cart, [b.id]: (Number(cart[b.id])||0)+1})} className="w-8 h-8 bg-white/10 rounded-lg text-white">+</button>
                </div>
              </div>
            ))}

            <div className="fixed bottom-0 inset-x-0 p-4 bg-black/95 border-t border-white/10">
              <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-white/60">Total Items: {Object.values(cart).filter(q => q > 0).length}</span>
                  <span className="text-xl font-black text-[#d4af37]">Rs.{calculateCartTotal().toLocaleString()}</span>
                </div>
                <button onClick={handleCreateOrder} className="w-full py-3 bg-[#d4af37] text-black font-black rounded-lg">
                  CONFIRM ORDER
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MANUAL ORDER MODAL ========== */}
      {showModal === 'manual' && (
        <div className="fixed inset-0 bg-black z-[100] overflow-y-auto">
          <div className="min-h-screen p-4 max-w-lg mx-auto pb-32">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-black py-3 border-b border-white/10">
              <div>
                <h2 className="text-xl font-black text-white">Manual Order</h2>
                <p className="text-xs text-[#d4af37]">Custom Items</p>
              </div>
              <button onClick={() => { setShowModal(null); setManualItems([{ name: '', qty: 1, price: 0, subtotal: 0 }]); }} className="p-2 bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>

            <select
              onChange={(e) => {
                const shop = data.shops.find(s => s.id === e.target.value);
                setSelectedShop(shop);
              }}
              className="w-full p-3 bg-white/5 rounded-lg border border-white/10 text-white mb-4"
              defaultValue=""
            >
              <option value="">SELECT SHOP</option>
              {data.shops.map(s => (
                <option key={s.id} value={s.id}>{s.name} - {s.area}</option>
              ))}
            </select>

            {manualItems.map((item, idx) => (
              <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10 mb-3">
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-white/60">Item #{idx + 1}</span>
                  {manualItems.length > 1 && (
                    <button onClick={() => removeManualItem(idx)} className="text-red-500/50 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={item.name}
                    onChange={(e) => updateManualItem(idx, 'name', e.target.value)}
                    placeholder="Product"
                    className="p-2 bg-black/50 rounded border border-white/10 text-white text-xs"
                  />
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateManualItem(idx, 'qty', e.target.value)}
                    placeholder="Qty"
                    className="p-2 bg-black/50 rounded border border-white/10 text-white text-xs"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateManualItem(idx, 'price', e.target.value)}
                    placeholder="Price"
                    className="p-2 bg-black/50 rounded border border-white/10 text-white text-xs"
                  />
                  <div className="p-2 bg-[#d4af37]/10 rounded border border-[#d4af37]/30 text-center text-[#d4af37] font-black text-sm">
                    Rs.{item.subtotal}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addManualItem} className="w-full py-3 border-2 border-dashed border-[#d4af37]/40 rounded-lg text-[#d4af37] text-xs font-black mb-4">
              <Plus size={16} className="inline mr-1" /> ADD ITEM
            </button>

            <div className="fixed bottom-0 inset-x-0 p-4 bg-black/95 border-t border-white/10">
              <div className="max-w-lg mx-auto">
                <div className="flex justify-between mb-2">
                  <span className="text-white/60">Shop: {selectedShop?.name || 'Not selected'}</span>
                  <span className="text-lg font-black text-[#d4af37]">
                    Rs.{manualItems.reduce((sum, i) => sum + (i.subtotal || 0), 0).toLocaleString()}
                  </span>
                </div>
                <button
                  onClick={saveManualOrder}
                  disabled={!selectedShop}
                  className={`w-full py-3 font-black rounded-lg ${
                    selectedShop ? 'bg-[#d4af37] text-black' : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  SAVE ORDER
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== PREVIEW MODAL ========== */}
      {showModal === 'preview' && lastOrder && (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4">
          <div className="bg-[#111] w-full max-w-sm p-5 rounded-2xl border border-[#d4af37]/30">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-500/30">
                <CheckCircle2 size={30} className="text-green-500" />
              </div>
              <h3 className="text-xl font-black text-white">Bill Confirmed!</h3>
              <p className="text-[#d4af37] text-sm font-bold mt-1">{lastOrder.shopName}</p>
            </div>

            <div className="bg-black/50 rounded-lg p-3 mb-4 max-h-40 overflow-y-auto">
              {lastOrder.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1 border-b border-white/5">
                  <span className="text-white/80">{item.name} x{item.qty}</span>
                  <span className="text-[#d4af37]">Rs.{item.subtotal}</span>
                </div>
              ))}
              <div className="flex justify-between font-black pt-2 mt-2 border-t border-white/10">
                <span className="text-white">Total</span>
                <span className="text-[#d4af37]">Rs.{lastOrder.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button onClick={() => { printBill(lastOrder); setShowModal(null); }} className="w-full py-3 bg-blue-600 text-white font-black rounded-lg text-xs">
                <Printer size={14} className="inline mr-2" /> PRINT BILL
              </button>
              <button onClick={() => shareToWhatsApp(lastOrder)} className="w-full py-3 bg-[#d4af37] text-black font-black rounded-lg text-xs">
                <Share2 size={14} className="inline mr-2" /> SHARE BILL
              </button>
              <button onClick={() => { setShowModal(null); setLastOrder(null); }} className="w-full py-3 bg-white/10 text-white/80 font-black rounded-lg text-xs">
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== SHOP PROFILE MODAL - NEW ========== */}
      {showModal === 'shopProfile' && selectedShop && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-5 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
            <button onClick={() => setShowModal(null)} className="absolute top-3 right-3 text-white/50 hover:text-white">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <Briefcase size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] text-lg uppercase">Shop Profile</h3>
              <p className="text-xs text-white/60 mt-1">{selectedShop.name}</p>
            </div>

            <form onSubmit={saveShopProfile} className="space-y-3">
              <input
                name="ownerName"
                placeholder="OWNER NAME"
                defaultValue={getShopProfile(selectedShop.id)?.ownerName || ''}
                className="w-full p-3 bg-black/50 rounded-lg border border-white/10 text-white text-sm outline-none focus:border-[#d4af37]"
              />
              <input
                name="phone"
                placeholder="PHONE NUMBER"
                defaultValue={getShopProfile(selectedShop.id)?.phone || ''}
                className="w-full p-3 bg-black/50 rounded-lg border border-white/10 text-white text-sm outline-none focus:border-[#d4af37]"
              />
              <input
                name="email"
                placeholder="EMAIL"
                type="email"
                defaultValue={getShopProfile(selectedShop.id)?.email || ''}
                className="w-full p-3 bg-black/50 rounded-lg border border-white/10 text-white text-sm outline-none focus:border-[#d4af37]"
              />
              <input
                name="address"
                placeholder="ADDRESS"
                defaultValue={getShopProfile(selectedShop.id)?.address || ''}
                className="w-full p-3 bg-black/50 rounded-lg border border-white/10 text-white text-sm outline-none focus:border-[#d4af37]"
              />
              <input
                name="gst"
                placeholder="GST NUMBER"
                defaultValue={getShopProfile(selectedShop.id)?.gst || ''}
                className="w-full p-3 bg-black/50 rounded-lg border border-white/10 text-white text-sm outline-none focus:border-[#d4af37]"
              />
              <textarea
                name="notes"
                placeholder="ADDITIONAL NOTES"
                rows="2"
                defaultValue={getShopProfile(selectedShop.id)?.notes || ''}
                className="w-full p-3 bg-black/50 rounded-lg border border-white/10 text-white text-sm outline-none focus:border-[#d4af37]"
              />

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-sm mt-2">
                SAVE PROFILE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== TARGET MODAL - NEW ========== */}
      {showModal === 'target' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-5 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a]">
            <button onClick={() => setShowModal(null)} className="absolute top-3 right-3 text-white/50 hover:text-white">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <Target size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] text-lg uppercase">Monthly Target</h3>
              <p className="text-xs text-white/60 mt-1">Set your sales goal</p>
            </div>

            <form onSubmit={saveMonthlyTarget} className="space-y-4">
              <div>
                <label className="text-xs text-white/60 block mb-1">Select Month</label>
                <input
                  type="month"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full p-3 bg-black/50 rounded-lg border border-white/10 text-white text-sm outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="text-xs text-white/60 block mb-1">Target Amount (Rs.)</label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-3 bg-black/50 rounded-lg border border-white/10 text-white text-sm outline-none focus:border-[#d4af37]"
                />
              </div>

              {stats.monthlyTarget > 0 && (
                <div className="p-3 bg-[#d4af37]/10 rounded-lg border border-[#d4af37]/30">
                  <p className="text-xs text-white/60">Current Target</p>
                  <p className="text-lg font-black text-[#d4af37]">Rs.{stats.monthlyTarget.toLocaleString()}</p>
                  <p className="text-xs text-white/60 mt-1">Progress: {stats.targetProgress.toFixed(1)}%</p>
                </div>
              )}

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-sm">
                SET TARGET
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== ADD ROUTE/SHOP/BRAND MODAL ========== */}
      {['route', 'shop', 'brand'].includes(showModal) && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl border ${
            isDarkMode
              ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30"
              : "bg-gradient-to-br from-white to-amber-50 border-[#d4af37]/50"
          }`}>
            <button onClick={() => { setShowModal(null); setBrandError(''); }} className="absolute top-3 right-3 text-white/50 hover:text-white">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              {showModal === 'route' && <MapPin size={28} className="text-[#d4af37] mx-auto mb-2" />}
              {showModal === 'shop' && <Store size={28} className="text-[#d4af37] mx-auto mb-2" />}
              {showModal === 'brand' && <Package size={28} className="text-[#d4af37] mx-auto mb-2" />}
              <h3 className="font-black text-[#d4af37] text-lg uppercase">New {showModal}</h3>
            </div>

            <form onSubmit={
              showModal === 'brand' ? addBrandWithSequence : 
              async (e) => {
                e.preventDefault();
                const f = e.target;
                try {
                  if (showModal === 'route') {
                    await addDoc(collection(db, 'routes'), {
                      userId: user.uid, name: f.name.value.toUpperCase(), timestamp: Date.now()
                    });
                    showToast("✅ Route added", "success");
                  }
                  if (showModal === 'shop') {
                    await addDoc(collection(db, 'shops'), {
                      userId: user.uid, name: f.name.value.toUpperCase(), area: f.area.value, timestamp: Date.now()
                    });
                    showToast("✅ Shop added", "success");
                  }
                  setShowModal(null);
                } catch (err) {
                  showToast("Error: " + err.message, "error");
                }
              }
            } className="space-y-3">
              
              <input
                name="name"
                placeholder={showModal === 'brand' ? 'BRAND NAME' : showModal === 'shop' ? 'SHOP NAME' : 'ROUTE NAME'}
                className={`w-full p-3 rounded-lg border outline-none focus:border-[#d4af37] ${
                  isDarkMode
                    ? 'bg-black/50 border-white/10 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
                required
              />

              {showModal === 'shop' && (
                <select name="area" className={`w-full p-3 rounded-lg border outline-none focus:border-[#d4af37] ${
                  isDarkMode
                    ? 'bg-black/50 border-white/10 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-900'
                }`} required>
                  <option value="">SELECT ROUTE</option>
                  {data.routes.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              )}

              {showModal === 'brand' && (
                <>
                  <div className="p-3 bg-[#d4af37]/10 rounded-lg border border-[#d4af37]/30 text-center">
                    <span className="text-xs opacity-60">Next Number</span>
                    <div className="text-2xl font-black text-[#d4af37]">{data.brands.length + 1}</div>
                  </div>
                  
                  <input
                    name="size"
                    placeholder="SIZE (e.g., 500ML)"
                    className={`w-full p-3 rounded-lg border outline-none focus:border-[#d4af37] ${
                      isDarkMode
                        ? 'bg-black/50 border-white/10 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                  <input
                    name="price"
                    type="number"
                    placeholder="PRICE (Rs.)"
                    className={`w-full p-3 rounded-lg border outline-none focus:border-[#d4af37] ${
                      isDarkMode
                        ? 'bg-black/50 border-white/10 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                  
                  {brandError && (
                    <div className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-500 text-xs font-bold text-center">{brandError}</p>
                    </div>
                  )}
                </>
              )}

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-sm">
                SAVE {showModal}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== PRINT PREVIEW MODAL ========== */}
      {showPrintPreview && printOrder && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-3">
          <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] w-full max-w-sm p-4 rounded-2xl border border-[#d4af37]/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-[#d4af37] uppercase">Print Bill</h3>
              <button onClick={() => setShowPrintPreview(false)} className="p-2 bg-white/10 rounded-full">
                <X size={20}/>
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl mb-4 text-black">
              <div className="text-center border-b-2 border-[#d4af37] pb-3 mb-3">
                <div className="text-xl font-bold text-[#d4af37]">{printOrder.companyName || "MONARCH"}</div>
                <div className="text-lg font-bold mt-1">{printOrder.shopName}</div>
                <div className="text-xs mt-1">{new Date(printOrder.timestamp).toLocaleString()}</div>
              </div>

              <table className="w-full text-xs mb-3">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1">Item</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Price</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {printOrder.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{item.name}</td>
                      <td className="text-center py-1">{item.qty}</td>
                      <td className="text-right py-1">{item.price}</td>
                      <td className="text-right py-1">{item.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t-2 border-[#d4af37] pt-3 text-right">
                <span className="text-lg font-bold">Total: Rs.{printOrder.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => { handlePrint(printOrder); setShowPrintPreview(false); }}
                className="w-full py-3 bg-[#d4af37] text-black font-black rounded-lg uppercase text-xs"
              >
                <Printer size={16} className="inline mr-2" /> PRINT
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="w-full py-2.5 bg-white/10 text-white/80 font-black rounded-lg uppercase text-xs"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== STYLES ========== */}
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 2.5s ease-in-out;
        }
        * { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          -webkit-tap-highlight-color: transparent;
        }
        input[type="number"]::-webkit-inner-spin-button, 
        input[type="number"]::-webkit-outer-spin-button { 
          opacity: 0.5;
        }
        .min-h-screen { min-height: 100vh; }
        button { 
          cursor: pointer;
          transition: all 0.2s ease;
        }
        button:active { 
          transform: scale(0.98); 
        }
        @media (max-width: 380px) {
          html { font-size: 14px; }
        }
      `}</style>
    </div>
  );
}
