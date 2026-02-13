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
import { getFirestore, doc, collection, onSnapshot, addDoc, deleteDoc, query, where, enableIndexedDbPersistence, setDoc, updateDoc, disableNetwork, enableNetwork } from 'firebase/firestore';
import {
  LayoutDashboard, Store, Plus, X, Trash2, Crown, Settings, LogOut,
  MapPin, Package, History, Calendar, Sun, Moon, Save, Star, Search,
  CheckCircle2, ChevronDown, Share2, TrendingUp, Edit2, Calculator,
  ShoppingBag, DollarSign, Fuel, FileText, Navigation, AlertCircle,
  CreditCard, Coffee, Target, Percent, BarChart3, Hash, Package2,
  BookOpen, Filter, Eye, Clock, Download, Mail, Lock, User, Printer,
  Wifi, WifiOff, Award, Briefcase, Activity, Gamepad2, Phone,
  TrendingUp as TrendingIcon, ShoppingCart, Truck, Gift, Zap, Info,
  Receipt, Wallet, BadgePercent, Box, Circle, Square, Triangle,
  RotateCcw, Volume2, VolumeX, Trophy, Timer, Users, Shield
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
  // ========== STATE VARIABLES ==========
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
  const [showModal, setShowModal] = useState(null);
  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteSearchDate, setNoteSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [lastOrder, setLastOrder] = useState(null);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [shopSearch, setShopSearch] = useState('');
  const [selectedRouteFilter, setSelectedRouteFilter] = useState('ALL');
  const [manualItems, setManualItems] = useState([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
  const [editingBrand, setEditingBrand] = useState(null);
  
  // Calculator State - Fixed
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
  
  // Target States - Enhanced
  const [targetAmount, setTargetAmount] = useState('');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [targetType, setTargetType] = useState('revenue');
  const [targetCase, setTargetCase] = useState('units'); // For case targets (6x75cl, etc.)
  const [targetBrand, setTargetBrand] = useState('');
  const [targetSpecific, setTargetSpecific] = useState('total'); // 'total' or 'brand'
  
  // Shop Profile States - Enhanced
  const [shopProfileForm, setShopProfileForm] = useState({
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    gst: '',
    notes: '',
    creditLimit: '',
    paymentTerms: '',
    shopType: 'retail',
    location: ''
  });
  const [editingProfile, setEditingProfile] = useState(null);
  
  // Game State - Enhanced Mobile Game
  const [showGame, setShowGame] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [gameHighScore, setGameHighScore] = useState(0);
  const [gameTargets, setGameTargets] = useState([]);
  const [gameActive, setGameActive] = useState(false);
  const [gameTimeLeft, setGameTimeLeft] = useState(30);
  const [gameLevel, setGameLevel] = useState(1);
  const [gameSound, setGameSound] = useState(true);
  const [gameCombo, setGameCombo] = useState(0);
  const [gameBestCombo, setGameBestCombo] = useState(0);
  
  // View States
  const [viewingShopProfile, setViewingShopProfile] = useState(null);
  const [viewingShopOrders, setViewingShopOrders] = useState(null);
  const [viewingOrderDetails, setViewingOrderDetails] = useState(null);
  const [showShopProfileMenu, setShowShopProfileMenu] = useState(null); // For profile menu popup

  // ========== NETWORK STATUS LISTENER ==========
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      enableNetwork(db).then(() => {
        showToast("📶 Back online - Syncing data...", "success");
        syncPendingOrders();
      }).catch(err => console.error("Error enabling network:", err));
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      disableNetwork(db).catch(err => console.error("Error disabling network:", err));
      showToast("📴 Offline mode - Changes saved locally", "info");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ========== TOAST NOTIFICATION ==========
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ========== SPLASH SCREEN & AUTH LISTENER ==========
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

  // ========== LOAD HIGH SCORE ==========
  useEffect(() => {
    try {
      const saved = localStorage.getItem('monarchGameHighScore');
      if (saved) setGameHighScore(parseInt(saved));
      const savedCombo = localStorage.getItem('monarchGameBestCombo');
      if (savedCombo) setGameBestCombo(parseInt(savedCombo));
    } catch (err) {
      console.error("Error loading game data:", err);
    }
  }, []);

  // ========== REAL-TIME DATA FETCHING ==========
  useEffect(() => {
    if (!user) return;

    const unsubscribeFunctions = [];

    try {
      const collections = ['routes', 'shops', 'orders', 'brands', 'expenses', 'notes', 'locations', 'targets', 'shopProfiles'];

      collections.forEach(collectionName => {
        try {
          const q = query(
            collection(db, collectionName),
            where("userId", "==", user.uid)
          );

          const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            items.sort((a, b) => {
              const timeA = a.timestamp || 0;
              const timeB = b.timestamp || 0;
              return timeB - timeA;
            });

            if (collectionName === 'brands') {
              items.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
            }

            setData(prev => ({
              ...prev,
              [collectionName]: items
            }));
            
            localStorage.setItem(`${collectionName}_${user.uid}`, JSON.stringify(items));
          }, (error) => {
            console.error(`Error fetching ${collectionName}:`, error);
            const cached = localStorage.getItem(`${collectionName}_${user.uid}`);
            if (cached) {
              try {
                setData(prev => ({
                  ...prev,
                  [collectionName]: JSON.parse(cached)
                }));
              } catch (e) {
                console.error("Error parsing cached data:", e);
              }
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
          if (unsub) unsub();
        } catch (error) {
          console.error("Error unsubscribing:", error);
        }
      });
    };
  }, [user]);

  // ========== SYNC PENDING ORDERS ==========
  const syncPendingOrders = async () => {
    try {
      const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
      for (const order of pending) {
        try {
          await addDoc(collection(db, 'orders'), {
            ...order,
            timestamp: Date.now()
          });
          showToast("✅ Synced order for " + order.shopName, "success");
        } catch (err) {
          console.error("Sync failed:", err);
        }
      }
      localStorage.removeItem('pendingOrders');
      setPendingOrders([]);
    } catch (err) {
      console.error("Error syncing pending orders:", err);
    }
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
            name: `${data.settings.name || 'Rep'} Location`,
            timestamp: Date.now()
          };

          if (isOffline) {
            const cached = JSON.parse(localStorage.getItem(`locations_${user.uid}`) || '[]');
            cached.unshift({ ...locationData, id: 'temp_' + Date.now() });
            localStorage.setItem(`locations_${user.uid}`, JSON.stringify(cached));
            showToast("📍 Location saved offline", "info");
          } else {
            addDoc(collection(db, 'locations'), locationData)
              .then(() => showToast("📍 Location saved successfully!", "success"))
              .catch(err => showToast("Error saving location: " + err.message, "error"));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          let errorMsg = "Location access denied";
          if (error.code === 1) errorMsg = "Location permission denied";
          if (error.code === 2) errorMsg = "Location unavailable";
          if (error.code === 3) errorMsg = "Location request timeout";
          showToast(errorMsg, "error");
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
        note: expenseNote || '',
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
        setLastOrder(orderData);
        setShowModal('preview');
        setManualItems([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
      } else {
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        setLastOrder({ ...orderData, id: docRef.id });
        setShowModal('preview');
        setManualItems([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
        showToast("✅ Order saved successfully!", "success");
      }
    } catch (err) {
      showToast("Error saving order: " + err.message, "error");
    }
  };

  // ========== CALCULATOR - FIXED ==========
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

    showToast(`💰 Grand Total: Rs.${grandTotal.toLocaleString()}`, "info");
  };

  // Fixed: Clear placeholder when typing
  const handleInputFocus = (e) => {
    if (e.target.value === '0') {
      e.target.value = '';
    }
  };

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

  // ========== FORGOT PASSWORD ==========
  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      showToast("Please enter your email address", "error");
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
      }
      showToast(errorMessage, "error");
    } finally {
      setIsSendingReset(false);
    }
  };

  // ========== SHOP STATISTICS ==========
  const getShopStats = (shopId) => {
    if (!shopId) return { totalSales: 0, orderCount: 0, lastOrder: null, items: {} };
    
    const shopOrders = data.orders.filter(o => o.shopId === shopId);
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

  // ========== GET SHOP PROFILE ==========
  const getShopProfile = (shopId) => {
    return data.shopProfiles?.find(p => p.shopId === shopId);
  };

  // ========== SAVE SHOP PROFILE - ENHANCED ==========
  const saveShopProfile = async (e) => {
    e.preventDefault();
    if (!user || !selectedShop) {
      showToast("Select a shop first!", "error");
      return;
    }
    
    try {
      const profileData = {
        userId: user.uid,
        shopId: selectedShop.id,
        shopName: selectedShop.name,
        ownerName: shopProfileForm.ownerName?.toUpperCase() || '',
        phone: shopProfileForm.phone || '',
        email: shopProfileForm.email || '',
        address: shopProfileForm.address || '',
        gst: shopProfileForm.gst?.toUpperCase() || '',
        notes: shopProfileForm.notes || '',
        creditLimit: shopProfileForm.creditLimit || '',
        paymentTerms: shopProfileForm.paymentTerms || '',
        shopType: shopProfileForm.shopType || 'retail',
        location: shopProfileForm.location || '',
        timestamp: Date.now()
      };
      
      const existingProfile = data.shopProfiles?.find(p => p.shopId === selectedShop.id);
      
      if (existingProfile) {
        await updateDoc(doc(db, 'shopProfiles', existingProfile.id), profileData);
        showToast("✅ Shop profile updated!", "success");
      } else {
        await addDoc(collection(db, 'shopProfiles'), profileData);
        showToast("✅ Shop profile saved!", "success");
      }
      
      setShowModal(null);
      setEditingProfile(null);
      setShopProfileForm({
        ownerName: '',
        phone: '',
        email: '',
        address: '',
        gst: '',
        notes: '',
        creditLimit: '',
        paymentTerms: '',
        shopType: 'retail',
        location: ''
      });
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // ========== EDIT SHOP PROFILE ==========
  const editShopProfile = (profile) => {
    setShopProfileForm({
      ownerName: profile.ownerName || '',
      phone: profile.phone || '',
      email: profile.email || '',
      address: profile.address || '',
      gst: profile.gst || '',
      notes: profile.notes || '',
      creditLimit: profile.creditLimit || '',
      paymentTerms: profile.paymentTerms || '',
      shopType: profile.shopType || 'retail',
      location: profile.location || ''
    });
    setEditingProfile(profile);
    setShowModal('shopProfile');
  };

  // ========== VIEW SHOP PROFILE ==========
  const viewShopProfile = (shop) => {
    const profile = getShopProfile(shop.id);
    setViewingShopProfile({ shop, profile });
  };

  // ========== VIEW SHOP ORDERS ==========
  const viewShopOrders = (shop) => {
    const shopOrders = data.orders.filter(o => o.shopId === shop.id);
    const stats = getShopStats(shop.id);
    setViewingShopOrders({ shop, orders: shopOrders, stats });
  };

  // ========== STATISTICS ==========
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
              summary[itemName] = { units: 0, revenue: 0 };
            }
            summary[itemName].units += qty;
            summary[itemName].revenue += subtotal;
          });
        }
      });

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
        topBrand: topBrandByRevenue ? topBrandByRevenue[0] : 'N/A',
        topBrandRevenue: topBrandByRevenue ? topBrandByRevenue[1].revenue : 0,
        avgPrice: totalUnits > 0 ? totalSales / totalUnits : 0,
        allBrands: allBrandsSorted,
        topBrandUnits: topBrandByRevenue ? topBrandByRevenue[1].units : 0
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
    
    const monthlyExpenses = data.expenses.filter(e => {
      try {
        return e.date && e.date.startsWith(currentYear + '-' + String(currentMonth + 1).padStart(2, '0'));
      } catch {
        return false;
      }
    }).reduce((sum, e) => sum + (e.amount || 0), 0);

    const todayNotes = data.notes.filter(n => n.date === todayStr);
    
    const currentTarget = data.targets?.find(t => t.month === currentMonthStr) || { amount: 0, type: 'revenue', specific: 'total', case: 'units' };
    const monthlySales = monthlyOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const monthlyUnits = monthlyOrders.reduce((sum, o) => {
      let units = 0;
      if (o.items) o.items.forEach(i => units += i.qty || 0);
      return sum + units;
    }, 0);
    
    let targetValue = 0;
    if (currentTarget.specific === 'brand' && currentTarget.brand) {
      // Calculate target for specific brand
      targetValue = monthlyOrders.reduce((sum, o) => {
        if (o.items) {
          o.items.forEach(i => {
            if (i.name.includes(currentTarget.brand)) {
              if (currentTarget.type === 'revenue') {
                sum += i.subtotal || 0;
              } else {
                sum += i.qty || 0;
              }
            }
          });
        }
        return sum;
      }, 0);
    } else {
      targetValue = currentTarget.type === 'units' ? monthlyUnits : monthlySales;
    }
    
    const targetAmount = currentTarget.amount || 0;
    const targetProgress = targetAmount > 0 ? (targetValue / targetAmount) * 100 : 0;

    return {
      daily: getStats(dailyOrders),
      monthly: getStats(monthlyOrders),
      expenses: totalExpenses,
      monthlyExpenses: monthlyExpenses,
      notes: todayNotes.length,
      todayExpenses: todayExpenses,
      monthlySales: monthlySales,
      monthlyUnits: monthlyUnits,
      monthlyTarget: targetAmount,
      targetType: currentTarget.type || 'revenue',
      targetProgress: targetProgress,
      targetRemaining: Math.max(0, targetAmount - targetValue),
      targetSpecific: currentTarget.specific || 'total',
      targetBrand: currentTarget.brand || '',
      targetCase: currentTarget.case || 'units'
    };
  }, [data.orders, data.expenses, data.notes, data.targets]);

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
    return data.notes.filter(note => note.date === noteSearchDate);
  }, [data.notes, noteSearchDate]);

  // ========== MANUAL ITEMS HANDLERS ==========
  const addManualItem = () => {
    setManualItems([...manualItems, { name: '', qty: 1, price: 0, subtotal: 0 }]);
  };

  const updateManualItem = (index, field, value) => {
    const updated = [...manualItems];
    updated[index][field] = field === 'name' ? value.toUpperCase() : value;

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
    
    let html = `<!DOCTYPE html>
      <html>
      <head>
        <title>Bill - ${shopName}</title>
        <style>
          body { font-family: 'Courier New', monospace; margin: 0; padding: 10px; background: white; color: black; }
          .bill { max-width: 80mm; margin: 0 auto; padding: 10px; }
          .header { text-align: center; border-bottom: 2px dashed #d4af37; padding-bottom: 10px; margin-bottom: 10px; }
          .company { font-size: 18px; font-weight: bold; color: #d4af37; margin: 0; text-transform: uppercase; }
          .shop { font-size: 16px; font-weight: bold; margin: 5px 0; }
          .details { font-size: 11px; margin: 3px 0; }
          .items { width: 100%; border-collapse: collapse; margin: 10px 0; }
          .items th { border-bottom: 1px solid #000; padding: 5px; font-size: 11px; text-align: left; }
          .items td { padding: 5px; font-size: 11px; }
          .total { border-top: 2px solid #d4af37; margin-top: 10px; padding-top: 10px; text-align: right; font-size: 14px; font-weight: bold; }
          .footer { margin-top: 15px; text-align: center; font-size: 9px; color: #666; border-top: 1px dashed #d4af37; padding-top: 8px; }
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
            <tbody>`;

    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        html += `<tr>
                <td>${item.name || 'Item'}</td>
                <td>${item.qty || 0}</td>
                <td>Rs.${(item.price || 0).toLocaleString()}</td>
                <td>Rs.${(item.subtotal || 0).toLocaleString()}</td>
              </tr>`;
      });
    }

    html += `</tbody>
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
        <\/script>
      </body>
      </html>`;

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
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        showToast("🎉 Account created successfully!", "success");
        
        try {
          await setDoc(doc(db, "settings", userCredential.user.uid), {
            name: email.split('@')[0].toUpperCase(),
            company: "MONARCH",
            userId: userCredential.user.uid,
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
      let errorMessage = "❌ Login Failed";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMessage = "❌ Wrong Password or Email";
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = "❌ Too many failed attempts. Try again later";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = "❌ Email already registered. Try login instead";
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
        setCart({});
        setLastOrder(orderData);
        setShowModal('preview');
      } else {
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        setCart({});
        setLastOrder({ ...orderData, id: docRef.id });
        setShowModal('preview');
        showToast("✅ Order saved successfully!", "success");
      }
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
        sequence: sequence
      };

      if (isOffline) {
        const cached = JSON.parse(localStorage.getItem(`brands_${user.uid}`) || '[]');
        cached.unshift({ ...brandData, id: 'temp_' + Date.now() });
        cached.sort((a, b) => (a.sequence || 999) - (b.sequence || 999));
        localStorage.setItem(`brands_${user.uid}`, JSON.stringify(cached));
        showToast(`✅ Brand added offline (Number: ${sequence})`, "info");
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

  // ========== SAVE MONTHLY TARGET - ENHANCED ==========
  const saveMonthlyTarget = async (e) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const targetData = {
        userId: user.uid,
        month: targetMonth,
        amount: parseFloat(targetAmount),
        type: targetType,
        specific: targetSpecific,
        brand: targetSpecific === 'brand' ? targetBrand : '',
        case: targetCase,
        timestamp: Date.now()
      };
      
      const existingTarget = data.targets?.find(t => t.month === targetMonth);
      
      if (existingTarget) {
        await updateDoc(doc(db, 'targets', existingTarget.id), targetData);
        showToast(`✅ Target updated!`, "success");
      } else {
        await addDoc(collection(db, 'targets'), targetData);
        showToast(`✅ Target set!`, "success");
      }
      
      setTargetAmount('');
      setTargetBrand('');
      setShowModal(null);
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // ========== GAME FUNCTIONS - ENHANCED MOBILE GAME ==========
  const startGame = () => {
    setGameActive(true);
    setGameScore(0);
    setGameTimeLeft(30);
    setGameLevel(1);
    setGameCombo(0);
    
    const newTargets = [];
    for (let i = 0; i < 5 + gameLevel * 2; i++) {
      newTargets.push({
        id: i,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
        value: 10 * gameLevel,
        type: Math.random() > 0.3 ? 'coin' : 'bonus'
      });
    }
    setGameTargets(newTargets);
  };

  useEffect(() => {
    let timer;
    if (gameActive && gameTimeLeft > 0) {
      timer = setTimeout(() => {
        setGameTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (gameTimeLeft === 0) {
      endGame();
    }
    return () => clearTimeout(timer);
  }, [gameActive, gameTimeLeft]);

  const endGame = () => {
    setGameActive(false);
    if (gameScore > gameHighScore) {
      setGameHighScore(gameScore);
      localStorage.setItem('monarchGameHighScore', gameScore);
    }
    if (gameCombo > gameBestCombo) {
      setGameBestCombo(gameCombo);
      localStorage.setItem('monarchGameBestCombo', gameCombo);
    }
    showToast(`🎮 Game Over! Score: ${gameScore}`, "info");
  };

  const handleTargetClick = (id, type) => {
    if (!gameActive) return;
    
    let points = type === 'bonus' ? 20 * gameLevel : 10 * gameLevel;
    setGameScore(prev => prev + points);
    setGameCombo(prev => prev + 1);
    
    if (gameSound) {
      // Play sound effect (using vibration for mobile)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
    
    setGameTargets(prev => prev.filter(t => t.id !== id));
    
    // Add new target
    const newTarget = {
      id: Date.now() + Math.random(),
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      value: 10 * gameLevel,
      type: Math.random() > 0.3 ? 'coin' : 'bonus'
    };
    setGameTargets(prev => [...prev, newTarget]);
    
    // Level up every 100 points
    if (gameScore > 100 * gameLevel) {
      setGameLevel(prev => prev + 1);
      showToast(`🎯 Level ${gameLevel + 1}!`, "success");
    }
  };

  // ========== RENDER ==========
  if (isSplash || loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-black via-[#1a1a1a] to-[#2d2d2d] flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#d4af37] rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#b8860b] rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <button 
          onClick={() => {
            setShowGame(true);
            setIsSplash(false);
          }}
          className="relative z-10 transform hover:scale-110 transition-all duration-300"
        >
          <div className="relative">
            <Crown size={80} className="text-[#d4af37] animate-pulse" />
            <Gift size={25} className="text-white absolute -top-2 -right-2 animate-bounce" />
          </div>
        </button>
        
        <h1 className="mt-6 text-[#d4af37] text-4xl font-black tracking-widest italic uppercase relative z-10">
          MONARCH
        </h1>
        <p className="mt-2 text-white/50 text-sm uppercase tracking-widest relative z-10">
          Sales & Target Manager
        </p>
        <p className="mt-1 text-[#d4af37]/40 text-[10px] uppercase tracking-widest relative z-10">
          Tap the crown for a surprise!
        </p>
        
        <div className="mt-8 w-56 h-1.5 bg-white/10 rounded-full overflow-hidden relative z-10">
          <div className="h-full bg-gradient-to-r from-[#d4af37] via-[#f5e7a3] to-[#b8860b] animate-progress"></div>
        </div>
        
        <div className="absolute bottom-10 left-0 right-0 text-center text-white/20 text-[10px] uppercase tracking-widest">
          Monarch Pro v2.0
        </div>
      </div>
    );
  }

  if (showGame) {
    return (
      <div className="h-screen bg-gradient-to-br from-black via-[#1a1a1a] to-[#2d2d2d] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-64 h-64 bg-[#d4af37]/5 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#b8860b]/5 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-[#d4af37] text-2xl font-black uppercase flex items-center gap-2">
                <Gamepad2 size={28} />
                MONARCH HUNT
              </h2>
              <p className="text-white/40 text-xs uppercase mt-1">Tap gold coins to score!</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setGameSound(!gameSound)}
                className="p-2 bg-white/10 rounded-lg"
              >
                {gameSound ? <Volume2 size={18} className="text-[#d4af37]"/> : <VolumeX size={18} className="text-white/40"/>}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-2 rounded-xl text-center">
              <p className="text-[#d4af37] text-xs uppercase">Score</p>
              <p className="text-white text-lg font-black">{gameScore}</p>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-2 rounded-xl text-center">
              <p className="text-[#d4af37] text-xs uppercase">Level</p>
              <p className="text-white text-lg font-black">{gameLevel}</p>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-2 rounded-xl text-center">
              <p className="text-[#d4af37] text-xs uppercase">Combo</p>
              <p className="text-white text-lg font-black">{gameCombo}</p>
            </div>
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-2 rounded-xl text-center">
              <p className="text-[#d4af37] text-xs uppercase">Time</p>
              <p className="text-white text-lg font-black">{gameTimeLeft}s</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-2xl border border-[#d4af37]/30 p-4 mb-4 relative h-[400px]">
            {!gameActive ? (
              <div className="h-full flex flex-col items-center justify-center">
                <Trophy size={60} className="text-[#d4af37] mb-4 opacity-50" />
                <p className="text-white/60 text-center mb-2 text-sm">
                  Tap the coins as fast as you can!<br/>
                  <span className="text-[#d4af37]">30 seconds challenge</span>
                </p>
                <div className="flex gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-white/40 text-xs">Best Score</p>
                    <p className="text-[#d4af37] text-xl font-black">{gameHighScore}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/40 text-xs">Best Combo</p>
                    <p className="text-[#d4af37] text-xl font-black">{gameBestCombo}</p>
                  </div>
                </div>
                <button
                  onClick={startGame}
                  className="px-8 py-4 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-xl uppercase text-sm tracking-widest hover:opacity-90 transition-all"
                >
                  START GAME
                </button>
              </div>
            ) : (
              <div className="relative h-full">
                {gameTargets.map(target => (
                  <button
                    key={target.id}
                    onClick={() => handleTargetClick(target.id, target.type)}
                    className={`absolute w-14 h-14 rounded-full flex items-center justify-center animate-pulse shadow-lg transform hover:scale-110 transition-all ${
                      target.type === 'bonus' 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                        : 'bg-gradient-to-r from-[#d4af37] to-[#b8860b]'
                    }`}
                    style={{
                      left: `${target.x}%`,
                      top: `${target.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {target.type === 'bonus' ? (
                      <Gift size={20} className="text-white" />
                    ) : (
                      <DollarSign size={20} className="text-black" />
                    )}
                    <span className="absolute -top-5 text-[10px] text-white font-black">
                      +{target.value}
                    </span>
                  </button>
                ))}
                <div className="absolute bottom-0 left-0 right-0">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#d4af37] to-[#b8860b]"
                      style={{ width: `${(gameTimeLeft / 30) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={() => {
              setShowGame(false);
              setIsSplash(true);
              setTimeout(() => setIsSplash(false), 1500);
            }}
            className="w-full py-3 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white/60 font-black rounded-xl uppercase text-xs border border-white/5 hover:border-white/10 transition-all"
          >
            ← BACK TO APP
          </button>
        </div>
      </div>
    );
  }

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
          ) : (
            <div className="space-y-4">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="YOUR EMAIL ADDRESS"
                className="w-full bg-black/50 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37] transition-all"
              />

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
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-[#1a1a1a] to-[#2d2d2d] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#d4af37]/5 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#b8860b]/5 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="w-full max-w-sm space-y-8 relative z-10">
          <div className="text-center">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-[#d4af37]/20 to-[#b8860b]/20 rounded-full flex items-center justify-center mx-auto border-2 border-[#d4af37]/30 shadow-2xl mb-4">
                <Crown size={50} className="text-[#d4af37]" />
              </div>
              <div className="absolute -top-2 -right-2 animate-bounce">
                <Gift size={20} className="text-[#d4af37]" />
              </div>
            </div>
            <h2 className="text-white font-black text-2xl tracking-widest uppercase">
              {isRegisterMode ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-[#d4af37]/70 text-sm mt-2 font-bold">
              {isRegisterMode ? "Join Monarch Pro Today" : "Sign in to continue"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              name="email"
              type="email"
              placeholder="EMAIL ADDRESS"
              className="w-full bg-black/50 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37] transition-all placeholder:text-white/30"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="PASSWORD"
              className="w-full bg-black/50 backdrop-blur-sm p-4 rounded-xl border border-white/10 text-white font-bold outline-none focus:border-[#d4af37] transition-all placeholder:text-white/30"
              required
            />
            
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
          
          <div className="text-center text-white/20 text-[10px] uppercase tracking-widest pt-4">
            Tap the crown for a secret game!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-40 transition-all duration-500 ${
      isDarkMode 
        ? "bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] text-white" 
        : "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 text-gray-900"
    }`}>
      
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

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-[90] px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-full border border-yellow-500/30 backdrop-blur-xl text-xs font-bold flex items-center gap-2">
          <WifiOff size={14} />
          OFFLINE MODE
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
                {showDeleteConfirm.type === 'shopProfile' && 'Delete this shop profile?'}
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

      {/* SHOP ORDERS VIEW MODAL */}
      {viewingShopOrders && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-3 backdrop-blur-3xl overflow-y-auto">
          <div className="w-full max-w-md p-5 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] text-white max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setViewingShopOrders(null)} 
              className="absolute top-2 right-2 text-white/20 hover:text-white/40 p-1"
            >
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#d4af37]/20 to-[#b8860b]/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-[#d4af37]/30">
                <Store size={30} className="text-[#d4af37]" />
              </div>
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">Shop Orders</h3>
              <p className="text-sm text-white/80 font-bold">{viewingShopOrders.shop.name}</p>
              <p className="text-xs text-white/60 mt-1">{viewingShopOrders.shop.area}</p>
            </div>

            {/* Shop Statistics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-black uppercase opacity-60">Total Sales</p>
                <p className="text-lg font-black text-[#d4af37]">Rs.{viewingShopOrders.stats.totalSales.toLocaleString()}</p>
              </div>
              <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                <p className="text-[10px] font-black uppercase opacity-60">Total Orders</p>
                <p className="text-lg font-black text-[#d4af37]">{viewingShopOrders.stats.orderCount}</p>
              </div>
            </div>

            {/* Top Items */}
            {Object.keys(viewingShopOrders.stats.items).length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-black uppercase text-[#d4af37] mb-2">Top Items</p>
                <div className="space-y-2">
                  {Object.entries(viewingShopOrders.stats.items)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([item, qty], idx) => (
                      <div key={idx} className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-2 rounded-lg border border-white/5 flex justify-between">
                        <span className="text-xs">{item}</span>
                        <span className="text-xs font-black text-[#d4af37]">{qty} units</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Orders List */}
            <div>
              <p className="text-xs font-black uppercase text-[#d4af37] mb-2">Order History</p>
              {viewingShopOrders.orders.length > 0 ? (
                <div className="space-y-2">
                  {viewingShopOrders.orders.slice(0, 10).map((order, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-lg border border-white/5">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] opacity-60">
                          {new Date(order.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-xs font-black text-[#d4af37]">Rs.{order.total.toLocaleString()}</span>
                      </div>
                      <div className="text-[9px] opacity-50">
                        {order.items?.length || 0} items
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => {
                            setViewingShopOrders(null);
                            printBill(order);
                          }}
                          className="text-[8px] bg-blue-500/20 text-blue-500 px-2 py-1 rounded"
                        >
                          Print
                        </button>
                        <button
                          onClick={() => {
                            setViewingShopOrders(null);
                            shareToWhatsApp(order);
                          }}
                          className="text-[8px] bg-[#d4af37]/20 text-[#d4af37] px-2 py-1 rounded"
                        >
                          Share
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs opacity-30 italic">No orders found</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setSelectedShop(viewingShopOrders.shop);
                  setViewingShopOrders(null);
                  setShowModal('invoice');
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all"
              >
                NEW ORDER
              </button>
              <button
                onClick={() => setViewingShopOrders(null)}
                className="flex-1 py-2.5 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white/80 font-black rounded-lg uppercase text-xs border border-white/5 hover:border-white/10 transition-all"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop Profile View Modal - ENHANCED */}
      {viewingShopProfile && (
        <div className="fixed inset-0 bg-black/95 z-[150] flex items-center justify-center p-3 backdrop-blur-3xl">
          <div className="w-full max-w-xs p-5 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] text-white">
            <button 
              onClick={() => setViewingShopProfile(null)} 
              className="absolute top-2 right-2 text-white/20 hover:text-white/40 p-1"
            >
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#d4af37]/20 to-[#b8860b]/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-[#d4af37]/30">
                <Briefcase size={30} className="text-[#d4af37]" />
              </div>
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">Shop Profile</h3>
              <p className="text-xs text-white/80 font-bold">{viewingShopProfile.shop.name}</p>
            </div>

            {viewingShopProfile.profile ? (
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={14} className="text-[#d4af37]" />
                    <span className="text-xs font-black uppercase">Owner</span>
                  </div>
                  <p className="text-sm font-bold text-white/90">{viewingShopProfile.profile.ownerName || 'Not set'}</p>
                </div>

                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Phone size={14} className="text-[#d4af37]" />
                    <span className="text-xs font-black uppercase">Phone</span>
                  </div>
                  <p className="text-sm font-bold text-white/90">{viewingShopProfile.profile.phone || 'Not set'}</p>
                </div>

                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail size={14} className="text-[#d4af37]" />
                    <span className="text-xs font-black uppercase">Email</span>
                  </div>
                  <p className="text-sm font-bold text-white/90">{viewingShopProfile.profile.email || 'Not set'}</p>
                </div>

                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={14} className="text-[#d4af37]" />
                    <span className="text-xs font-black uppercase">Address</span>
                  </div>
                  <p className="text-sm font-bold text-white/90">{viewingShopProfile.profile.address || 'Not set'}</p>
                </div>

                {viewingShopProfile.profile.gst && (
                  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Receipt size={14} className="text-[#d4af37]" />
                      <span className="text-xs font-black uppercase">GST</span>
                    </div>
                    <p className="text-sm font-bold text-white/90">{viewingShopProfile.profile.gst}</p>
                  </div>
                )}

                {viewingShopProfile.profile.shopType && (
                  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Store size={14} className="text-[#d4af37]" />
                      <span className="text-xs font-black uppercase">Shop Type</span>
                    </div>
                    <p className="text-sm font-bold text-white/90 capitalize">{viewingShopProfile.profile.shopType}</p>
                  </div>
                )}

                {viewingShopProfile.profile.creditLimit && (
                  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard size={14} className="text-[#d4af37]" />
                      <span className="text-xs font-black uppercase">Credit Limit</span>
                    </div>
                    <p className="text-sm font-bold text-white/90">Rs.{viewingShopProfile.profile.creditLimit}</p>
                  </div>
                )}

                {viewingShopProfile.profile.notes && (
                  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-[#d4af37]" />
                      <span className="text-xs font-black uppercase">Notes</span>
                    </div>
                    <p className="text-sm font-bold text-white/90">{viewingShopProfile.profile.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      editShopProfile(viewingShopProfile.profile);
                      setViewingShopProfile(null);
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-1"
                  >
                    <Edit2 size={14} /> EDIT
                  </button>
                  <button
                    onClick={() => {
                      confirmDelete(viewingShopProfile.profile.id, 'shopProfile', viewingShopProfile.shop.name);
                      setViewingShopProfile(null);
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-1"
                  >
                    <Trash2 size={14} /> DELETE
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-white/60 text-sm mb-4">No profile found for this shop</p>
                <button
                  onClick={() => {
                    setSelectedShop(viewingShopProfile.shop);
                    setViewingShopProfile(null);
                    setShowModal('shopProfile');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all"
                >
                  CREATE PROFILE
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`p-4 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl border-b ${
        isDarkMode 
          ? "bg-black/90 border-[#d4af37]/20" 
          : "bg-white/95 border-[#d4af37]/30 shadow-sm"
      }`}>
        <button 
          onClick={() => setShowGame(true)}
          className="flex items-center gap-3 hover:opacity-80 transition-all"
        >
          <div className="relative">
            <div className={`p-2.5 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-xl text-black shadow-lg ${
              !isDarkMode && 'shadow-[#d4af37]/30'
            }`}>
              <Crown size={20} />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#d4af37] rounded-full animate-ping"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#d4af37] rounded-full"></div>
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
        </button>
        
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

        {/* DASHBOARD TAB - FIXED */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Today's Revenue & Expenses Card - FIXED */}
            <div className="bg-gradient-to-br from-[#d4af37] via-[#c19a2e] to-[#b8860b] p-5 rounded-2xl text-black shadow-2xl relative overflow-hidden">
// නිවැරදි කළ යුතු ආකාරය (Fixed Code):
<div className="absolute inset-0 bg-[url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")] opacity-20"></div>              <Star className="absolute -right-4 -top-4 opacity-10" size={100} />
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-xs font-black uppercase opacity-80 mb-1 tracking-widest">Today's Revenue</p>
                    <h2 className="text-3xl font-black italic tracking-tighter">Rs.{stats.daily.totalSales.toLocaleString()}</h2>
                  </div>
                  <div className="bg-black/20 p-2 rounded-xl text-right">
                    <p className="text-[10px] font-black uppercase">Expenses</p>
                    <p className="text-base font-black text-red-800">- Rs.{stats.expenses.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 bg-black/10 px-3 py-1.5 rounded-full border border-black/10">
                    <Target size={12} />
                    <span className="text-xs font-black uppercase italic">Net: Rs.{(stats.daily.totalSales - stats.expenses).toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black uppercase opacity-80">Top Brand</p>
                    <p className="text-sm font-black">{stats.daily.topBrand}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Expenses Summary - NEW */}
            <div className={`p-4 rounded-2xl border shadow-xl ${
              isDarkMode
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10"
                : "bg-white border-gray-200 shadow-lg"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-[#d4af37]" />
                  <h3 className="text-sm font-black text-[#d4af37] uppercase tracking-widest">Today's Expenses</h3>
                </div>
                <span className="text-xs font-black text-red-500">Rs.{stats.expenses.toLocaleString()}</span>
              </div>

              <div className="space-y-2">
                {stats.todayExpenses.length > 0 ? (
                  stats.todayExpenses.slice(0, 3).map((exp, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        {exp.type === 'fuel' && <Fuel size={12} className="text-red-500" />}
                        {exp.type === 'food' && <Coffee size={12} className="text-amber-500" />}
                        {exp.type === 'transport' && <Navigation size={12} className="text-blue-500" />}
                        <span className="capitalize">{exp.type}</span>
                      </div>
                      <span className="font-bold">Rs.{exp.amount.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs opacity-50 italic text-center py-2">No expenses today</p>
                )}
                <button
                  onClick={() => setShowModal('expense')}
                  className="mt-2 w-full py-2 bg-white/10 rounded-lg text-xs font-black uppercase hover:bg-white/20 transition-all"
                >
                  + ADD EXPENSE
                </button>
              </div>
            </div>

            {/* Target Progress Card - ENHANCED */}
            {stats.monthlyTarget > 0 && (
              <div className={`p-5 rounded-2xl border shadow-xl ${
                isDarkMode
                  ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30"
                  : "bg-white border-[#d4af37]/30 shadow-lg"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award size={20} className="text-[#d4af37]" />
                    <h3 className="text-sm font-black text-[#d4af37] uppercase tracking-widest">
                      {stats.targetSpecific === 'brand' ? `Target: ${stats.targetBrand}` : 'Monthly Target'}
                    </h3>
                  </div>
                  <span className="text-xs font-black">
                    {stats.targetType === 'revenue' ? 'Rs.' : ''}{stats.targetType === 'revenue' ? stats.monthlySales.toLocaleString() : stats.monthlyUnits} / 
                    {stats.targetType === 'revenue' ? 'Rs.' : ''}{stats.monthlyTarget.toLocaleString()}
                    {stats.targetCase === 'cases' ? ' cases' : ' units'}
                  </span>
                </div>
                
                <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full transition-all duration-500 relative"
                    style={{ width: `${Math.min(stats.targetProgress, 100)}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black">
                    {stats.targetProgress.toFixed(1)}% Complete
                  </span>
                  {stats.targetRemaining > 0 ? (
                    <span className="text-xs font-black text-red-500 flex items-center gap-1">
                      <Zap size={14} />
                      {stats.targetType === 'revenue' ? 'Rs.' : ''}{stats.targetRemaining.toLocaleString()} to go
                    </span>
                  ) : (
                    <span className="text-xs font-black text-green-500 flex items-center gap-1">
                      <CheckCircle2 size={14} /> Target Achieved! 🎉
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
                <span className="text-[9px] font-black uppercase">Calc</span>
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

              {/* Monthly Top Brands */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-black uppercase opacity-60">Monthly Top Brands</p>
                  <button
                    onClick={() => setShowAllMonthlyBrands(!showAllMonthlyBrands)}
                    className="text-[#d4af37] text-[9px] font-black uppercase"
                  >
                    {showAllMonthlyBrands ? 'Show Less' : 'Show All'}
                  </button>
                </div>

                {/* Top Brand */}
                <div className={`p-3 rounded-xl border mb-2 ${
                  isDarkMode
                    ? "bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5"
                    : "bg-gray-50 border-gray-100"
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Target size={14} className="text-[#d4af37]" />
                        <p className="text-sm font-black uppercase">
                          {stats.monthly.topBrand || 'N/A'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Package2 size={11} className="opacity-60" />
                          <span className="text-xs opacity-70">
                            {stats.monthly.topBrandUnits} units
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign size={11} className="opacity-60" />
                          <span className="text-xs opacity-70">
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

                {/* All Brands */}
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
                            <p className="text-xs font-bold">
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
                  <p className="text-[9px] font-black uppercase opacity-60">Avg Price per Unit</p>
                  <p className="text-xs font-black">Rs.{stats.monthly.avgPrice.toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[9px] font-black uppercase opacity-60">Today's Notes</p>
                  <p className="text-xs font-black text-[#d4af37]">{stats.notes}</p>
                </div>
              </div>
            </div>

            {/* Today's Sales */}
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
                      <p className="text-xs font-black uppercase tracking-tight mb-1">{item.name}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Hash size={9} className="opacity-50" />
                          <span className="text-[9px] opacity-70">{item.units} UNITS</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-base tabular-nums text-[#d4af37]">Rs.{item.revenue.toLocaleString()}</p>
                      <p className="text-[8px] opacity-50">Revenue</p>
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
          </div>
        )}

        {/* SHOPS TAB - WITH ENHANCED PROFILE MENU */}
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
                  }`}>
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
                    }`}>
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
                const showMenu = showShopProfileMenu === s.id;
                
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
                        <div className="flex-1">
                          <h4 className="text-sm font-black uppercase leading-tight">
                            {s.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-1">
                            <MapPin size={11} className="opacity-40" />
                            <p className="text-[10px] font-bold uppercase tracking-tighter opacity-60">
                              {s.area}
                            </p>
                          </div>
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
                          {shopProfile && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-[8px] opacity-60">Profile: {shopProfile.ownerName || 'Added'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons - Compact and Themed */}
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => confirmDelete(s.id, 'shop', s.name)}
                          className={`p-2 rounded-lg transition-all ${
                            isDarkMode
                              ? 'text-red-500/30 hover:text-red-500 hover:bg-red-500/10'
                              : 'text-red-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                        >
                          <Trash2 size={14}/>
                        </button>
                        
                        <div className="relative">
                          <button
                            onClick={() => setShowShopProfileMenu(showMenu ? null : s.id)}
                            className={`p-2 rounded-lg transition-all ${
                              isDarkMode
                                ? 'text-[#d4af37]/60 hover:text-[#d4af37] hover:bg-[#d4af37]/10'
                                : 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                          >
                            <Briefcase size={14}/>
                          </button>
                          
                          {/* Profile Menu Popup */}
                          {showMenu && (
                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-xl border border-[#d4af37]/30 shadow-2xl z-50 overflow-hidden">
                              <div className="p-1">
                                <button
                                  onClick={() => {
                                    setShowShopProfileMenu(null);
                                    setSelectedShop(s);
                                    setShowModal('invoice');
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-black uppercase hover:bg-white/10 rounded-lg flex items-center gap-2"
                                >
                                  <Receipt size={12} className="text-[#d4af37]"/> New Bill
                                </button>
                                <button
                                  onClick={() => {
                                    setShowShopProfileMenu(null);
                                    viewShopOrders(s);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-black uppercase hover:bg-white/10 rounded-lg flex items-center gap-2"
                                >
                                  <History size={12} className="text-blue-500"/> View Orders
                                </button>
                                {shopProfile ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setShowShopProfileMenu(null);
                                        viewShopProfile(s);
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs font-black uppercase hover:bg-white/10 rounded-lg flex items-center gap-2"
                                    >
                                      <Eye size={12} className="text-green-500"/> View Profile
                                    </button>
                                    <button
                                      onClick={() => {
                                        setShowShopProfileMenu(null);
                                        editShopProfile(shopProfile);
                                      }}
                                      className="w-full px-4 py-2 text-left text-xs font-black uppercase hover:bg-white/10 rounded-lg flex items-center gap-2"
                                    >
                                      <Edit2 size={12} className="text-blue-500"/> Edit Profile
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setShowShopProfileMenu(null);
                                      setSelectedShop(s);
                                      setShowModal('shopProfile');
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs font-black uppercase hover:bg-white/10 rounded-lg flex items-center gap-2"
                                  >
                                    <Plus size={12} className="text-[#d4af37]"/> Add Profile
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
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

        {/* HISTORY TAB */}
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
                      <p className="text-[10px] opacity-60 font-black uppercase">{o.companyName}</p>
                      {o.isManual && (
                        <span className="text-[8px] bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-500 px-2 py-0.5 rounded-full border border-green-500/30">
                          MANUAL
                        </span>
                      )}
                    </div>
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
                      onClick={() => shareBillWithLocation(o)}
                      className={`p-2 rounded-lg transition-all ${
                        isDarkMode
                          ? 'text-[#d4af37] hover:bg-[#d4af37]/10'
                          : 'text-[#d4af37] hover:bg-[#d4af37]/20'
                      }`}
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

                <div className="space-y-2 border-y py-3 my-3" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)' }}>
                  {o.items && o.items.map((i, k) => (
                    <div key={k} className="flex justify-between items-center text-xs uppercase font-bold">
                      <div className="flex items-center gap-2">
                        <span className="opacity-60">{i.name}</span>
                        <span className="text-[9px] opacity-40">x{i.qty} @ Rs.{i.price}</span>
                      </div>
                      <span className="text-[#d4af37] font-black">Rs.{i.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center font-black pt-2">
                  <span className="text-xs uppercase opacity-40">Total Amount</span>
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

        {/* NOTES TAB */}
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
                      onClick={() => confirmDelete(note.id, 'note', '')}
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
                    <p className="text-xs leading-relaxed opacity-90">
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

        {/* SETTINGS TAB - ENHANCED TARGET */}
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
                <p className="text-[10px] opacity-50">Update your personal information</p>
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
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Routes List</h4>
                <span className="text-[10px] opacity-50">{data.routes.length} routes</span>
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
                      <span className="text-xs font-black uppercase">{r.name}</span>
                    </div>
                    <button
                      onClick={() => confirmDelete(r.id, 'route', r.name)}
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
                <span className="text-[10px] opacity-50">{data.brands.length} brands</span>
              </div>

              <div className="space-y-2">
                {data.brands.map((b, index) => (
                  <div
                    key={b.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isDarkMode
                        ? 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] border-white/5 hover:border-[#d4af37]/30'
                        : 'bg-gray-50 border-gray-100 hover:border-[#d4af37]'
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                              isDarkMode
                                ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30'
                                : 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20'
                            }`}>
                              {b.sequence || index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black uppercase">
                                  {b.name}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#d4af37]/20 to-[#b8860b]/20 text-[#d4af37] border border-[#d4af37]/30">
                                  {b.size}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] opacity-50">Price:</span>
                                <span className="text-xs font-black text-[#d4af37]">Rs.{b.price}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {!isOffline && (
                              <>
                                {index > 0 && (
                                  <button
                                    onClick={() => reorderBrands(b.id, 'up')}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      isDarkMode
                                        ? 'text-white/40 hover:text-white hover:bg-white/10'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    ↑
                                  </button>
                                )}
                                {index < data.brands.length - 1 && (
                                  <button
                                    onClick={() => reorderBrands(b.id, 'down')}
                                    className={`p-1.5 rounded-lg transition-all ${
                                      isDarkMode
                                        ? 'text-white/40 hover:text-white hover:bg-white/10'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                    }`}
                                  >
                                    ↓
                                  </button>
                                )}
                              </>
                            )}
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
                              onClick={() => confirmDelete(b.id, 'brand', `${b.name} (${b.size})`)}
                              className={`p-1.5 rounded-lg transition-all ${
                                isDarkMode
                                  ? 'text-red-500/40 hover:text-red-500 hover:bg-red-500/10'
                                  : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                              }`}
                            >
                              <Trash2 size={14}/>
                            </button>
                          </div>
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

            {/* Today's Expenses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-widest">Today's Expenses</h4>
                <span className="text-[10px] opacity-50">Rs.{stats.expenses.toLocaleString()}</span>
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
                          <span className="text-xs font-black uppercase">{exp.type}</span>
                        </div>
                        {exp.note && <p className="text-[10px] mt-0.5 opacity-60">{exp.note}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-red-500">Rs.{exp.amount.toLocaleString()}</span>
                      <button
                        onClick={() => confirmDelete(exp.id, 'expense', '')}
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

      {/* Bottom Navigation */}
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

      {/* PRINT PREVIEW MODAL */}
      {showPrintPreview && printOrder && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-3 backdrop-blur-3xl">
          <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] w-full max-w-sm p-4 rounded-2xl border border-[#d4af37]/30 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-[#d4af37] uppercase">Print Bill</h3>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl mb-4 text-black" style={{ fontFamily: "'Courier New', monospace" }}>
              <div className="text-center border-b-2 border-[#d4af37] pb-3 mb-3">
                <div className="text-xl font-bold text-[#d4af37]">{printOrder.companyName || "MONARCH"}</div>
                <div className="text-lg font-bold mt-1">{printOrder.shopName}</div>
                <div className="text-xs mt-1">{new Date(printOrder.timestamp).toLocaleString()}</div>
                <div className="text-xs">Bill #: {printOrder.id ? printOrder.id.slice(-6) : Math.floor(Math.random() * 1000000)}</div>
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
                  {printOrder.items && printOrder.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{item.name}</td>
                      <td className="text-center py-1">{item.qty}</td>
                      <td className="text-right py-1">Rs.{item.price}</td>
                      <td className="text-right py-1">Rs.{item.subtotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t-2 border-[#d4af37] pt-3 text-right">
                <span className="text-lg font-bold">Total: Rs.{printOrder.total.toLocaleString()}</span>
              </div>

              <div className="text-center text-xs mt-4 text-gray-600">
                Thank you for your business!<br/>
                Generated by Monarch Pro
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  handlePrint(printOrder);
                  setShowPrintPreview(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-all"
              >
                <Printer size={16} /> PRINT BILL
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="w-full py-2.5 bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-white/60 font-black rounded-lg uppercase text-xs border border-white/5 hover:border-white/10 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALCULATOR MODAL - FIXED */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-3 backdrop-blur-3xl">
          <div className={`w-full max-w-xs p-4 rounded-2xl border relative shadow-2xl ${
            isDarkMode 
              ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30 text-white"
              : "bg-gradient-to-br from-white to-gray-50 border-[#d4af37]/50 text-gray-900"
          }`}>
            <button
              onClick={() => {
                setShowCalculator(false);
                resetCalculator();
              }}
              className="absolute top-2 right-2 text-white/20 hover:text-white/40 transition-all p-1"
            >
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <Calculator size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">CALCULATOR</h3>
              <p className="text-[10px] opacity-50">Discount (Rs. or %)</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">Subtotal (Rs.)</label>
                <input
                  type="number"
                  value={totalCalculation.subtotal || ''}
                  onChange={(e) => setTotalCalculation({...totalCalculation, subtotal: parseFloat(e.target.value) || 0})}
                  onFocus={handleInputFocus}
                  placeholder="0"
                  className={`w-full p-3 rounded-lg border font-bold text-center outline-none focus:border-[#d4af37] transition-all text-sm ${
                    isDarkMode 
                      ? "bg-black/40 border-white/5 text-white" 
                      : "bg-gray-100 border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setTotalCalculation({...totalCalculation, usePercentage: false})}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    !totalCalculation.usePercentage
                      ? 'bg-[#d4af37] text-black'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  Rs.
                </button>
                <button
                  onClick={() => setTotalCalculation({...totalCalculation, usePercentage: true})}
                  className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${
                    totalCalculation.usePercentage
                      ? 'bg-[#d4af37] text-black'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  %
                </button>
              </div>

              {totalCalculation.usePercentage ? (
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">Discount (%)</label>
                  <input
                    type="number"
                    value={totalCalculation.discountPercent || ''}
                    onChange={(e) => setTotalCalculation({...totalCalculation, discountPercent: parseFloat(e.target.value) || 0})}
                    onFocus={handleInputFocus}
                    placeholder="0"
                    className={`w-full p-2 rounded-lg border font-bold text-center outline-none focus:border-[#d4af37] transition-all text-sm ${
                      isDarkMode 
                        ? "bg-black/40 border-white/5 text-white" 
                        : "bg-gray-100 border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">Discount (Rs.)</label>
                  <input
                    type="number"
                    value={totalCalculation.discount || ''}
                    onChange={(e) => setTotalCalculation({...totalCalculation, discount: parseFloat(e.target.value) || 0})}
                    onFocus={handleInputFocus}
                    placeholder="0"
                    className={`w-full p-2 rounded-lg border font-bold text-center outline-none focus:border-[#d4af37] transition-all text-sm ${
                      isDarkMode 
                        ? "bg-black/40 border-white/5 text-white" 
                        : "bg-gray-100 border-gray-300 text-gray-900"
                    }`}
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">Tax (Rs.)</label>
                <input
                  type="number"
                  value={totalCalculation.tax || ''}
                  onChange={(e) => setTotalCalculation({...totalCalculation, tax: parseFloat(e.target.value) || 0})}
                  onFocus={handleInputFocus}
                  placeholder="0"
                  className={`w-full p-2 rounded-lg border font-bold text-center outline-none focus:border-[#d4af37] transition-all text-sm ${
                    isDarkMode 
                      ? "bg-black/40 border-white/5 text-white" 
                      : "bg-gray-100 border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              <div className={`p-3 rounded-lg border ${
                isDarkMode
                  ? "bg-gradient-to-br from-black/60 to-black/40 border-[#d4af37]/30"
                  : "bg-gradient-to-br from-gray-100 to-gray-50 border-[#d4af37]/30"
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] font-black uppercase opacity-60">Grand Total</p>
                </div>
                <p className="text-lg font-black text-[#d4af37] text-center">
                  Rs.{(
                    (totalCalculation.subtotal || 0) - 
                    (totalCalculation.usePercentage 
                      ? ((totalCalculation.subtotal || 0) * (totalCalculation.discountPercent || 0) / 100)
                      : (totalCalculation.discount || 0)
                    ) + (totalCalculation.tax || 0)
                  ).toLocaleString()}
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
                  onClick={resetCalculator}
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

      {/* EXPENSE MODAL */}
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
                  onFocus={handleInputFocus}
                  placeholder="0"
                  className={`w-full p-3 rounded-lg border font-bold text-center outline-none focus:border-[#d4af37] transition-all text-base ${
                    isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase opacity-40 mb-1">Note (Optional)</p>
                <textarea
                  value={expenseNote}
                  onChange={(e) => setExpenseNote(e.target.value)}
                  placeholder="Add expense details..."
                  className={`w-full p-2 rounded-lg border text-xs outline-none resize-none h-16 focus:border-[#d4af37] transition-all ${
                    isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
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

      {/* NOTE MODAL */}
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
                  className={`w-full p-3 rounded-lg border text-xs outline-none resize-none h-24 focus:border-[#d4af37] transition-all ${
                    isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
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

      {/* INVOICE MODAL */}
      {showModal === 'invoice' && selectedShop && (
        <div className="fixed inset-0 bg-black z-[100] overflow-y-auto">
          <div className="min-h-screen p-3 max-w-lg mx-auto pb-32">
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

            <div className="space-y-2">
              {data.brands.map((b, index) => (
                <div
                  key={b.id}
                  className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] p-3 rounded-xl border border-white/5 flex items-center justify-between hover:border-[#d4af37]/30 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm ${
                      isDarkMode
                        ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30'
                        : 'bg-[#d4af37]/10 text-[#d4af37] border border-[#d4af37]/20'
                    }`}>
                      {b.sequence || index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-black uppercase text-white">{b.name} ({b.size})</h4>
                      <p className="text-xs text-[#d4af37] font-bold mt-0.5">Rs.{b.price.toLocaleString()}</p>
                    </div>
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
                      onFocus={handleInputFocus}
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

      {/* MANUAL ORDER MODAL */}
      {showModal === 'manual' && (
        <div className="fixed inset-0 bg-black z-[100] overflow-y-auto">
          <div className="min-h-screen p-3 max-w-lg mx-auto pb-40">
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
                        onFocus={handleInputFocus}
                        className="w-full bg-black/40 p-2 rounded border border-white/5 text-white font-bold text-center outline-none text-xs focus:border-[#d4af37] transition-all"
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase opacity-40 mb-1">Unit Price (Rs.)</p>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateManualItem(index, 'price', e.target.value)}
                        onFocus={handleInputFocus}
                        placeholder="0"
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

      {/* PREVIEW MODAL */}
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

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  printBill(lastOrder);
                  setShowModal(null);
                }}
                className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-black rounded-lg uppercase text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
              >
                <Printer size={14} /> PRINT BILL
              </button>
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
                className="w-full py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
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

      {/* SHOP PROFILE MODAL - ENHANCED */}
      {showModal === 'shopProfile' && selectedShop && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-3 backdrop-blur-3xl overflow-y-auto">
          <div className="w-full max-w-xs p-5 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] text-white">
            <button 
              onClick={() => {
                setShowModal(null);
                setEditingProfile(null);
                setShopProfileForm({
                  ownerName: '',
                  phone: '',
                  email: '',
                  address: '',
                  gst: '',
                  notes: '',
                  creditLimit: '',
                  paymentTerms: '',
                  shopType: 'retail',
                  location: ''
                });
              }} 
              className="absolute top-2 right-2 text-white/20 hover:text-white/40 p-1"
            >
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <Briefcase size={30} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">
                {editingProfile ? 'Edit Profile' : 'Shop Profile'}
              </h3>
              <p className="text-xs text-white/80 font-bold">{selectedShop.name}</p>
            </div>

            <form onSubmit={saveShopProfile} className="space-y-3">
              <input
                name="ownerName"
                placeholder="Owner Name"
                value={shopProfileForm.ownerName}
                onChange={(e) => setShopProfileForm({...shopProfileForm, ownerName: e.target.value})}
                className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all"
              />
              <input
                name="phone"
                placeholder="Phone Number"
                value={shopProfileForm.phone}
                onChange={(e) => setShopProfileForm({...shopProfileForm, phone: e.target.value})}
                className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white font-bold outline-none text-xs focus:border-[#d4af37] transition-all"
              />
              <input
                name="email"
                type="email"
                placeholder="Email Address"
                value={shopProfileForm.email}
                onChange={(e) => setShopProfileForm({...shopProfileForm, email: e.target.value})}
                className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white font-bold outline-none text-xs focus:border-[#d4af37] transition-all"
              />
              <input
                name="address"
                placeholder="Address"
                value={shopProfileForm.address}
                onChange={(e) => setShopProfileForm({...shopProfileForm, address: e.target.value})}
                className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all"
              />
              <input
                name="gst"
                placeholder="GST Number"
                value={shopProfileForm.gst}
                onChange={(e) => setShopProfileForm({...shopProfileForm, gst: e.target.value})}
                className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all"
              />
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[9px] font-black uppercase opacity-40 mb-1">Shop Type</p>
                  <select
                    value={shopProfileForm.shopType}
                    onChange={(e) => setShopProfileForm({...shopProfileForm, shopType: e.target.value})}
                    className="w-full p-2 rounded-lg border border-white/10 bg-black/40 text-white font-bold text-xs outline-none focus:border-[#d4af37]"
                  >
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase opacity-40 mb-1">Credit Limit</p>
                  <input
                    type="number"
                    placeholder="Rs."
                    value={shopProfileForm.creditLimit}
                    onChange={(e) => setShopProfileForm({...shopProfileForm, creditLimit: e.target.value})}
                    onFocus={handleInputFocus}
                    className="w-full p-2 rounded-lg border border-white/10 bg-black/40 text-white font-bold text-xs outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              <input
                name="location"
                placeholder="Location / Area"
                value={shopProfileForm.location}
                onChange={(e) => setShopProfileForm({...shopProfileForm, location: e.target.value})}
                className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all"
              />

              <textarea
                name="notes"
                placeholder="Additional Notes"
                rows="2"
                value={shopProfileForm.notes}
                onChange={(e) => setShopProfileForm({...shopProfileForm, notes: e.target.value})}
                className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white text-xs outline-none resize-none focus:border-[#d4af37] transition-all"
              />

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all"
              >
                {editingProfile ? 'UPDATE PROFILE' : 'SAVE PROFILE'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TARGET MODAL - ENHANCED */}
      {showModal === 'target' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-3 backdrop-blur-3xl overflow-y-auto">
          <div className="w-full max-w-xs p-5 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] text-white max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowModal(null)} className="absolute top-2 right-2 text-white/20 hover:text-white/40 p-1">
              <X size={20}/>
            </button>

            <div className="text-center mb-4">
              <div className="relative">
                <Target size={30} className="text-[#d4af37] mx-auto mb-2" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#d4af37] rounded-full animate-ping"></div>
              </div>
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">Monthly Target</h3>
              <p className="text-[10px] opacity-50">Set your sales goal</p>
            </div>

            <form onSubmit={saveMonthlyTarget} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">Select Month</label>
                <input
                  type="month"
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white font-bold outline-none text-xs focus:border-[#d4af37] transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase opacity-40 mb-2 block">Target Type</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setTargetType('revenue')}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      targetType === 'revenue'
                        ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    <DollarSign size={20} />
                    <span className="text-[9px] font-black uppercase">Revenue</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('units')}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                      targetType === 'units'
                        ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    <Package2 size={20} />
                    <span className="text-[9px] font-black uppercase">Units</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setTargetCase('units')}
                    className={`p-2 rounded-lg border text-xs font-black uppercase transition-all ${
                      targetCase === 'units'
                        ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    Per Unit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetCase('cases')}
                    className={`p-2 rounded-lg border text-xs font-black uppercase transition-all ${
                      targetCase === 'cases'
                        ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    Cases (6x)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase opacity-40 mb-2 block">Target Scope</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetSpecific('total')}
                    className={`p-2 rounded-lg border text-xs font-black uppercase transition-all ${
                      targetSpecific === 'total'
                        ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    Total Sales
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetSpecific('brand')}
                    className={`p-2 rounded-lg border text-xs font-black uppercase transition-all ${
                      targetSpecific === 'brand'
                        ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                        : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    Specific Brand
                  </button>
                </div>
              </div>

              {targetSpecific === 'brand' && (
                <div>
                  <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">Select Brand</label>
                  <select
                    value={targetBrand}
                    onChange={(e) => setTargetBrand(e.target.value)}
                    className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white font-bold outline-none text-xs focus:border-[#d4af37] transition-all"
                    required
                  >
                    <option value="">-- SELECT BRAND --</option>
                    {data.brands.map(b => (
                      <option key={b.id} value={b.name}>{b.name} ({b.size})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase opacity-40 mb-1 block">
                  Target Amount {targetType === 'revenue' ? '(Rs.)' : '(Units)'}
                  {targetCase === 'cases' && targetType === 'units' ? ' (in cases)' : ''}
                </label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  onFocus={handleInputFocus}
                  placeholder="0"
                  className="w-full p-3 rounded-lg border border-white/10 bg-black/40 text-white font-bold text-center outline-none text-xs focus:border-[#d4af37] transition-all"
                />
              </div>

              {stats.monthlyTarget > 0 && (
                <div className="p-3 bg-[#d4af37]/10 rounded-lg border border-[#d4af37]/30">
                  <p className="text-xs opacity-60">Current Target</p>
                  <p className="text-lg font-black text-[#d4af37]">
                    {stats.targetType === 'revenue' ? 'Rs.' : ''}{stats.monthlyTarget.toLocaleString()}
                    {stats.targetCase === 'cases' ? ' cases' : ' units'}
                  </p>
                  {stats.targetSpecific === 'brand' && stats.targetBrand && (
                    <p className="text-[10px] opacity-70 mt-1">For: {stats.targetBrand}</p>
                  )}
                  <p className="text-xs opacity-60 mt-1">Progress: {stats.targetProgress.toFixed(1)}%</p>
                  <p className="text-[10px] mt-2 text-white/80">
                    Current: {stats.targetType === 'revenue' ? 'Rs.' : ''}{stats.targetType === 'revenue' ? stats.monthlySales.toLocaleString() : stats.monthlyUnits}
                  </p>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all"
              >
                SET TARGET
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ROUTE MODAL */}
      {showModal === 'route' && (
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
              <MapPin size={28} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">New Route</h3>
              <p className="text-[10px] opacity-50">Add new sales route</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = e.target;
              if (!user) {
                showToast("Please login first!", "error");
                return;
              }
              try {
                await addDoc(collection(db, 'routes'), {
                  userId: user.uid,
                  timestamp: Date.now(),
                  name: f.name.value.toUpperCase()
                });
                showToast("✅ Route added successfully!", "success");
                setShowModal(null);
              } catch (err) {
                showToast("Error: " + err.message, "error");
              }
            }} className="space-y-3">
              <input
                name="name"
                placeholder="ROUTE NAME"
                className={`w-full p-3 rounded-lg border font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
                required
              />
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all">
                SAVE ROUTE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHOP MODAL */}
      {showModal === 'shop' && (
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
              <Store size={28} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">New Shop</h3>
              <p className="text-[10px] opacity-50">Register new shop</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = e.target;
              if (!user) {
                showToast("Please login first!", "error");
                return;
              }
              try {
                await addDoc(collection(db, 'shops'), {
                  userId: user.uid,
                  timestamp: Date.now(),
                  name: f.name.value.toUpperCase(),
                  area: f.area.value
                });
                showToast("✅ Shop registered successfully!", "success");
                setShowModal(null);
              } catch (err) {
                showToast("Error: " + err.message, "error");
              }
            }} className="space-y-3">
              <input
                name="name"
                placeholder="SHOP NAME"
                className={`w-full p-3 rounded-lg border font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
                required
              />
              <div className="relative">
                <select
                  name="area"
                  className={`w-full p-3 rounded-lg border font-bold uppercase outline-none appearance-none text-xs focus:border-[#d4af37] transition-all ${
                    isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
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
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all">
                SAVE SHOP
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BRAND MODAL */}
      {showModal === 'brand' && (
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
              <Package size={28} className="text-[#d4af37] mx-auto mb-2" />
              <h3 className="font-black text-[#d4af37] mb-1 uppercase text-base tracking-widest">New Brand</h3>
              <p className="text-[10px] opacity-50">Add new product brand (Next #{data.brands.length + 1})</p>
            </div>

            <form onSubmit={addBrandWithSequence} className="space-y-3">
              <div className={`p-2 rounded-lg border ${isDarkMode ? 'bg-[#d4af37]/10 border-[#d4af37]/30' : 'bg-[#d4af37]/5 border-[#d4af37]/20'} text-center`}>
                <span className="text-[10px] font-black uppercase opacity-60">Brand Number</span>
                <div className="text-2xl font-black text-[#d4af37]">{data.brands.length + 1}</div>
              </div>

              <input
                name="name"
                placeholder="BRAND NAME"
                className={`w-full p-3 rounded-lg border font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
                required
              />
              <input
                name="size"
                placeholder="SIZE (e.g., 500ML, 1KG)"
                className={`w-full p-3 rounded-lg border font-bold uppercase outline-none text-xs focus:border-[#d4af37] transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
                required
              />
              <input
                name="price"
                type="number"
                step="0.01"
                placeholder="UNIT PRICE (Rs.)"
                onFocus={handleInputFocus}
                className={`w-full p-3 rounded-lg border font-bold outline-none text-xs focus:border-[#d4af37] transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/5 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
                required
              />
              
              {brandError && (
                <div className="p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-500 text-xs font-bold text-center">{brandError}</p>
                </div>
              )}

              <button type="submit" className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg uppercase text-xs tracking-widest hover:opacity-90 transition-all">
                SAVE BRAND
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        @keyframes progress-slow {
          0% { width: 100%; }
          100% { width: 0%; }
        }

        .animate-progress {
          animation: progress 1.5s ease-in-out;
        }
        
        .animate-progress-slow {
          animation: progress-slow 30s linear forwards;
        }

        * {
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif !important;
        }

        button {
          min-height: 44px;
          min-width: 44px;
        }

        input, select, textarea {
          font-size: 16px !important;
        }

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
      `}</style>
    </div>
  );
}
