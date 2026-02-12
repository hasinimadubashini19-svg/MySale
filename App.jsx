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
  CreditCard, Coffee, Target, BarChart3, Hash, Package2,
  BookOpen, Clock, Printer, Wifi, WifiOff, Award, Briefcase, Activity,
  Phone, Mail, User, Map, Home, ChevronLeft, Info, Gamepad2
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
    if (err.code === 'failed-precondition') {
      console.log("Persistence failed - multiple tabs open");
    } else if (err.code === 'unimplemented') {
      console.log("Persistence not supported");
    }
  });
} catch (err) {
  console.log("Offline mode setup:", err);
}

export default function App() {
  // State Variables
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSplash, setIsSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [data, setData] = useState({
    routes: [],
    shops: [],
    orders: [],
    brands: [],
    settings: { name: '', company: '' },
    expenses: [],
    notes: [],
    locations: [],
    targets: [],
    shopProfiles: []
  });
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
  
  // Calculator State
  const [totalCalculation, setTotalCalculation] = useState({
    subtotal: 0,
    discount: 0,
    discountPercent: 0,
    tax: 0,
    grandTotal: 0,
    usePercentage: false
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState({ show: false, id: null, type: '', name: '' });
  const [brandError, setBrandError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [targetUnits, setTargetUnits] = useState('');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // ===== NEW: Kolho Asa Game (Flappy Bird Style) =====
  const [showAsaGame, setShowAsaGame] = useState(false);
  const [birdPosition, setBirdPosition] = useState(250);
  const [obstacle, setObstacle] = useState({ x: 400, height: 150 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);

  // Network Status Listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      enableNetwork(db).then(() => {
        showToast("📶 Back online", "success");
        syncPendingOrders();
      });
    };
    const handleOffline = () => {
      setIsOffline(true);
      disableNetwork(db);
      showToast("📴 Offline mode", "info");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ===== KOLHO ASA GAME LOGIC =====
  useEffect(() => {
    if (!showAsaGame || !gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      // Gravity
      setBirdPosition(p => p + 5);
      
      // Move obstacle
      setObstacle(o => ({
        ...o,
        x: o.x - 3
      }));

      // Reset obstacle
      setObstacle(o => {
        if (o.x < -50) {
          setScore(s => s + 1);
          return {
            x: 400,
            height: Math.floor(Math.random() * 200) + 100
          };
        }
        return o;
      });

      // Collision detection
      if (birdPosition < 0 || birdPosition > 500) {
        setGameOver(true);
      }
      
      if (obstacle.x < 70 && obstacle.x > 20) {
        if (birdPosition < obstacle.height - 50 || birdPosition > obstacle.height + 150) {
          setGameOver(true);
        }
      }
    }, 30);

    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setBirdPosition(p => p - 40);
      }
    };

    const handleTouch = () => {
      setBirdPosition(p => p - 40);
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleTouch);
    window.addEventListener('touchstart', handleTouch);

    return () => {
      clearInterval(gameLoop);
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleTouch);
      window.removeEventListener('touchstart', handleTouch);
    };
  }, [showAsaGame, gameStarted, gameOver, birdPosition, obstacle.x]);

  const startAsaGame = () => {
    setBirdPosition(250);
    setObstacle({ x: 400, height: 150 });
    setGameOver(false);
    setScore(0);
    setGameStarted(true);
  };

  // Toast Notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 2000);
  };

  // Splash Screen & Auth Listener
  useEffect(() => {
    const timer = setTimeout(() => setIsSplash(false), 1000);
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
          }, (error) => {
            console.error(`Error fetching ${collectionName}:`, error);
            const cached = localStorage.getItem(`${collectionName}_${user.uid}`);
            if (cached) {
              setData(prev => ({
                ...prev,
                [collectionName]: JSON.parse(cached)
              }));
            }
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

  // Sync pending orders
  const syncPendingOrders = async () => {
    const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    for (const order of pending) {
      try {
        await addDoc(collection(db, 'orders'), order);
        showToast("✅ Synced order", "success");
      } catch (err) {
        console.error("Sync failed:", err);
      }
    }
    localStorage.removeItem('pendingOrders');
    setPendingOrders([]);
  };

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
              .then(() => showToast("📍 Location saved", "success"))
              .catch(err => showToast("Error saving location", "error"));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          showToast("Location access denied", "error");
        }
      );
    } else {
      showToast("Geolocation not supported", "error");
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
        userId: user.uid,
        updatedAt: Date.now()
      });
      showToast("✅ Profile Saved", "success");
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
        showToast("✅ Expense saved", "success");
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

  // Delete Confirm
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
      
      showToast(`✅ ${type} deleted`, 'success');
      setShowDeleteConfirm({ show: false, id: null, type: '', name: '' });
    } catch (err) {
      showToast(`Error deleting ${type}: ` + err.message, 'error');
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
        showToast("✅ Note saved", "success");
      }

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
        showToast("✅ Order saved offline", "info");
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

  // Calculate Total
  const calculateTotal = () => {
    const subtotal = parseFloat(totalCalculation.subtotal) || 0;
    let discount = parseFloat(totalCalculation.discount) || 0;
    const discountPercent = parseFloat(totalCalculation.discountPercent) || 0;
    const tax = parseFloat(totalCalculation.tax) || 0;
    
    if (totalCalculation.usePercentage && discountPercent > 0) {
      discount = (subtotal * discountPercent) / 100;
    }
    
    const grandTotal = subtotal - discount + tax;

    setTotalCalculation(prev => ({
      ...prev,
      discount: discount,
      grandTotal: grandTotal
    }));

    showToast(`💰 Total: Rs.${grandTotal.toLocaleString()}`, "info");
  };

  // Reset calculator
  const resetCalculator = () => {
    setTotalCalculation({
      subtotal: 0,
      discount: 0,
      discountPercent: 0,
      tax: 0,
      grandTotal: 0,
      usePercentage: false
    });
  };

  // Forgot Password
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
      showToast("📧 Reset link sent!", "success");
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

  // ===== UPDATED: STATISTICS WITH TARGET (UNITS) =====
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
            const subtotal = i.subtotal || 0;
            const itemName = i.name.split('(')[0].trim();

            totalUnits += qty;

            if (!summary[itemName]) {
              summary[itemName] = {
                units: 0,
                revenue: 0
              };
            }
            summary[itemName].units += qty;
            summary[itemName].revenue += subtotal;
          });
        }
      });

      const allBrandsSorted = Object.entries(summary)
        .map(([name, data]) => ({
          name,
          units: data.units,
          revenue: data.revenue
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        totalSales,
        totalUnits,
        summary: allBrandsSorted,
        topBrand: allBrandsSorted[0]?.name || 'N/A',
        topBrandUnits: allBrandsSorted[0]?.units || 0,
        avgPrice: totalUnits > 0 ? totalSales / totalUnits : 0,
        allBrands: allBrandsSorted
      };
    };

    const dailyOrders = data.orders.filter(o => o.dateString === todayStr);
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
    
    // Current month target (UNITS)
    const monthTargets = data.targets?.filter(t => t.month === currentMonthStr) || [];
    const totalTargetUnits = monthTargets.reduce((sum, t) => sum + (t.units || 0), 0);
    
    const monthlyTotalUnits = monthlyOrders.reduce((sum, o) => {
      if (o.items) {
        return sum + o.items.reduce((itemSum, i) => itemSum + (i.qty || 0), 0);
      }
      return sum;
    }, 0);
    
    const targetProgress = totalTargetUnits > 0 ? (monthlyTotalUnits / totalTargetUnits) * 100 : 0;

    // Daily expenses breakdown
    const dailyExpensesByType = todayExpenses.reduce((acc, expense) => {
      const type = expense.type || 'other';
      if (!acc[type]) acc[type] = 0;
      acc[type] += expense.amount || 0;
      return acc;
    }, {});

    return {
      daily: getStats(dailyOrders),
      monthly: getStats(monthlyOrders),
      expenses: totalExpenses,
      monthlyExpenses,
      notes: todayNotes.length,
      todayExpenses,
      dailyExpensesByType,
      monthlySales: monthlyOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      monthlyUnits: monthlyTotalUnits,
      monthlyTargetUnits: totalTargetUnits,
      targetProgress,
      targetRemaining: Math.max(0, totalTargetUnits - monthlyTotalUnits)
    };
  }, [data.orders, data.expenses, data.notes, data.targets]);

  // Shop Statistics
  const getShopStats = (shopId) => {
    if (!shopId) return { totalSales: 0, orderCount: 0, lastOrder: null, totalUnits: 0 };
    
    const shopOrders = data.orders.filter(o => o.shopId === shopId || o.shopName === shopId);
    const totalSales = shopOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const orderCount = shopOrders.length;
    const lastOrder = shopOrders.length > 0 ? shopOrders[0] : null;
    
    let totalUnits = 0;
    shopOrders.forEach(o => {
      if (o.items) {
        o.items.forEach(i => {
          totalUnits += i.qty || 0;
        });
      }
    });
    
    return { totalSales, orderCount, lastOrder, totalUnits };
  };

  // Get Shop Profile
  const getShopProfile = (shopId) => {
    return data.shopProfiles?.find(p => p.shopId === shopId);
  };

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
    return data.notes.filter(note => note.date === noteSearchDate);
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

  // WhatsApp Share
  const shareToWhatsApp = (order) => {
    if (!order) return;

    let msg = `*${order.companyName || "MONARCH"} - INVOICE*\n`;
    msg += `─────────────────\n`;
    msg += `🏪 *Shop:* ${order.shopName}\n`;
    msg += `📅 *Date:* ${new Date(order.timestamp).toLocaleString()}\n`;
    msg += `\n*ITEMS:*\n`;
    
    order.items.forEach(i => {
      msg += `• ${i.name} (${i.qty} x Rs.${i.price}) = *Rs.${i.subtotal.toLocaleString()}*\n`;
    });
    
    msg += `\n─────────────────\n`;
    msg += `💰 *TOTAL: Rs.${order.total.toLocaleString()}*\n`;
    msg += `─────────────────\n`;
    msg += `_Monarch Pro_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Print Bill
  const printBill = (order) => {
    setPrintOrder(order);
    setShowPrintPreview(true);
  };

  // Generate Bill HTML
  const generateBillHTML = (order) => {
    const companyName = order.companyName || data.settings.company || "MONARCH";
    const shopName = order.shopName || "Unknown Shop";
    const date = new Date(order.timestamp).toLocaleString();
    const billNumber = order.id ? order.id.slice(-6) : Math.floor(Math.random() * 1000000);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - ${shopName}</title>
        <style>
          body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; background: white; color: black; }
          .bill { max-width: 80mm; margin: 0 auto; padding: 10px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .company { font-size: 18px; font-weight: bold; color: #d4af37; margin: 0; text-transform: uppercase; }
          .shop { font-size: 16px; font-weight: bold; margin: 5px 0; }
          .details { font-size: 11px; margin: 3px 0; }
          .items { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .items th { border-bottom: 1px solid #000; padding: 5px; font-size: 11px; text-align: left; }
          .items td { padding: 5px; font-size: 11px; }
          .total { border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; text-align: right; font-size: 14px; font-weight: bold; }
          .footer { margin-top: 15px; text-align: center; font-size: 9px; color: #666; border-top: 1px dashed #000; padding-top: 8px; }
          @media print { body { margin: 0; padding: 5px; } }
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
              ${order.items.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.qty}</td>
                  <td>Rs.${item.price}</td>
                  <td>Rs.${item.subtotal.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            TOTAL: Rs.${order.total.toLocaleString()}
          </div>
          <div class="footer">
            Thank you for your business!<br>
            Generated by Monarch Pro
          </div>
        </div>
        <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
      </body>
      </html>
    `;
  };

  // Execute Print
  const handlePrint = (order) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateBillHTML(order));
    printWindow.document.close();
  };

  // Auth Handler
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
        showToast("🎉 Account created!", "success");
        
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
        case 'auth/wrong-password':
          errorMessage = "❌ Wrong Password or Email";
          break;
        case 'auth/too-many-requests':
          errorMessage = "❌ Too many attempts. Try again later";
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
        showToast("✅ Order saved offline", "info");
      } else {
        await addDoc(collection(db, 'orders'), orderData);
      }
      
      setCart({});
      setLastOrder(orderData);
      setShowModal('preview');
      showToast("Order saved!", "success");
    } catch (err) {
      showToast("Error saving order: " + err.message, "error");
    }
  };

  // Validate Brand
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

  // Add Brand with Sequence
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
        name,
        size,
        price,
        sequence,
        displayNumber: sequence
      };

      if (isOffline) {
        const cached = JSON.parse(localStorage.getItem(`brands_${user.uid}`) || '[]');
        cached.unshift({ ...brandData, id: 'temp_' + Date.now() });
        cached.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
        localStorage.setItem(`brands_${user.uid}`, JSON.stringify(cached));
        showToast("✅ Brand added offline", "info");
      } else {
        await addDoc(collection(db, 'brands'), brandData);
        showToast(`✅ Brand #${sequence} added`, "success");
      }

      setBrandError('');
      setShowModal(null);
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // Reorder Brands
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

      showToast("✅ Brand reordered", "success");
    } catch (err) {
      showToast("Error reordering brands: " + err.message, "error");
    }
  };

  // Save Brand Edit
  const saveBrandEdit = async (brandId, field, value) => {
    try {
      await updateDoc(doc(db, 'brands', brandId), { 
        [field]: field === 'price' ? parseFloat(value) : value.toUpperCase()
      });
      showToast("Brand updated", "success");
    } catch (err) {
      showToast("Error updating brand: " + err.message, "error");
    }
  };

  // ===== UPDATED: Save Monthly Target (UNITS) =====
  const saveMonthlyTarget = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const targetData = {
        userId: user.uid,
        month: targetMonth,
        units: parseFloat(targetUnits) || 0,
        timestamp: Date.now()
      };
      
      await addDoc(collection(db, 'targets'), targetData);
      
      showToast(`✅ ${targetUnits} units target added`, "success");
      setTargetUnits('');
      setShowModal(null);
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // Save Shop Profile
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
      
      const existingProfile = data.shopProfiles?.find(p => p.shopId === selectedShop.id);
      
      if (existingProfile) {
        await updateDoc(doc(db, 'shopProfiles', existingProfile.id), profileData);
        showToast("✅ Shop profile updated", "success");
      } else {
        await addDoc(collection(db, 'shopProfiles'), profileData);
        showToast("✅ Shop profile saved", "success");
      }
      
      setShowModal(null);
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // --- RENDER ---

  // Splash Screen
  if (isSplash || loading) return (
    <div className="h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] flex flex-col items-center justify-center">
      <button 
        onClick={() => setShowAsaGame(true)}
        className="transform hover:scale-110 transition-all duration-300"
      >
        <Crown size={64} className="text-[#d4af37] animate-pulse" />
      </button>
      <h1 className="mt-4 text-[#d4af37] text-2xl font-black tracking-widest uppercase">MONARCH</h1>
      <p className="mt-1 text-white/40 text-[10px] uppercase tracking-widest">Professional Sales Manager</p>
      <div className="mt-4 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] animate-progress"></div>
      </div>
    </div>
  );

  // ===== KOLHO ASA GAME =====
  if (showAsaGame) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] p-5 rounded-2xl border border-[#d4af37]/30 w-full max-w-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-black text-[#d4af37] uppercase tracking-widest">කොල්ලෝ අසා</h2>
            <button 
              onClick={() => setShowAsaGame(false)}
              className="p-2 bg-white/5 rounded-lg text-white/60 hover:bg-white/10 transition-all"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative bg-black/60 rounded-xl h-64 overflow-hidden border border-[#d4af37]/20 mb-3">
            {/* Bird */}
            <div 
              className="absolute w-6 h-6 bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full transition-all"
              style={{ 
                left: '30px', 
                top: `${birdPosition}px`,
                transform: 'translateY(-50%)',
                boxShadow: '0 0 15px rgba(212,175,55,0.3)'
              }}
            />
            
            {/* Obstacle */}
            <div 
              className="absolute w-4 bg-gradient-to-b from-[#d4af37]/80 to-[#b8860b]/80"
              style={{ 
                left: `${obstacle.x}px`,
                top: '0',
                height: `${obstacle.height - 50}px`
              }}
            />
            <div 
              className="absolute w-4 bg-gradient-to-b from-[#d4af37]/80 to-[#b8860b]/80"
              style={{ 
                left: `${obstacle.x}px`,
                bottom: '0',
                height: `calc(100% - ${obstacle.height + 50}px)`
              }}
            />
            
            {/* Score */}
            <div className="absolute top-2 right-2 text-[#d4af37] font-black">
              {score}
            </div>
          </div>

          {!gameStarted ? (
            <button
              onClick={startAsaGame}
              className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all"
            >
              START GAME
            </button>
          ) : gameOver ? (
            <div className="space-y-2">
              <div className="text-center text-white/80 text-sm font-bold mb-2">
                Score: {score}
              </div>
              <button
                onClick={startAsaGame}
                className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all"
              >
                PLAY AGAIN
              </button>
            </div>
          ) : (
            <p className="text-center text-white/40 text-[10px] uppercase tracking-widest">
              Tap / Space to fly
            </p>
          )}
        </div>
      </div>
    );
  }

  // Forgot Password Screen
  if (!user && showForgotPassword) {
    return (
      <div className="h-screen bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm p-6 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-[#d4af37]/30">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-[#d4af37]/20 to-[#b8860b]/20 rounded-full flex items-center justify-center mx-auto border border-[#d4af37]/30 mb-3">
              <Crown size={30} className="text-[#d4af37]" />
            </div>
            <h2 className="text-white font-black text-lg uppercase tracking-widest">Reset Password</h2>
          </div>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-600/10 rounded-xl border border-green-500/30">
                <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
                <p className="text-green-500 text-xs font-bold text-center">
                  Reset link sent!
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSuccess(false);
                  setResetEmail('');
                }}
                className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="EMAIL"
                className="w-full bg-black/50 p-3 rounded-lg border border-white/10 text-white font-bold text-xs outline-none focus:border-[#d4af37]"
              />
              <button
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className={`w-full py-3 font-black rounded-lg uppercase text-xs tracking-widest ${isSendingReset ? 'bg-gray-700 text-gray-400' : 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black hover:opacity-90'}`}
              >
                {isSendingReset ? 'SENDING...' : 'SEND RESET LINK'}
              </button>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail('');
                }}
                className="w-full py-2 text-white/40 text-xs hover:text-white/60"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Login Screen
  if (!user) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <button 
            onClick={() => setShowAsaGame(true)}
            className="transform hover:scale-110 transition-all duration-300"
          >
            <div className="w-20 h-20 bg-gradient-to-br from-[#d4af37]/20 to-[#b8860b]/20 rounded-full flex items-center justify-center mx-auto border-2 border-[#d4af37]/30 mb-3">
              <Crown size={40} className="text-[#d4af37]" />
            </div>
          </button>
          <h2 className="text-white font-black text-xl uppercase tracking-widest">
            {isRegisterMode ? "REGISTER" : "LOGIN"}
          </h2>
        </div>

        <form onSubmit={handleAuth} className="space-y-3">
          <input
            name="email"
            type="email"
            placeholder="EMAIL"
            className="w-full bg-black/50 p-3 rounded-lg border border-white/10 text-white font-bold text-xs outline-none focus:border-[#d4af37] placeholder:text-white/30"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="PASSWORD"
            className="w-full bg-black/50 p-3 rounded-lg border border-white/10 text-white font-bold text-xs outline-none focus:border-[#d4af37] placeholder:text-white/30"
            required
          />
          
          {loginError && (
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-500 text-[10px] font-bold text-center">{loginError}</p>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all"
          >
            {isRegisterMode ? "SIGN UP" : "SIGN IN"}
          </button>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setLoginError('');
              }}
              className="text-[#d4af37] text-[10px] font-bold uppercase tracking-widest opacity-80 hover:opacity-100"
            >
              {isRegisterMode ? "← SIGN IN" : "REGISTER"}
            </button>
            
            {!isRegisterMode && (
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-white/40 text-[10px] font-bold uppercase tracking-widest hover:text-white/60"
              >
                FORGOT?
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  // Main App
  return (
    <div className={`min-h-screen pb-32 transition-all duration-300 ${
      isDarkMode 
        ? "bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] text-white" 
        : "bg-gradient-to-br from-amber-50 to-yellow-50 text-gray-900"
    }`}>
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[90] px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-full border border-yellow-500/30 backdrop-blur-xl text-[9px] font-bold flex items-center gap-1.5">
          <WifiOff size={12} />
          OFFLINE
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg shadow-2xl backdrop-blur-xl border flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-gradient-to-r from-green-500/20 to-emerald-600/20 text-green-500 border-green-500/30' :
          toast.type === 'error' ? 'bg-gradient-to-r from-red-500/20 to-rose-600/20 text-red-500 border-red-500/30' :
          'bg-gradient-to-r from-blue-500/20 to-cyan-600/20 text-blue-500 border-blue-500/30'
        }`}>
          {toast.type === 'success' && <CheckCircle2 size={14} />}
          {toast.type === 'error' && <AlertCircle size={14} />}
          <span className="font-bold text-[10px]">{toast.message}</span>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black/95 z-[1000] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] w-full max-w-xs p-4 rounded-xl border border-red-500/30">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-red-500/30">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-white font-black text-sm uppercase tracking-widest">Confirm Delete</h3>
              <p className="text-white/40 text-[10px] mt-1">This action cannot be undone!</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white font-black rounded-lg uppercase text-[10px] tracking-widest hover:opacity-90"
              >
                DELETE
              </button>
              <button
                onClick={() => setShowDeleteConfirm({ show: false, id: null, type: '', name: '' })}
                className="flex-1 py-2.5 bg-gradient-to-br from-[#333] to-[#444] text-white/60 font-black rounded-lg uppercase text-[10px] tracking-widest border border-white/10"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`p-3 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl border-b ${
        isDarkMode ? "bg-black/90 border-[#d4af37]/20" : "bg-white/95 border-[#d4af37]/30"
      }`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAsaGame(true)}
            className={`p-2 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-lg text-black transform hover:scale-105 transition-all`}
          >
            <Crown size={16} />
          </button>
          <div>
            <h1 className="font-black text-sm uppercase text-[#d4af37]">
              {data.settings.company || "MONARCH"}
            </h1>
            <p className={`text-[8px] font-bold uppercase ${isDarkMode ? 'text-white/40' : 'text-gray-600'}`}>
              {data.settings.name || "REP"}
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-lg border transition-all ${
              isDarkMode 
                ? "bg-white/5 text-[#d4af37] border-white/10 hover:bg-[#d4af37]/20" 
                : "bg-amber-100 text-amber-700 border-amber-200"
            }`}
          >
            {isDarkMode ? <Sun size={14}/> : <Moon size={14}/>}
          </button>
          <button
            onClick={() => setShowModal('expense')}
            className={`p-2 rounded-lg border transition-all ${
              isDarkMode 
                ? "bg-white/5 text-[#d4af37] border-white/10 hover:bg-[#d4af37]/20" 
                : "bg-amber-100 text-amber-700 border-amber-200"
            }`}
          >
            <CreditCard size={14}/>
          </button>
          <button
            onClick={() => signOut(auth)}
            className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 hover:bg-red-500/20"
          >
            <LogOut size={14}/>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 max-w-lg mx-auto space-y-3" style={{ fontSize: '0.75rem' }}>

        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3">

            {/* Today's Revenue Card */}
            <div className="bg-gradient-to-br from-[#d4af37] to-[#b8860b] p-4 rounded-xl text-black relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[9px] font-black uppercase opacity-70 mb-0.5 tracking-widest">TODAY</p>
                <h2 className="text-2xl font-black tracking-tight">Rs.{stats.daily.totalSales.toLocaleString()}</h2>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 bg-black/10 px-2 py-1 rounded-full">
                    <Target size={10} />
                    <span className="text-[8px] font-black uppercase">TOP: {stats.daily.topBrand}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black uppercase opacity-70">EXPENSES</p>
                    <p className="text-xs font-black text-red-800">Rs.{stats.expenses.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Progress Card - UNITS */}
            {stats.monthlyTargetUnits > 0 && (
              <div className={`p-4 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30" : "bg-white border-[#d4af37]/30"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Award size={14} className="text-[#d4af37]" />
                    <h3 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Monthly Target</h3>
                  </div>
                  <span className="text-[9px] font-black">
                    {stats.monthlyUnits} / {stats.monthlyTargetUnits} units
                  </span>
                </div>
                
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.targetProgress, 100)}%` }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black opacity-70">
                    {stats.targetProgress.toFixed(1)}% Complete
                  </span>
                  <span className="text-[8px] font-black text-red-500">
                    {stats.targetRemaining} units left
                  </span>
                </div>
                
                <button
                  onClick={() => setShowModal('target')}
                  className="mt-3 w-full py-2 bg-white/10 rounded-lg text-[8px] font-black uppercase hover:bg-white/20"
                >
                  + ADD TARGET
                </button>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5" : "bg-white border-gray-200"
              }`}>
                <p className="text-[8px] font-black uppercase opacity-50 mb-1">UNITS</p>
                <p className="text-base font-black text-[#d4af37]">{stats.daily.totalUnits}</p>
              </div>
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5" : "bg-white border-gray-200"
              }`}>
                <p className="text-[8px] font-black uppercase opacity-50 mb-1">EXPENSE</p>
                <p className="text-base font-black text-red-500">Rs.{stats.expenses}</p>
              </div>
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5" : "bg-white border-gray-200"
              }`}>
                <p className="text-[8px] font-black uppercase opacity-50 mb-1">NOTES</p>
                <p className="text-base font-black text-[#d4af37]">{stats.notes}</p>
              </div>
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5" : "bg-white border-gray-200"
              }`}>
                <p className="text-[8px] font-black uppercase opacity-50 mb-1">ORDERS</p>
                <p className="text-base font-black text-[#d4af37]">{stats.daily.summary.length}</p>
              </div>
            </div>

            {/* Today's Sales */}
            <div className={`p-4 rounded-xl border ${
              isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Today's Sales</h3>
                <TrendingUp size={14} className="text-[#d4af37] opacity-60" />
              </div>

              <div className="space-y-2">
                {stats.daily.summary.slice(0, 3).map((item, index) => (
                  <div key={index} className={`p-2 rounded-lg border flex justify-between items-center ${
                    isDarkMode ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-100"
                  }`}>
                    <div>
                      <p className="text-[9px] font-black uppercase">{item.name}</p>
                      <p className="text-[7px] opacity-50 mt-0.5">{item.units} units</p>
                    </div>
                    <p className="text-xs font-black text-[#d4af37]">Rs.{item.revenue.toLocaleString()}</p>
                  </div>
                ))}
                {stats.daily.summary.length === 0 && (
                  <p className="text-center py-3 text-[9px] opacity-30 italic">No sales today</p>
                )}
              </div>
            </div>

            {/* Today's Expenses */}
            {stats.todayExpenses.length > 0 && (
              <div className={`p-4 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Today's Expenses</h3>
                  <Fuel size={14} className="text-[#d4af37] opacity-60" />
                </div>

                <div className="space-y-2">
                  {Object.entries(stats.dailyExpensesByType).map(([type, amount]) => (
                    <div key={type} className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        {type === 'fuel' && <Fuel size={12} className="text-red-500" />}
                        {type === 'food' && <Coffee size={12} className="text-amber-500" />}
                        {type === 'transport' && <Navigation size={12} className="text-blue-500" />}
                        <span className="text-[8px] font-black uppercase">{type}</span>
                      </div>
                      <span className="text-xs font-black text-red-500">Rs.{amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SHOPS TAB ===== */}
        {activeTab === 'shops' && (
          <div className="space-y-3">
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
            }`}>
              <Search size={14} className="opacity-30"/>
              <input
                value={shopSearch}
                onChange={(e) => setShopSearch(e.target.value)}
                placeholder="SEARCH SHOP"
                className="bg-transparent text-[9px] font-black uppercase outline-none w-full placeholder:opacity-30"
                style={{ color: isDarkMode ? 'white' : 'black' }}
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedRouteFilter('ALL')}
                className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase whitespace-nowrap border ${
                  selectedRouteFilter === 'ALL'
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]'
                    : isDarkMode ? 'bg-white/5 border-white/10 text-white/60' : 'bg-gray-100 border-gray-200 text-gray-600'
                }`}
              >
                ALL
              </button>
              {data.routes.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteFilter(r.name)}
                  className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase whitespace-nowrap border ${
                    selectedRouteFilter === r.name
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]'
                      : isDarkMode ? 'bg-white/5 border-white/10 text-white/60' : 'bg-gray-100 border-gray-200 text-gray-600'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              {filteredShops.map(s => {
                const shopStats = getShopStats(s.id);
                const shopProfile = getShopProfile(s.id);
                
                return (
                  <div key={s.id} className={`p-3 rounded-xl border ${
                    isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/5" : "bg-white border-gray-200"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-[#d4af37]/10 rounded-lg text-[#d4af37]">
                          <Store size={14} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase">{s.name}</h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={8} className="opacity-40" />
                            <p className="text-[7px] font-bold uppercase opacity-60">{s.area}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[7px]">
                              <span className="opacity-50">Rs.</span>
                              <span className="font-black text-[#d4af37] ml-0.5">{shopStats.totalSales.toLocaleString()}</span>
                            </span>
                            {shopProfile && (
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => confirmDelete(s.id, 'shop', s.name)}
                          className="p-1.5 text-red-500/30 hover:text-red-500 hover:bg-red-500/10 rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          onClick={() => { setSelectedShop(s); setShowModal('invoice'); }}
                          className="px-2 py-1 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black rounded text-[7px] font-black uppercase"
                        >
                          BILL
                        </button>
                        <button
                          onClick={() => { 
                            setSelectedShop(s);
                            setSelectedShopProfile(getShopProfile(s.id));
                            setShopDetailsView(s);
                            setActiveTab('shop-details');
                          }}
                          className="px-2 py-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded text-[7px] font-black uppercase"
                        >
                          INFO
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== SHOP DETAILS TAB ===== */}
        {activeTab === 'shop-details' && shopDetailsView && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab('shops');
                  setShopDetailsView(null);
                }}
                className={`p-1.5 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-100'}`}
              >
                <ChevronLeft size={14} />
              </button>
              <h2 className="text-sm font-black text-[#d4af37] uppercase">Shop Info</h2>
            </div>

            <div className={`p-4 rounded-xl border ${
              isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30" : "bg-white border-[#d4af37]/30"
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-[#d4af37]/20 rounded-xl">
                  <Store size={20} className="text-[#d4af37]" />
                </div>
                <div>
                  <h1 className="text-base font-black uppercase">{shopDetailsView.name}</h1>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="opacity-50" />
                    <p className="text-[8px] opacity-70 uppercase font-bold">{shopDetailsView.area}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Profile Icons */}
            {selectedShopProfile && (
              <div className={`p-4 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <Briefcase size={14} className="text-[#d4af37]" />
                  <h3 className="text-xs font-black text-[#d4af37] uppercase">Profile</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[8px]">
                  {selectedShopProfile.ownerName && (
                    <div className="flex items-center gap-1">
                      <User size={10} className="opacity-50" />
                      <span className="font-bold uppercase">{selectedShopProfile.ownerName}</span>
                    </div>
                  )}
                  {selectedShopProfile.phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={10} className="opacity-50" />
                      <span>{selectedShopProfile.phone}</span>
                    </div>
                  )}
                  {selectedShopProfile.gst && (
                    <div className="flex items-center gap-1">
                      <FileText size={10} className="opacity-50" />
                      <span className="uppercase">{selectedShopProfile.gst}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5" : "bg-gray-50 border-gray-100"
              }`}>
                <p className="text-[7px] font-black uppercase opacity-50">TOTAL SALES</p>
                <p className="text-sm font-black text-[#d4af37]">Rs.{getShopStats(shopDetailsView.id).totalSales.toLocaleString()}</p>
              </div>
              <div className={`p-3 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5" : "bg-gray-50 border-gray-100"
              }`}>
                <p className="text-[7px] font-black uppercase opacity-50">TOTAL UNITS</p>
                <p className="text-sm font-black text-[#d4af37]">{getShopStats(shopDetailsView.id).totalUnits}</p>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
            }`}>
              <Calendar size={14} className="text-[#d4af37]"/>
              <input
                type="date"
                className="bg-transparent text-[9px] font-black uppercase outline-none w-full"
                onChange={(e) => setSearchDate(e.target.value)}
                value={searchDate}
                style={{ color: isDarkMode ? 'white' : 'black' }}
              />
            </div>

            {data.orders.filter(o => {
              try {
                return new Date(o.timestamp).toISOString().split('T')[0] === searchDate;
              } catch { return false; }
            }).map(o => (
              <div key={o.id} className={`p-4 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/5" : "bg-white border-gray-200"
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-[9px] font-black uppercase text-[#d4af37]">{o.shopName}</h4>
                    <p className="text-[7px] opacity-50">{new Date(o.timestamp).toLocaleTimeString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => printBill(o)} className="p-1 text-blue-500/50 hover:text-blue-500">
                      <Printer size={12} />
                    </button>
                    <button onClick={() => shareToWhatsApp(o)} className="p-1 text-[#d4af37]/50 hover:text-[#d4af37]">
                      <Share2 size={12} />
                    </button>
                    <button onClick={() => confirmDelete(o.id, 'order', '')} className="p-1 text-red-500/30 hover:text-red-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div className="text-[8px] font-black text-right">
                  Rs.{o.total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className={`p-3 rounded-xl border flex items-center gap-2 ${
              isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
            }`}>
              <Calendar size={14} className="text-[#d4af37]"/>
              <input
                type="date"
                className="bg-transparent text-[9px] font-black uppercase outline-none w-full"
                onChange={(e) => setNoteSearchDate(e.target.value)}
                value={noteSearchDate}
                style={{ color: isDarkMode ? 'white' : 'black' }}
              />
              <button
                onClick={() => setShowModal('note')}
                className="px-2 py-1 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black rounded text-[7px] font-black uppercase"
              >
                ADD
              </button>
            </div>

            {filteredNotes.map(note => (
              <div key={note.id} className={`p-4 rounded-xl border ${
                isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/5" : "bg-white border-gray-200"
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={12} className="text-[#d4af37]" />
                    <span className="text-[7px] opacity-50">
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <button onClick={() => confirmDelete(note.id, 'note', '')} className="p-1 text-red-500/30 hover:text-red-500">
                    <Trash2 size={10} />
                  </button>
                </div>
                <p className="text-[9px] leading-relaxed">{note.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-3 pb-12">
            {/* Profile */}
            <form onSubmit={handleSaveProfile} className={`p-4 rounded-xl border space-y-3 ${
              isDarkMode ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" : "bg-white border-gray-200"
            }`}>
              <h3 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Profile</h3>
              <input
                name="repName"
                defaultValue={data.settings.name}
                placeholder="NAME"
                className={`w-full p-2 rounded-lg border text-[9px] font-black uppercase outline-none focus:border-[#d4af37] ${
                  isDarkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
                }`}
              />
              <input
                name="companyName"
                defaultValue={data.settings.company}
                placeholder="COMPANY"
                className={`w-full p-2 rounded-lg border text-[9px] font-black uppercase outline-none focus:border-[#d4af37] ${
                  isDarkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50 border-gray-200'
                }`}
              />
              <button type="submit" className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black rounded-lg text-[8px] uppercase">
                SAVE
              </button>
            </form>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setShowModal('route')} className={`p-3 rounded-xl border text-[#d4af37] font-black uppercase text-[8px] flex flex-col items-center gap-1 ${
                isDarkMode ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5' : 'bg-gray-50 border-gray-200'
              }`}>
                <MapPin size={16} /> ROUTE
              </button>
              <button onClick={() => setShowModal('brand')} className={`p-3 rounded-xl border text-[#d4af37] font-black uppercase text-[8px] flex flex-col items-center gap-1 ${
                isDarkMode ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5' : 'bg-gray-50 border-gray-200'
              }`}>
                <Package size={16} /> BRAND
              </button>
              <button onClick={() => setShowModal('target')} className={`p-3 rounded-xl border text-[#d4af37] font-black uppercase text-[8px] flex flex-col items-center gap-1 ${
                isDarkMode ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5' : 'bg-gray-50 border-gray-200'
              }`}>
                <Target size={16} /> TARGET
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-3 inset-x-3 h-12 rounded-xl border flex items-center justify-around z-50 ${
        isDarkMode ? "bg-black/95 border-white/10 backdrop-blur-xl" : "bg-white/95 border-gray-200 backdrop-blur-xl"
      }`}>
        {[
          {id: 'dashboard', icon: Home, label: 'HOME'},
          {id: 'shops', icon: Store, label: 'SHOPS'},
          {id: 'history', icon: History, label: 'HISTORY'},
          {id: 'notes', icon: BookOpen, label: 'NOTES'},
          {id: 'settings', icon: Settings, label: 'MORE'}
        ].map(t => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              if (t.id === 'shops') setShopDetailsView(null);
            }}
            className={`p-1.5 transition-all relative flex flex-col items-center ${
              activeTab === t.id ? 'text-[#d4af37]' : isDarkMode ? 'text-white/30' : 'text-gray-400'
            }`}
          >
            <t.icon size={16} />
            <span className="text-[6px] font-black uppercase mt-0.5">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals - Simplified */}
      {showModal === 'expense' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-4 rounded-xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#d4af37]/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-[#d4af37] uppercase">Add Expense</h3>
              <button onClick={() => setShowModal(null)} className="p-1 text-white/30 hover:text-white/60">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-1">
                {['fuel', 'food', 'transport', 'other'].map(t => (
                  <button
                    key={t}
                    onClick={() => setExpenseType(t)}
                    className={`p-2 rounded-lg border text-[8px] font-black uppercase ${
                      expenseType === t ? 'bg-[#d4af37] text-black border-[#d4af37]' : 'bg-white/5 border-white/10 text-white/60'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="AMOUNT"
                className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-xs font-black text-center"
              />
              <button
                onClick={saveExpense}
                disabled={isSavingExpense}
                className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[8px] uppercase"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal === 'target' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-4 rounded-xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#d4af37]/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-[#d4af37] uppercase">Add Target</h3>
              <button onClick={() => setShowModal(null)} className="p-1 text-white/30 hover:text-white/60">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={saveMonthlyTarget} className="space-y-3">
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-[9px] font-black"
              />
              <input
                type="number"
                value={targetUnits}
                onChange={(e) => setTargetUnits(e.target.value)}
                placeholder="TARGET UNITS"
                className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-xs font-black text-center"
              />
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[8px] uppercase"
              >
                ADD TARGET
              </button>
            </form>
          </div>
        </div>
      )}

      {showModal === 'brand' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-4 rounded-xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#d4af37]/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-[#d4af37] uppercase">Add Brand</h3>
              <button onClick={() => setShowModal(null)} className="p-1 text-white/30 hover:text-white/60">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={addBrandWithSequence} className="space-y-3">
              <input
                name="name"
                placeholder="BRAND NAME"
                className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-[9px] font-black uppercase"
                required
              />
              <input
                name="size"
                placeholder="SIZE"
                className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-[9px] font-black uppercase"
                required
              />
              <input
                name="price"
                type="number"
                placeholder="PRICE"
                className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-[9px] font-black"
                required
              />
              {brandError && (
                <p className="text-red-500 text-[8px] font-bold text-center">{brandError}</p>
              )}
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[8px] uppercase"
              >
                ADD BRAND
              </button>
            </form>
          </div>
        </div>
      )}

      {showModal === 'route' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-4 rounded-xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#d4af37]/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-[#d4af37] uppercase">Add Route</h3>
              <button onClick={() => setShowModal(null)} className="p-1 text-white/30 hover:text-white/60">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await addDoc(collection(db, 'routes'), {
                name: e.target.name.value.toUpperCase(),
                userId: user.uid,
                timestamp: Date.now()
              });
              showToast("✅ Route added");
              setShowModal(null);
            }} className="space-y-3">
              <input
                name="name"
                placeholder="ROUTE NAME"
                className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-[9px] font-black uppercase"
                required
              />
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[8px] uppercase"
              >
                ADD ROUTE
              </button>
            </form>
          </div>
        </div>
      )}

      {showModal === 'shop' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-4 rounded-xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#d4af37]/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-[#d4af37] uppercase">Add Shop</h3>
              <button onClick={() => setShowModal(null)} className="p-1 text-white/30 hover:text-white/60">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await addDoc(collection(db, 'shops'), {
                name: e.target.name.value.toUpperCase(),
                area: e.target.area.value,
                userId: user.uid,
                timestamp: Date.now()
              });
              showToast("✅ Shop added");
              setShowModal(null);
            }} className="space-y-3">
              <input
                name="name"
                placeholder="SHOP NAME"
                className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-[9px] font-black uppercase"
                required
              />
              <select
                name="area"
                className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-[9px] font-black uppercase"
                required
              >
                <option value="">SELECT ROUTE</option>
                {data.routes.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[8px] uppercase"
              >
                ADD SHOP
              </button>
            </form>
          </div>
        </div>
      )}

      {showModal === 'note' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-4 rounded-xl bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-[#d4af37]/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-[#d4af37] uppercase">Add Note</h3>
              <button onClick={() => setShowModal(null)} className="p-1 text-white/30 hover:text-white/60">
                <X size={16} />
              </button>
            </div>
            <textarea
              value={repNote}
              onChange={(e) => setRepNote(e.target.value)}
              placeholder="NOTE"
              rows={3}
              className="w-full p-2 bg-black/50 rounded-lg border border-white/10 text-white text-[9px] outline-none resize-none"
            />
            <button
              onClick={saveNote}
              disabled={isSavingNote}
              className="w-full mt-3 py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[8px] uppercase"
            >
              SAVE
            </button>
          </div>
        </div>
      )}

      {showModal === 'invoice' && selectedShop && (
        <div className="fixed inset-0 bg-black z-[100] overflow-y-auto">
          <div className="min-h-screen p-3 max-w-lg mx-auto pb-24">
            <div className="flex justify-between items-center mb-3 sticky top-0 bg-black/95 py-2 border-b border-white/10">
              <h2 className="text-sm font-black uppercase text-[#d4af37]">{selectedShop.name}</h2>
              <button onClick={() => { setShowModal(null); setCart({}); }} className="p-1.5 bg-white/10 rounded-full">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {data.brands.map((b, index) => (
                <div key={b.id} className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] p-2 rounded-lg border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#d4af37]/20 rounded flex items-center justify-center text-[#d4af37] text-xs font-black">
                      {b.sequence || index + 1}
                    </div>
                    <div>
                      <h4 className="text-[9px] font-black uppercase text-white">{b.name} ({b.size})</h4>
                      <p className="text-[8px] text-[#d4af37] font-bold">Rs.{b.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1)}} className="w-6 h-6 bg-white/5 rounded text-white text-xs">-</button>
                    <input type="number" value={cart[b.id] || ''} onChange={(e) => setCart({...cart, [b.id]: e.target.value})} className="w-8 bg-transparent text-center font-black text-[#d4af37] text-xs outline-none" placeholder="0" />
                    <button onClick={() => setCart({...cart, [b.id]: (Number(cart[b.id])||0)+1})} className="w-6 h-6 bg-white/5 rounded text-white text-xs">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="fixed bottom-0 inset-x-0 p-3 bg-black/95 border-t border-white/10">
              <div className="max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[8px] font-black uppercase opacity-50">TOTAL</span>
                  <span className="text-base font-black text-[#d4af37]">Rs.{calculateCartTotal().toLocaleString()}</span>
                </div>
                <button onClick={handleCreateOrder} className="w-full py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[8px] uppercase">
                  CONFIRM ORDER
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal === 'preview' && lastOrder && (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] w-full max-w-xs p-4 rounded-xl border border-[#d4af37]/30">
            <div className="text-center mb-3">
              <CheckCircle2 size={24} className="text-green-500 mx-auto mb-2" />
              <h3 className="text-sm font-black text-white uppercase">Bill Confirmed!</h3>
            </div>
            <div className="space-y-2">
              <button onClick={() => { printBill(lastOrder); setShowModal(null); }} className="w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black rounded-lg text-[8px] uppercase">
                PRINT
              </button>
              <button onClick={() => shareToWhatsApp(lastOrder)} className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[8px] uppercase">
                SHARE
              </button>
              <button onClick={() => { setShowModal(null); setLastOrder(null); }} className="w-full py-2 bg-white/5 text-white/60 font-black rounded-lg text-[8px] uppercase">
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintPreview && printOrder && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] w-full max-w-xs p-4 rounded-xl border border-[#d4af37]/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-[#d4af37] uppercase">Print Bill</h3>
              <button onClick={() => setShowPrintPreview(false)} className="p-1 text-white/30 hover:text-white/60">
                <X size={16} />
              </button>
            </div>
            <div className="bg-white p-3 rounded-lg mb-3 text-black">
              <div className="text-center border-b pb-2 mb-2">
                <div className="text-sm font-bold text-[#d4af37]">{printOrder.companyName}</div>
                <div className="text-xs font-bold">{printOrder.shopName}</div>
              </div>
              <div className="text-[8px]">
                {printOrder.items?.map((item, i) => (
                  <div key={i} className="flex justify-between py-0.5">
                    <span>{item.name}</span>
                    <span>{item.qty} x {item.price} = Rs.{item.subtotal}</span>
                  </div>
                ))}
              </div>
              <div className="border-t mt-2 pt-2 text-right text-xs font-bold">
                Total: Rs.{printOrder.total.toLocaleString()}
              </div>
            </div>
            <button
              onClick={() => { handlePrint(printOrder); setShowPrintPreview(false); }}
              className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[8px] uppercase"
            >
              PRINT
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress {
          animation: progress 1s ease-in-out;
        }
        input, button, select, textarea {
          font-size: 14px !important;
        }
        @media (max-width: 640px) {
          .text-xs { font-size: 0.65rem !important; }
          .text-sm { font-size: 0.7rem !important; }
          .text-base { font-size: 0.75rem !important; }
          .text-lg { font-size: 0.85rem !important; }
        }
        button {
          min-height: 40px;
          min-width: 40px;
        }
        .grid-cols-20 {
          grid-template-columns: repeat(20, minmax(0, 1fr));
        }
      `}</style>
    </div>
  );
}
