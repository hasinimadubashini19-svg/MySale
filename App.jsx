import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  RotateCcw, Volume2, VolumeX, Trophy, Timer, Users, Shield, Heart,
  Sparkles, Flame, Star as StarIcon, Menu, MoreVertical, Home,
  ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, Play, Pause,
  Map, MapPin as MapPinIcon, XCircle, Target as TargetIcon
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
  const [editingBrandData, setEditingBrandData] = useState({ name: '', size: '', price: '' });
  const [movingBrandId, setMovingBrandId] = useState(null);
  const [targetPosition, setTargetPosition] = useState(null);

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
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [showShopMenu, setShowShopMenu] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [shareWithLocation, setShareWithLocation] = useState(false);
  const [showAppInfo, setShowAppInfo] = useState(false);

  // Target States
  const [targetAmount, setTargetAmount] = useState('');
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [targetType, setTargetType] = useState('revenue');
  const [targetCase, setTargetCase] = useState('units');
  const [targetBrand, setTargetBrand] = useState('');
  const [targetSpecific, setTargetSpecific] = useState('total');
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(null);

  // Shop Profile States
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

  // View States
  const [viewingShopProfile, setViewingShopProfile] = useState(null);
  const [viewingShopOrders, setViewingShopOrders] = useState(null);

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
    }, 2000);
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
              .then(() => showToast("📍 Location saved!", "success"))
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
      showToast("✅ Profile Saved!", "success");
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
        showToast("✅ Expense saved!", "success");
      }

      setExpenseAmount('');
      setExpenseNote('');
      setShowModal(null);

      // Force refresh dashboard
      setRefreshKey(prev => prev + 1);
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

      showToast(`✅ ${type} deleted!`, 'success');
      setShowDeleteConfirm({ show: false, id: null, type: '', name: '' });

      // Force refresh
      setRefreshKey(prev => prev + 1);
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
        showToast("✅ Note saved!", "success");
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
      companyName: data.settings.company || "SALES MONARCH",
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
        showToast("✅ Order saved!", "success");
      }

      setRefreshKey(prev => prev + 1);
    } catch (err) {
      showToast("Error saving order: " + err.message, "error");
    }
  };

  // ========== CALCULATOR ==========
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
      showToast("📧 Password reset link sent!", "success");
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

  // ========== SAVE SHOP PROFILE ==========
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

  // ========== SAVE TARGET ==========
  const saveTarget = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast("Please login first!", "error");
      return;
    }

    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      showToast("Please enter a valid target amount", "error");
      return;
    }

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

      if (editingTarget) {
        await updateDoc(doc(db, 'targets', editingTarget.id), targetData);
        showToast("✅ Target updated!", "success");
      } else {
        await addDoc(collection(db, 'targets'), targetData);
        showToast("✅ Target set!", "success");
      }

      setShowTargetModal(false);
      setEditingTarget(null);
      setTargetAmount('');
      setTargetBrand('');
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  const editTarget = (target) => {
    setEditingTarget(target);
    setTargetMonth(target.month);
    setTargetAmount(target.amount.toString());
    setTargetType(target.type || 'revenue');
    setTargetSpecific(target.specific || 'total');
    setTargetBrand(target.brand || '');
    setTargetCase(target.case || 'units');
    setShowTargetModal(true);
  };

  // ========== STATISTICS ==========
  const stats = useMemo(() => {
    const todayStr = new Date().toLocaleDateString();
    const todayISO = new Date().toISOString().split('T')[0];
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
            const itemName = i.name;
            totalUnits += qty;

            if (!summary[itemName]) {
              summary[itemName] = { units: 0, revenue: 0, name: itemName };
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

    const todayExpenses = data.expenses.filter(e => e.date === todayISO);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const monthlyExpenses = data.expenses.filter(e => {
      try {
        return e.date && e.date.startsWith(currentYear + '-' + String(currentMonth + 1).padStart(2, '0'));
      } catch {
        return false;
      }
    }).reduce((sum, e) => sum + (e.amount || 0), 0);

    const todayNotes = data.notes.filter(n => n.date === todayISO);

    const monthTargets = data.targets?.filter(t => t.month === currentMonthStr) || [];

    const targetProgress = monthTargets.map(target => {
      let achieved = 0;

      if (target.specific === 'brand' && target.brand) {
        achieved = monthlyOrders.reduce((sum, o) => {
          if (o.items) {
            o.items.forEach(i => {
              if (i.name.includes(target.brand)) {
                if (target.type === 'revenue') {
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
        achieved = target.type === 'units' ?
          monthlyOrders.reduce((sum, o) => {
            let units = 0;
            if (o.items) o.items.forEach(i => units += i.qty || 0);
            return sum + units;
          }, 0) :
          monthlyOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      }

      return {
        ...target,
        achieved,
        progress: target.amount > 0 ? (achieved / target.amount) * 100 : 0
      };
    });

    const monthlySales = monthlyOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const monthlyUnits = monthlyOrders.reduce((sum, o) => {
      let units = 0;
      if (o.items) o.items.forEach(i => units += i.qty || 0);
      return sum + units;
    }, 0);

    // Calculate expenses by type
    const expensesByType = todayExpenses.reduce((acc, exp) => {
      acc[exp.type] = (acc[exp.type] || 0) + exp.amount;
      return acc;
    }, {});

    return {
      daily: getStats(dailyOrders),
      monthly: getStats(monthlyOrders),
      expenses: totalExpenses,
      expensesByType,
      monthlyExpenses: monthlyExpenses,
      notes: todayNotes.length,
      todayExpenses: todayExpenses,
      monthlySales: monthlySales,
      monthlyUnits: monthlyUnits,
      targets: targetProgress,
      targetCount: monthTargets.length
    };
  }, [data.orders, data.expenses, data.notes, data.targets, refreshKey]);

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
  const shareToWhatsApp = (order, includeLocation = false) => {
    if (!order) return;

    let msg = `*${order.companyName || "SALES MONARCH"} - INVOICE*\n`;
    msg += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
    msg += `🏪 *Shop:* ${order.shopName || "Unknown Shop"}\n`;
    msg += `📅 *Date:* ${order.timestamp ? new Date(order.timestamp).toLocaleString() : new Date().toLocaleString()}\n`;

    if (includeLocation && currentLocation) {
      const mapsUrl = `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`;
      msg += `📍 *Location:* ${mapsUrl}\n`;
    } else if (order.location) {
      const mapsUrl = `https://www.google.com/maps?q=${order.location.lat},${order.location.lng}`;
      msg += `📍 *Saved Location:* ${mapsUrl}\n`;
    }

    msg += `\n*ITEMS:*\n`;
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(i => {
        msg += `• ${i.name || "Item"} (${i.qty || 0} x Rs.${i.price || 0}) = *Rs.${(i.subtotal || 0).toLocaleString()}*\n`;
      });
    }
    msg += `\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
    msg += `💰 *TOTAL: Rs.${(order.total || 0).toLocaleString()}*\n`;
    msg += `⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n`;
    msg += `_Generated by Sales Monarch Pro_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ========== PRINT BILL ==========
  const printBill = (order) => {
    setPrintOrder(order);
    setShowPrintPreview(true);
  };

  const generateBillHTML = (order) => {
    const companyName = order.companyName || data.settings.company || "SALES MONARCH";
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
            Generated by Sales Monarch Pro
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
        showToast("🎉 Account created!", "success");

        try {
          await setDoc(doc(db, "settings", userCredential.user.uid), {
            name: email.split('@')[0].toUpperCase(),
            company: "SALES MONARCH",
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
      companyName: data.settings.company || "SALES MONARCH",
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
        showToast("✅ Order saved!", "success");
      }

      setRefreshKey(prev => prev + 1);
    } catch (err) {
      showToast("Error saving order: " + err.message, "error");
    }
  };

  // ========== SAVE BRAND EDIT ==========
  const saveBrandEdit = async () => {
    if (!editingBrand || !editingBrandData.name || !editingBrandData.size || !editingBrandData.price) {
      showToast("Please fill all fields", "error");
      return;
    }

    try {
      await updateDoc(doc(db, 'brands', editingBrand), {
        name: editingBrandData.name.toUpperCase(),
        size: editingBrandData.size.toUpperCase(),
        price: parseFloat(editingBrandData.price)
      });
      showToast("Brand updated!", "success");
      setEditingBrand(null);
      setEditingBrandData({ name: '', size: '', price: '' });
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      showToast("Error updating brand: " + err.message, "error");
    }
  };

  const startEditBrand = (brand) => {
    setEditingBrand(brand.id);
    setEditingBrandData({
      name: brand.name,
      size: brand.size,
      price: brand.price.toString()
    });
  };

  // ========== VALIDATE BRAND ==========
  const validateBrand = (name, size, price) => {
    if (!name.trim()) return 'Brand name required';
    if (!size.trim()) return 'Size required';
    if (!price || price <= 0) return 'Valid price required';

    const exists = data.brands.find(b =>
      b.name?.toUpperCase() === name.toUpperCase() &&
      b.size?.toUpperCase() === size.toUpperCase() &&
      b.id !== editingBrand // Skip current brand when editing
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
        showToast(`✅ Brand added! (#${sequence})`, "success");
      }

      setBrandError('');
      setShowModal(null);
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      showToast("Error: " + err.message, "error");
    }
  };

  // ========== DRAG AND DROP BRAND REORDER ==========
  const startMoveBrand = (brandId, e) => {
    e.preventDefault();
    setMovingBrandId(brandId);
  };

  const moveBrandToPosition = (targetBrandId) => {
    if (!movingBrandId || movingBrandId === targetBrandId) {
      setMovingBrandId(null);
      return;
    }

    const currentBrands = [...data.brands];
    const sourceIndex = currentBrands.findIndex(b => b.id === movingBrandId);
    const targetIndex = currentBrands.findIndex(b => b.id === targetBrandId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setMovingBrandId(null);
      return;
    }

    // Reorder sequences
    const sourceBrand = currentBrands[sourceIndex];
    const targetBrand = currentBrands[targetIndex];

    // Update in Firebase
    Promise.all([
      updateDoc(doc(db, 'brands', sourceBrand.id), { sequence: targetBrand.sequence }),
      updateDoc(doc(db, 'brands', targetBrand.id), { sequence: sourceBrand.sequence })
    ]).then(() => {
      showToast("✅ Brand reordered!", "success");
      setRefreshKey(prev => prev + 1);
    }).catch(err => {
      showToast("Error reordering: " + err.message, "error");
    }).finally(() => {
      setMovingBrandId(null);
    });
  };

  const cancelMove = () => {
    setMovingBrandId(null);
  };

  // ========== RENDER ==========
  if (isSplash || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] via-[#1a1a1a] to-[#000000] flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full animate-ping opacity-20"></div>
              <div className="relative z-10 w-32 h-32 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-full flex items-center justify-center shadow-2xl border-4 border-[#d4af37]/30">
                <Crown size={60} className="text-black" />
              </div>
            </div>
            <Heart size={30} className="text-[#d4af37] absolute -top-2 -right-2 animate-bounce" fill="currentColor" />
          </div>

          <h1 className="text-[#d4af37] text-4xl font-black tracking-[0.2em] mb-3">SALES MONARCH</h1>
          <p className="text-white/70 text-lg font-light tracking-wider mb-8">for my soul</p>

          <div className="w-64 h-1.5 bg-white/10 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#d4af37] via-[#f5e7a3] to-[#b8860b] animate-progress"></div>
          </div>

          <p className="text-white/30 text-xs mt-6 tracking-widest">version 2.0</p>
        </div>
      </div>
    );
  }

  // ========== APP INFO SCREEN ==========
  if (showAppInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-black dark:via-[#1a1a1a] dark:to-[#000000] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#d4af37]/20 dark:bg-[#d4af37]/5 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#b8860b]/20 dark:bg-[#b8860b]/5 rounded-full filter blur-3xl"></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-xl text-black">
                <Crown size={24} />
              </div>
              <div>
                <h1 className="text-[#d4af37] text-xl font-black">SALES MONARCH</h1>
                <p className="text-gray-600 dark:text-white/60 text-[10px] font-bold">PROFESSIONAL EDITION</p>
              </div>
            </div>
            <button
              onClick={() => setShowAppInfo(false)}
              className="p-2 bg-gray-200 dark:bg-white/10 rounded-lg text-gray-700 dark:text-white/60 hover:bg-gray-300 dark:hover:bg-white/20 transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-3 rounded-xl border border-[#d4af37]/20">
              <Store size={20} className="text-[#d4af37] mb-2" />
              <h3 className="text-gray-900 dark:text-white text-xs font-black mb-1">Shop Management</h3>
              <p className="text-gray-600 dark:text-white/50 text-[9px]">Add, track & manage all your shops with route filtering</p>
            </div>
            <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-3 rounded-xl border border-[#d4af37]/20">
              <Receipt size={20} className="text-[#d4af37] mb-2" />
              <h3 className="text-gray-900 dark:text-white text-xs font-black mb-1">Smart Invoicing</h3>
              <p className="text-gray-600 dark:text-white/50 text-[9px]">Create bills, print, share via WhatsApp with location</p>
            </div>
            <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-3 rounded-xl border border-[#d4af37]/20">
              <BarChart3 size={20} className="text-[#d4af37] mb-2" />
              <h3 className="text-gray-900 dark:text-white text-xs font-black mb-1">Analytics</h3>
              <p className="text-gray-600 dark:text-white/50 text-[9px]">Daily & monthly sales, expenses, brand performance</p>
            </div>
            <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-3 rounded-xl border border-[#d4af37]/20">
              <Target size={20} className="text-[#d4af37] mb-2" />
              <h3 className="text-gray-900 dark:text-white text-xs font-black mb-1">Target Tracking</h3>
              <p className="text-gray-600 dark:text-white/50 text-[9px]">Set revenue/unit targets & track progress</p>
            </div>
            <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-3 rounded-xl border border-[#d4af37]/20">
              <MapPin size={20} className="text-[#d4af37] mb-2" />
              <h3 className="text-gray-900 dark:text-white text-xs font-black mb-1">Location Tracking</h3>
              <p className="text-gray-600 dark:text-white/50 text-[9px]">Save shop locations & share in bills</p>
            </div>
            <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-3 rounded-xl border border-[#d4af37]/20">
              <WifiOff size={20} className="text-[#d4af37] mb-2" />
              <h3 className="text-gray-900 dark:text-white text-xs font-black mb-1">Offline Mode</h3>
              <p className="text-gray-600 dark:text-white/50 text-[9px]">Work without internet, sync when online</p>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-3 rounded-xl border border-[#d4af37]/20 mb-6">
            <h3 className="text-gray-900 dark:text-white text-xs font-black mb-3">Your Stats</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[#d4af37] text-lg font-black">{data.shops.length}</p>
                <p className="text-gray-600 dark:text-white/50 text-[8px] font-bold">Shops</p>
              </div>
              <div>
                <p className="text-[#d4af37] text-lg font-black">{data.orders.length}</p>
                <p className="text-gray-600 dark:text-white/50 text-[8px] font-bold">Orders</p>
              </div>
              <div>
                <p className="text-[#d4af37] text-lg font-black">{data.brands.length}</p>
                <p className="text-gray-600 dark:text-white/50 text-[8px] font-bold">Brands</p>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-3 rounded-xl border border-[#d4af37]/20 mb-6">
            <h3 className="text-gray-900 dark:text-white text-xs font-black mb-2 flex items-center gap-1">
              <Sparkles size={14} className="text-[#d4af37]" /> Quick Tips
            </h3>
            <div className="space-y-1 text-[9px] text-gray-600 dark:text-white/60">
              <p className="flex items-start gap-1">• Tap crown logo to view this info anytime</p>
              <p className="flex items-start gap-1">• Use gold + button for quick actions</p>
              <p className="flex items-start gap-1">• Long press on brands to reorder</p>
              <p className="flex items-start gap-1">• Share bills with location for delivery</p>
              <p className="flex items-start gap-1">• Works offline - syncs automatically</p>
            </div>
          </div>

          {/* Version */}
          <div className="text-center">
            <p className="text-gray-500 dark:text-white/30 text-[9px] font-bold">VERSION 2.0.0</p>
            <p className="text-gray-500 dark:text-white/30 text-[8px] mt-1">© 2025 SALES MONARCH. All rights reserved.</p>
          </div>

          <button
            onClick={() => setShowAppInfo(false)}
            className="w-full mt-4 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-xl text-sm hover:opacity-90 transition-all"
          >
            BACK TO APP
          </button>
        </div>
      </div>
    );
  }

  // ========== LOGIN SCREEN ==========
  if (!user && showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-black dark:to-[#000000] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] rounded-2xl border border-[#d4af37]/30 p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Crown size={40} className="text-black" />
            </div>
            <h2 className="text-gray-900 dark:text-white font-black text-xl">Reset Password</h2>
            <p className="text-gray-600 dark:text-white/50 text-xs mt-2">Enter your email to receive reset link</p>
          </div>

          {resetSuccess ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-500/20 rounded-xl border border-green-200 dark:border-green-500/30 text-center">
                <CheckCircle2 size={40} className="text-green-600 dark:text-green-500 mx-auto mb-2" />
                <p className="text-green-700 dark:text-green-500 font-bold">Reset link sent!</p>
                <p className="text-gray-600 dark:text-white/50 text-xs mt-2">Check your email inbox</p>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSuccess(false);
                  setResetEmail('');
                }}
                className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-xl text-sm hover:opacity-90 transition-all"
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
                className="w-full bg-gray-50 dark:bg-black/50 p-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:border-[#d4af37] transition-all font-medium"
              />
              <button
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className={`w-full py-3 font-black rounded-xl text-sm transition-all ${
                  isSendingReset 
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400' 
                    : 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black hover:opacity-90'
                }`}
              >
                {isSendingReset ? 'SENDING...' : 'SEND RESET LINK'}
              </button>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-full py-2 text-gray-600 dark:text-white/60 text-sm hover:text-gray-900 dark:hover:text-white transition-all font-medium"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-black dark:via-[#1a1a1a] dark:to-[#000000] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] rounded-2xl border border-[#d4af37]/30 p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="relative inline-block mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-full flex items-center justify-center shadow-lg">
                <Crown size={40} className="text-black" />
              </div>
              <Heart size={16} className="text-[#d4af37] absolute -top-1 -right-1 animate-bounce" fill="currentColor" />
            </div>
            <h2 className="text-gray-900 dark:text-white font-black text-xl mb-1">
              {isRegisterMode ? "SIGN UP" : "SIGN IN"}
            </h2>
            <p className="text-[#d4af37] text-xs font-bold">
              {isRegisterMode ? "Create your account" : "Welcome back"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              name="email"
              type="email"
              placeholder="EMAIL"
              className="w-full bg-gray-50 dark:bg-black/50 p-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:border-[#d4af37] transition-all font-medium"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="PASSWORD"
              className="w-full bg-gray-50 dark:bg-black/50 p-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm outline-none focus:border-[#d4af37] transition-all font-medium"
              required
            />

            {loginError && (
              <div className="p-3 bg-red-50 dark:bg-red-500/20 rounded-xl border border-red-200 dark:border-red-500/30">
                <p className="text-red-700 dark:text-red-500 text-xs text-center font-bold">{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-xl text-sm hover:opacity-90 transition-all"
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
                className="text-[#d4af37] text-xs font-bold hover:text-[#b8860b] transition-all"
              >
                {isRegisterMode ? "← SIGN IN" : "SIGN UP"}
              </button>

              {!isRegisterMode && (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-gray-600 dark:text-white/60 text-xs font-medium hover:text-gray-900 dark:hover:text-[#d4af37] transition-all"
                >
                  Forgot?
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ========== MAIN APP ==========
  return (
    <div className={`min-h-screen pb-16 ${
      isDarkMode
        ? "bg-gradient-to-br from-[#000000] via-[#1a1a1a] to-[#000000] text-white"
        : "bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 text-gray-900"
    }`}>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl shadow-2xl backdrop-blur-xl border flex items-center gap-2 text-xs font-bold ${
          toast.type === 'success' 
            ? 'bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-500 border-green-200 dark:border-green-500/30' 
            : toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-500 border-red-200 dark:border-red-500/30'
              : 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-500 border-blue-200 dark:border-blue-500/30'
        }`}>
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          {toast.type === 'error' && <AlertCircle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Offline Indicator */}
      {isOffline && (
        <div className="fixed top-14 left-1/2 transform -translate-x-1/2 z-[90] px-3 py-1 bg-yellow-50 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 rounded-full border border-yellow-200 dark:border-yellow-500/30 text-[10px] font-bold flex items-center gap-1 shadow-lg">
          <WifiOff size={12} />
          OFFLINE
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[1000] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gradient-to-br dark:from-[#1a1a1a] dark:to-[#000000] w-full max-w-xs p-5 rounded-2xl border border-red-200 dark:border-red-500/30 shadow-xl">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-red-200 dark:border-red-500/30">
                <Trash2 size={30} className="text-red-600 dark:text-red-500" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-black text-base">Confirm Delete</h3>
              <p className="text-gray-600 dark:text-white/60 text-xs mt-2 font-medium">{showDeleteConfirm.name}</p>
              <p className="text-red-600 dark:text-red-500 text-[10px] font-bold mt-3">This cannot be undone!</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white font-black rounded-lg text-xs hover:opacity-90 transition-all"
              >
                DELETE
              </button>
              <button
                onClick={() => setShowDeleteConfirm({ show: false, id: null, type: '', name: '' })}
                className="flex-1 py-2 bg-gray-200 dark:bg-gradient-to-br dark:from-[#333] dark:to-[#444] text-gray-700 dark:text-white/80 font-black rounded-lg text-xs hover:opacity-90 transition-all"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOP ORDERS VIEW MODAL */}
      {viewingShopOrders && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[200] flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-4 rounded-2xl border border-[#d4af37]/30 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-[#d4af37] text-sm">SHOP ORDERS</h3>
              <button onClick={() => setViewingShopOrders(null)} className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 p-1 transition-all">
                <X size={18}/>
              </button>
            </div>

            <p className="text-gray-900 dark:text-white font-black text-sm mb-1">{viewingShopOrders.shop.name}</p>
            <p className="text-gray-600 dark:text-white/40 text-[10px] font-medium mb-4">{viewingShopOrders.shop.area}</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-200 dark:border-white/10">
                <p className="text-[9px] text-gray-600 dark:text-white/60 font-medium">Total Sales</p>
                <p className="text-sm font-black text-[#d4af37]">Rs.{viewingShopOrders.stats.totalSales.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-200 dark:border-white/10">
                <p className="text-[9px] text-gray-600 dark:text-white/60 font-medium">Total Orders</p>
                <p className="text-sm font-black text-[#d4af37]">{viewingShopOrders.stats.orderCount}</p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto mb-4">
              {viewingShopOrders.orders.slice(0, 10).map((order, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg mb-2 border border-gray-200 dark:border-white/10">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-700 dark:text-white font-medium">{new Date(order.timestamp).toLocaleDateString()}</span>
                    <span className="text-[#d4af37] font-black">Rs.{order.total.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => {
                        setViewingShopOrders(null);
                        printBill(order);
                      }}
                      className="text-[8px] bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-500 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-blue-500/30 transition-all font-black"
                    >
                      Print
                    </button>
                    <button
                      onClick={() => {
                        setViewingShopOrders(null);
                        shareToWhatsApp(order, false);
                      }}
                      className="text-[8px] bg-[#d4af37]/20 text-[#d4af37] px-2 py-1 rounded hover:bg-[#d4af37]/30 transition-all font-black"
                    >
                      Share
                    </button>
                    <button
                      onClick={() => {
                        setViewingShopOrders(null);
                        shareToWhatsApp(order, true);
                      }}
                      className="text-[8px] bg-green-50 dark:bg-green-500/20 text-green-700 dark:text-green-500 px-2 py-1 rounded hover:bg-green-100 dark:hover:bg-green-500/30 transition-all font-black"
                    >
                      <MapPin size={8}/> Loc
                    </button>
                    <button
                      onClick={() => confirmDelete(order.id, 'order', '')}
                      className="text-[8px] bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-500 px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-500/30 transition-all font-black"
                    >
                      <Trash2 size={8}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setSelectedShop(viewingShopOrders.shop);
                setViewingShopOrders(null);
                setShowModal('invoice');
              }}
              className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all"
            >
              NEW ORDER
            </button>
          </div>
        </div>
      )}

      {/* Shop Profile View Modal */}
      {viewingShopProfile && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[150] flex items-center justify-center p-3">
          <div className="w-full max-w-xs bg-white dark:bg-gradient-to-br dark:from-[#0f0f0f] dark:to-[#1a1a1a] p-4 rounded-2xl border border-[#d4af37]/30 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-[#d4af37] text-sm">SHOP PROFILE</h3>
              <button onClick={() => setViewingShopProfile(null)} className="text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60 p-1 transition-all">
                <X size={18}/>
              </button>
            </div>

            <p className="text-gray-900 dark:text-white font-black text-sm mb-3">{viewingShopProfile.shop.name}</p>

            {viewingShopProfile.profile ? (
              <div className="space-y-2 text-xs">
                <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-200 dark:border-white/10">
                  <p className="text-[9px] text-gray-600 dark:text-white/60 font-medium mb-1">Owner</p>
                  <p className="text-gray-900 dark:text-white font-bold">{viewingShopProfile.profile.ownerName || 'Not set'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-200 dark:border-white/10">
                  <p className="text-[9px] text-gray-600 dark:text-white/60 font-medium mb-1">Phone</p>
                  <p className="text-gray-900 dark:text-white font-bold">{viewingShopProfile.profile.phone || 'Not set'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-white/5 p-2 rounded-lg border border-gray-200 dark:border-white/10">
                  <p className="text-[9px] text-gray-600 dark:text-white/60 font-medium mb-1">Address</p>
                  <p className="text-gray-900 dark:text-white font-bold">{viewingShopProfile.profile.address || 'Not set'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-white/60 text-xs text-center py-4 font-medium">No profile found</p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`p-3 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl border-b ${
        isDarkMode 
          ? "bg-black/90 border-[#d4af37]/20" 
          : "bg-white/90 border-[#d4af37]/30"
      }`}>
        <button onClick={() => setShowAppInfo(true)} className="flex items-center gap-2">
          <div className="relative">
            <div className="p-1.5 bg-gradient-to-br from-[#d4af37] to-[#b8860b] rounded-lg text-black">
              <Crown size={18} />
            </div>
            <Heart size={8} className="text-[#d4af37] absolute -top-1 -right-1" fill="currentColor" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight uppercase text-[#d4af37]">
              {data.settings.company || "SALES MONARCH"}
            </h1>
            <p className={`text-[9px] font-bold uppercase ${
              isDarkMode ? 'text-white/60' : 'text-gray-600'
            }`}>
              {data.settings.name || "Rep"}
            </p>
          </div>
        </button>

        <div className="flex gap-1">
          {isOffline ? (
            <div className="p-1.5 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 rounded-lg border border-yellow-200 dark:border-yellow-500/20">
              <WifiOff size={16} />
            </div>
          ) : (
            <div className="p-1.5 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-500 rounded-lg border border-green-200 dark:border-green-500/20">
              <Wifi size={16} />
            </div>
          )}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-1.5 rounded-lg border transition-all ${
              isDarkMode 
                ? "bg-white/5 text-[#d4af37] border-white/10 hover:bg-[#d4af37]/20" 
                : "bg-gray-100 text-[#d4af37] border-gray-200 hover:bg-[#d4af37]/10"
            }`}
          >
            {isDarkMode ? <Sun size={16}/> : <Moon size={16}/>}
          </button>
          <button
            onClick={() => signOut(auth)}
            className="p-1.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-500 rounded-lg border border-red-200 dark:border-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
          >
            <LogOut size={16}/>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 max-w-lg mx-auto space-y-3">

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-3">
            {/* Today's Revenue Card */}
            <div className="bg-gradient-to-br from-[#d4af37] via-[#c19a2e] to-[#b8860b] p-4 rounded-xl text-black shadow-xl border border-[#b8860b]/30">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-[9px] font-black uppercase opacity-80">Today's Revenue</p>
                  <h2 className="text-xl font-black">Rs.{stats.daily.totalSales.toLocaleString()}</h2>
                </div>
                <div className="bg-black/20 p-1.5 rounded-lg text-right border border-white/20">
                  <p className="text-[8px] font-black uppercase">Expenses</p>
                  <p className="text-sm font-black text-red-800">- Rs.{stats.expenses.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="bg-black/10 px-2 py-1 rounded-full text-[9px] font-black border border-white/20">
                  Net: Rs.{(stats.daily.totalSales - stats.expenses).toLocaleString()}
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase opacity-80">Top Brand</p>
                  <p className="text-xs font-black">{stats.daily.topBrand}</p>
                </div>
              </div>
            </div>

            {/* Today's Sales */}
            <div className={`p-4 rounded-xl border shadow-lg ${
              isDarkMode 
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" 
                : "bg-black text-white border-gray-800"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg border ${
                  isDarkMode 
                    ? "bg-[#d4af37]/10 border-[#d4af37]/20" 
                    : "bg-[#d4af37]/20 border-[#d4af37]/30"
                }`}>
                  <TrendingUp size={14} className="text-[#d4af37]" />
                </div>
                <h3 className={`text-sm font-black uppercase tracking-wider text-[#d4af37]`}>Today's Sales</h3>
              </div>

              {stats.daily.summary.length > 0 ? (
                <div className="space-y-2">
                  {stats.daily.summary.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 font-medium">x{item.units}</span>
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5 font-medium">
                          @ Rs.{item.avgPrice.toFixed(0)} per unit
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-[#d4af37]">Rs.{item.revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <ShoppingBag size={30} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-xs text-gray-400 italic font-medium">No sales today</p>
                </div>
              )}
            </div>

            {/* Today's Expenses */}
            <div className={`p-4 rounded-xl border shadow-lg ${
              isDarkMode 
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" 
                : "bg-black text-white border-gray-800"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${
                    isDarkMode 
                      ? "bg-red-500/10 border-red-500/20" 
                      : "bg-red-500/20 border-red-500/30"
                  }`}>
                    <Wallet size={14} className={isDarkMode ? "text-red-500" : "text-red-400"} />
                  </div>
                  <h3 className={`text-sm font-black uppercase tracking-wider ${
                    isDarkMode ? "text-red-500" : "text-red-400"
                  }`}>Today's Expenses</h3>
                </div>
                <span className={`text-base font-black ${
                  isDarkMode ? "text-red-500" : "text-red-400"
                }`}>Rs.{stats.expenses.toLocaleString()}</span>
              </div>

              <div className="space-y-3">
                {stats.todayExpenses.length > 0 ? (
                  <>
                    {/* Expense Summary by Type */}
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(stats.expensesByType).map(([type, amount]) => (
                        <div key={type} className="bg-gray-900 p-2 rounded-lg text-center border border-gray-800">
                          <p className="text-[8px] text-gray-400 uppercase font-bold mb-1">{type}</p>
                          <p className={`text-xs font-bold ${
                            isDarkMode ? "text-red-400" : "text-red-400"
                          }`}>Rs.{amount.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>

                    {/* Individual Expenses */}
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {stats.todayExpenses.map((exp, idx) => (
                        <div key={idx} className="flex justify-between items-center py-1.5 border-b border-gray-800 last:border-0">
                          <div className="flex items-center gap-2">
                            {exp.type === 'fuel' && <Fuel size={10} className={isDarkMode ? "text-red-500" : "text-red-400"} />}
{exp.type === 'food' && <Coffee size={10} className="text-[#d4af37]"} />}                            {exp.type === 'transport' && <Navigation size={10} className={isDarkMode ? "text-blue-500" : "text-blue-400"} />}
                            <span className="text-[10px] font-bold text-white capitalize">{exp.type}</span>
                            {exp.note && <span className="text-[8px] text-gray-400 font-medium">- {exp.note}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">Rs.{exp.amount.toLocaleString()}</span>
                            <button
                              onClick={() => confirmDelete(exp.id, 'expense', `${exp.type} expense`)}
                              className="text-red-500 hover:text-red-600 p-0.5"
                            >
                              <XCircle size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <CreditCard size={30} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-xs text-gray-400 italic font-medium">No expenses today</p>
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Targets */}
            {stats.targets.length > 0 && (
              <div className={`p-4 rounded-xl border shadow-lg ${
                isDarkMode 
                  ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30" 
                  : "bg-black border-[#d4af37]/30"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${
                      isDarkMode 
                        ? "bg-[#d4af37]/10 border-[#d4af37]/20" 
                        : "bg-[#d4af37]/20 border-[#d4af37]/30"
                    }`}>
                      <Target size={14} className="text-[#d4af37]" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-[#d4af37]">Targets ({stats.targets.length})</h3>
                  </div>
                  <button
                    onClick={() => setShowTargetModal(true)}
                    className={`px-2 py-1 rounded-lg text-[8px] font-black transition-all ${
                      isDarkMode 
                        ? "bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/30" 
                        : "bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/30"
                    }`}
                  >
                    + ADD
                  </button>
                </div>

                <div className="space-y-3 max-h-40 overflow-y-auto">
                  {stats.targets.map((target, idx) => (
                    <div key={idx} className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-white">
                          {target.specific === 'brand' ? target.brand : 'Total'}
                          ({target.type === 'revenue' ? 'Rs' : 'Units'})
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => editTarget(target)}
                            className="p-0.5 text-blue-500 hover:bg-blue-500/10 rounded"
                          >
                            <Edit2 size={8} />
                          </button>
                          <button
                            onClick={() => confirmDelete(target.id, 'target', target.brand || 'Target')}
                            className="p-0.5 text-red-500 hover:bg-red-500/10 rounded"
                          >
                            <Trash2 size={8} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[8px] mb-1">
                        <span className="text-gray-400 font-medium">Progress:</span>
                        <span className="font-bold text-white">{target.achieved.toLocaleString()} / {target.amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#d4af37] to-[#b8860b]"
                          style={{ width: `${Math.min(target.progress, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly Performance */}
            <div className={`p-4 rounded-xl border shadow-lg ${
              isDarkMode 
                ? "bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-white/10" 
                : "bg-black text-white border-gray-800"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${
                    isDarkMode 
                      ? "bg-[#d4af37]/10 border-[#d4af37]/20" 
                      : "bg-[#d4af37]/20 border-[#d4af37]/30"
                  }`}>
                    <BarChart3 size={14} className="text-[#d4af37]" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-[#d4af37]">Monthly Performance</h3>
                </div>
                <button
                  onClick={() => setShowAllMonthlyBrands(!showAllMonthlyBrands)}
                  className={`px-2 py-1 rounded-lg text-[8px] font-black transition-all ${
                    isDarkMode 
                      ? "bg-white/10 text-white hover:bg-white/20" 
                      : "bg-gray-800 text-white hover:bg-gray-700"
                  }`}
                >
                  {showAllMonthlyBrands ? 'Show Less' : 'Show All'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                  <p className="text-[8px] text-gray-400 font-medium">Total Sales</p>
                  <p className="text-base font-black text-[#d4af37]">Rs.{stats.monthlySales.toLocaleString()}</p>
                </div>
                <div className="bg-gray-900 p-2 rounded-lg border border-gray-800">
                  <p className="text-[8px] text-gray-400 font-medium">Total Units</p>
                  <p className="text-base font-black text-[#d4af37]">{stats.monthly.totalUnits}</p>
                </div>
              </div>

              {/* Brand-wise Performance */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Brand Performance</p>

                {stats.monthly.summary.slice(0, showAllMonthlyBrands ? undefined : 5).map((brand, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    idx === 0
                      ? (isDarkMode 
                          ? 'bg-[#d4af37]/10 border-[#d4af37]/40' 
                          : 'bg-[#d4af37]/10 border-[#d4af37]/40')
                      : 'bg-gray-900 border-gray-800'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {idx === 0 && <Trophy size={12} className="text-[#d4af37]" />}
                          <span className="text-xs font-bold text-white">{brand.name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[8px] text-gray-400 font-medium border-r border-gray-700 pr-2">{brand.units} units</span>
                          <span className="text-[8px] text-gray-400 font-medium">@ Rs.{brand.avgPrice.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="text-right border-l border-gray-700 pl-3">
                        <p className="text-sm font-black text-[#d4af37]">Rs.{brand.revenue.toLocaleString()}</p>
                        <p className="text-[7px] text-gray-400 mt-0.5 font-medium">
                          {stats.monthly.totalSales > 0 ? ((brand.revenue / stats.monthly.totalSales) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {stats.monthly.summary.length === 0 && (
                  <div className="text-center py-6">
                    <Package2 size={30} className="mx-auto text-gray-600 mb-2" />
                    <p className="text-xs text-gray-400 italic font-medium">No monthly sales data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SHOPS TAB */}
        {activeTab === 'shops' && (
          <div className="space-y-3">
            {/* Search and Add Shop Row */}
            <div className="flex gap-2">
              <div className={`flex-1 p-2 rounded-xl border flex items-center gap-2 ${
                isDarkMode 
                  ? "bg-[#0f0f0f] border-white/10" 
                  : "bg-black border-gray-800"
              }`}>
                <Search size={14} className={isDarkMode ? "text-white/30" : "text-gray-500"}/>
                <input
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  placeholder="SEARCH SHOPS..."
                  className="bg-transparent text-[10px] font-bold uppercase outline-none w-full text-white placeholder-gray-500"
                />
              </div>
              <button
                onClick={() => setShowModal('shop')}
                className={`px-3 py-2 rounded-xl border font-black text-xs flex items-center gap-1 transition-all ${
                  isDarkMode 
                    ? 'bg-[#1a1a1a] border-white/10 text-[#d4af37] hover:bg-[#d4af37]/10' 
                    : 'bg-black border-gray-800 text-[#d4af37] hover:bg-[#d4af37]/10'
                }`}
              >
                <Plus size={14} /> ADD
              </button>
            </div>

            {/* Route Filter */}
            <div className="flex gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedRouteFilter('ALL')}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap border transition-all flex-shrink-0 ${
                  selectedRouteFilter === 'ALL'
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]'
                    : isDarkMode 
                      ? 'bg-[#1a1a1a] border-white/10 text-white/60 hover:bg-white/10' 
                      : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'
                }`}>
                ALL
              </button>
              {data.routes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRouteFilter(r.name)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase whitespace-nowrap border transition-all flex-shrink-0 ${
                    selectedRouteFilter === r.name
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]'
                      : isDarkMode 
                        ? 'bg-[#1a1a1a] border-white/10 text-white/60 hover:bg-white/10' 
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}>
                  {r.name}
                </button>
              ))}
            </div>

            {/* Shop List */}
            <div className="space-y-2">
              {filteredShops.map(s => {
                const shopStats = getShopStats(s.id);
                const shopProfile = getShopProfile(s.id);

                return (
                  <div
                    key={s.id}
                    className={`p-3 rounded-xl border ${
                      isDarkMode 
                        ? "bg-[#0f0f0f] border-white/5" 
                        : "bg-black border-gray-800"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-sm font-black uppercase text-white">{s.name}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-medium">{s.area}</p>
                      </div>
                      <div className="relative">
                        <button
                          onClick={() => setShowShopMenu(showShopMenu === s.id ? null : s.id)}
                          className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {showShopMenu === s.id && (
                          <div className="absolute right-0 top-full mt-1 w-32 bg-black border border-[#d4af37]/30 rounded-lg shadow-xl z-50">
                            <div className="p-1">
                              <button
                                onClick={() => {
                                  setShowShopMenu(null);
                                  viewShopOrders(s);
                                }}
                                className="w-full px-3 py-1.5 text-left text-[9px] font-black uppercase text-white hover:bg-gray-800 rounded flex items-center gap-1 transition-all"
                              >
                                <History size={10} className="text-blue-500"/> Orders
                              </button>
                              <button
                                onClick={() => {
                                  setShowShopMenu(null);
                                  viewShopProfile(s);
                                }}
                                className="w-full px-3 py-1.5 text-left text-[9px] font-black uppercase text-white hover:bg-gray-800 rounded flex items-center gap-1 transition-all"
                              >
                                <Eye size={10} className="text-green-500"/> Profile
                              </button>
                              {shopProfile ? (
                                <button
                                  onClick={() => {
                                    setShowShopMenu(null);
                                    editShopProfile(shopProfile);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-[9px] font-black uppercase text-white hover:bg-gray-800 rounded flex items-center gap-1 transition-all"
                                >
                                  <Edit2 size={10} className="text-blue-500"/> Edit
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setShowShopMenu(null);
                                    setSelectedShop(s);
                                    setShowModal('shopProfile');
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-[9px] font-black uppercase text-white hover:bg-gray-800 rounded flex items-center gap-1 transition-all"
                                >
                                  <Plus size={10} className="text-[#d4af37]"/> Add Profile
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setShowShopMenu(null);
                                  confirmDelete(s.id, 'shop', s.name);
                                }}
                                className="w-full px-3 py-1.5 text-left text-[9px] font-black uppercase text-red-500 hover:bg-red-500/10 rounded flex items-center gap-1 transition-all"
                              >
                                <Trash2 size={10}/> Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[9px] mb-2">
                      <span className="text-gray-400 font-medium">Total: <span className="font-black text-[#d4af37]">Rs.{shopStats.totalSales.toLocaleString()}</span></span>
                      <span className="text-gray-400 font-medium">Orders: <span className="font-black text-[#d4af37]">{shopStats.orderCount}</span></span>
                    </div>

                    {/* Compact GOLD BILL BUTTON */}
                    <button
                      onClick={() => {
                        setSelectedShop(s);
                        setShowModal('invoice');
                      }}
                      className="w-full py-1.5 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-[9px] uppercase flex items-center justify-center gap-1 hover:opacity-90 transition-all"
                    >
                      <Receipt size={12} /> BILL
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              isDarkMode 
                ? "bg-[#0f0f0f] border-white/10" 
                : "bg-black border-gray-800"
            }`}>
              <Calendar size={14} className="text-[#d4af37]"/>
              <input
                type="date"
                className="bg-transparent text-[10px] font-bold uppercase outline-none w-full text-white"
                onChange={(e) => setSearchDate(e.target.value)}
                value={searchDate}
              />
            </div>

            {/* Regular Orders */}
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
              <div key={o.id} className={`p-3 rounded-xl border ${
                isDarkMode 
                  ? "bg-[#0f0f0f] border-white/5" 
                  : "bg-black border-gray-800"
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#d4af37]">{o.shopName}</h4>
                    <p className="text-[8px] text-gray-400 font-medium">{o.companyName}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => printBill(o)} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded transition-all">
                      <Printer size={12}/>
                    </button>
                    <button onClick={() => shareToWhatsApp(o, false)} className="p-1 text-[#d4af37] hover:bg-[#d4af37]/10 rounded transition-all">
                      <Share2 size={12}/>
                    </button>
                    <button onClick={() => shareToWhatsApp(o, true)} className="p-1 text-green-500 hover:bg-green-500/10 rounded transition-all">
                      <MapPin size={12}/>
                    </button>
                    <button onClick={() => confirmDelete(o.id, 'order', '')} className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-all">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-[9px] mb-2">
                  {o.items?.map((i, k) => (
                    <div key={k} className="flex justify-between text-gray-300">
                      <span className="font-medium">{i.name} x{i.qty}</span>
                      <span className="font-black">Rs.{i.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center border-t border-gray-800 pt-2">
                  <span className="text-[9px] text-gray-400 font-medium">Total</span>
                  <span className="text-sm font-black text-[#d4af37]">Rs.{o.total.toLocaleString()}</span>
                </div>
              </div>
            ))}

            {/* Manual Orders in History */}
            {data.orders
              .filter(o => o.isManual && new Date(o.timestamp).toISOString().split('T')[0] === searchDate)
              .map((o) => (
              <div key={o.id} className={`p-3 rounded-xl border ${
                isDarkMode 
                  ? "bg-[#0f0f0f] border-purple-500/30" 
                  : "bg-black border-purple-500/30"
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-xs font-black uppercase text-purple-500">{o.shopName}</h4>
                    <p className="text-[8px] text-gray-400 font-medium">{o.companyName}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => printBill(o)} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded transition-all">
                      <Printer size={12}/>
                    </button>
                    <button onClick={() => shareToWhatsApp(o, false)} className="p-1 text-purple-500 hover:bg-purple-500/10 rounded transition-all">
                      <Share2 size={12}/>
                    </button>
                    <button onClick={() => confirmDelete(o.id, 'order', '')} className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-all">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-[9px] mb-2">
                  {o.items?.map((i, k) => (
                    <div key={k} className="flex justify-between text-gray-300">
                      <span className="font-medium">{i.name} x{i.qty}</span>
                      <span className="font-black">Rs.{i.subtotal.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center border-t border-gray-800 pt-2">
                  <span className="text-[9px] text-gray-400 font-medium">Manual Order Total</span>
                  <span className="text-sm font-black text-purple-500">Rs.{o.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              isDarkMode 
                ? "bg-[#0f0f0f] border-white/10" 
                : "bg-black border-gray-800"
            }`}>
              <Calendar size={14} className="text-[#d4af37]"/>
              <input
                type="date"
                className="bg-transparent text-[10px] font-bold uppercase outline-none w-full text-white"
                onChange={(e) => setNoteSearchDate(e.target.value)}
                value={noteSearchDate}
              />
              <button
                onClick={() => setShowModal('note')}
                className="bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black px-2 py-1 rounded-lg text-[9px] font-black hover:opacity-90 transition-all"
              >
                ADD
              </button>
            </div>

            {filteredNotes.map((note) => (
              <div key={note.id} className={`p-3 rounded-xl border ${
                isDarkMode 
                  ? "bg-[#0f0f0f] border-white/5" 
                  : "bg-black border-gray-800"
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-gray-500"/>
                    <span className="text-[8px] text-gray-400 font-medium">
                      {new Date(note.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <button
                    onClick={() => confirmDelete(note.id, 'note', '')}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-all"
                  >
                    <Trash2 size={10}/>
                  </button>
                </div>
                <p className="text-[10px] text-white font-medium">{note.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-3 pb-16">
            {/* Profile Form */}
            <form onSubmit={handleSaveProfile} className={`p-3 rounded-xl border ${
              isDarkMode 
                ? "bg-[#0f0f0f] border-white/10" 
                : "bg-black border-gray-800"
            }`}>
              <h3 className="text-xs font-black uppercase mb-2 text-[#d4af37]">Profile</h3>
              <div className="space-y-2">
                <input
                  name="repName"
                  defaultValue={data.settings.name}
                  placeholder="YOUR NAME"
                  className={`w-full p-2 rounded-lg border text-[10px] font-bold uppercase outline-none ${
                    isDarkMode 
                      ? 'bg-[#1a1a1a] border-white/5 text-white placeholder-white/30' 
                      : 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                  }`}
                />
                <input
                  name="companyName"
                  defaultValue={data.settings.company}
                  placeholder="COMPANY"
                  className={`w-full p-2 rounded-lg border text-[10px] font-bold uppercase outline-none ${
                    isDarkMode 
                      ? 'bg-[#1a1a1a] border-white/5 text-white placeholder-white/30' 
                      : 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
                  }`}
                />
                <button type="submit" className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black rounded-lg text-[10px] flex items-center justify-center gap-1 hover:opacity-90 transition-all">
                  <Save size={12}/> SAVE
                </button>
              </div>
            </form>

            {/* Quick Add */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setShowModal('route')}
                className={`py-2 rounded-xl border font-black text-[9px] flex flex-col items-center transition-all ${
                  isDarkMode 
                    ? 'bg-[#1a1a1a] border-white/5 text-[#d4af37] hover:bg-[#d4af37]/10' 
                    : 'bg-black border-gray-800 text-[#d4af37] hover:bg-[#d4af37]/10'
                }`}
              >
                <MapPin size={14}/> ROUTE
              </button>
              <button
                onClick={() => setShowModal('brand')}
                className={`py-2 rounded-xl border font-black text-[9px] flex flex-col items-center transition-all ${
                  isDarkMode 
                    ? 'bg-[#1a1a1a] border-white/5 text-[#d4af37] hover:bg-[#d4af37]/10' 
                    : 'bg-black border-gray-800 text-[#d4af37] hover:bg-[#d4af37]/10'
                }`}
              >
                <Package size={14}/> BRAND
              </button>
              <button
                onClick={() => setShowModal('manual')}
                className={`py-2 rounded-xl border font-black text-[9px] flex flex-col items-center transition-all ${
                  isDarkMode 
                    ? 'bg-[#1a1a1a] border-white/5 text-[#d4af37] hover:bg-[#d4af37]/10' 
                    : 'bg-black border-gray-800 text-[#d4af37] hover:bg-[#d4af37]/10'
                }`}
              >
                <ShoppingBag size={14}/> MANUAL
              </button>
            </div>

            {/* Routes List */}
            <div>
              <h4 className="text-xs font-black uppercase mb-2 text-[#d4af37]">Routes</h4>
              {data.routes.map(r => (
                <div key={r.id} className={`p-2 rounded-lg border mb-1 flex justify-between items-center ${
                  isDarkMode 
                    ? 'bg-[#1a1a1a] border-white/5' 
                    : 'bg-gray-900 border-gray-800'
                }`}>
                  <span className="text-[10px] font-bold text-white">{r.name}</span>
                  <button onClick={() => confirmDelete(r.id, 'route', r.name)} className="text-red-500 p-1 hover:bg-red-500/10 rounded transition-all">
                    <Trash2 size={12}/>
                  </button>
                </div>
              ))}
            </div>

            {/* Brands List */}
            <div>
              <h4 className="text-xs font-black uppercase mb-2 text-[#d4af37]">Brands</h4>
              {data.brands.map((b, idx) => (
                <div
                  key={b.id}
                  className={`p-2 rounded-lg border mb-1 transition-all ${
                    movingBrandId === b.id 
                      ? 'border-[#d4af37] bg-[#d4af37]/10 scale-105' 
                      : ''
                  } ${
                    isDarkMode 
                      ? 'bg-[#1a1a1a] border-white/5' 
                      : 'bg-gray-900 border-gray-800'
                  }`}
                >
                  {editingBrand === b.id ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        <input
                          value={editingBrandData.name}
                          onChange={(e) => setEditingBrandData({...editingBrandData, name: e.target.value})}
                          placeholder="NAME"
                          className="flex-1 min-w-[80px] p-1.5 text-[10px] bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 font-medium"
                        />
                        <input
                          value={editingBrandData.size}
                          onChange={(e) => setEditingBrandData({...editingBrandData, size: e.target.value})}
                          placeholder="SIZE"
                          className="w-16 p-1.5 text-[10px] bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 font-medium"
                        />
                        <input
                          value={editingBrandData.price}
                          onChange={(e) => setEditingBrandData({...editingBrandData, price: e.target.value})}
                          type="number"
                          placeholder="PRICE"
                          className="w-20 p-1.5 text-[10px] bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 font-medium"
                        />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={saveBrandEdit}
                          className="flex-1 py-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[8px] font-black rounded hover:opacity-90 transition-all"
                        >
                          SAVE
                        </button>
                        <button
                          onClick={() => {
                            setEditingBrand(null);
                            setEditingBrandData({ name: '', size: '', price: '' });
                          }}
                          className="flex-1 py-1 bg-gray-800 text-white text-[8px] font-black rounded hover:bg-gray-700 transition-all"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`w-6 h-6 rounded flex items-center justify-center font-black text-xs ${
                          isDarkMode 
                            ? 'bg-[#d4af37]/20 text-[#d4af37]' 
                            : 'bg-[#d4af37]/20 text-[#d4af37]'
                        }`}>
                          {b.sequence || idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-1">
                            <span className="text-xs font-black text-white">{b.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 font-bold">{b.size}</span>
                          </div>
                          <div className="text-[9px] font-black text-[#d4af37]">Rs.{b.price}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!isOffline && (
                          <>
                            <button
                              onClick={() => startMoveBrand(b.id, event)}
                              className={`p-1.5 rounded-lg transition-all ${
                                movingBrandId 
                                  ? 'text-green-500 hover:bg-green-500/10' 
                                  : 'text-gray-500 hover:text-white hover:bg-gray-800'
                              }`}
                              title="Move to position"
                            >
                              <ArrowUpDown size={12} />
                            </button>
                            {movingBrandId && movingBrandId !== b.id && (
                              <button
                                onClick={() => moveBrandToPosition(b.id)}
                                className="p-1.5 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-all"
                                title="Drop here"
                              >
                                <CheckCircle2 size={12} />
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={() => startEditBrand(b)}
                          className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => confirmDelete(b.id, 'brand', b.name)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {movingBrandId && (
                <button
                  onClick={cancelMove}
                  className="w-full mt-2 py-1.5 bg-red-500/20 text-red-500 rounded-lg text-[9px] font-black hover:bg-red-500/30 transition-all"
                >
                  Cancel Move
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className={`fixed bottom-2 inset-x-2 h-12 rounded-xl border flex items-center justify-around ${
        isDarkMode 
          ? "bg-black/95 border-white/10" 
          : "bg-black border-gray-800"
      }`}>
        {[
          {id: 'dashboard', icon: Home, label: 'Home'},
          {id: 'shops', icon: Store, label: 'Shops'},
          {id: 'history', icon: History, label: 'History'},
          {id: 'notes', icon: BookOpen, label: 'Notes'},
          {id: 'settings', icon: Settings, label: 'More'}
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`p-1 flex flex-col items-center transition-all ${
              activeTab === t.id 
                ? 'text-[#d4af37]'
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            <t.icon size={18} />
            <span className="text-[7px] font-black uppercase mt-0.5">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* FAB Menu */}
      <div className="fixed bottom-16 right-3 z-50">
        {isFabOpen && (
          <div className="absolute bottom-14 right-0 space-y-2">
            <button
              onClick={() => {
                setIsFabOpen(false);
                setShowModal('expense');
              }}
              className="w-10 h-10 bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full text-black flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            >
              <Wallet size={16} />
            </button>
            <button
              onClick={() => {
                setIsFabOpen(false);
                getLocation();
              }}
              className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            >
              <Navigation size={16} />
            </button>
            <button
              onClick={() => {
                setIsFabOpen(false);
                setShowModal('note');
              }}
              className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            >
              <FileText size={16} />
            </button>
            <button
              onClick={() => {
                setIsFabOpen(false);
                setShowCalculator(true);
                resetCalculator();
              }}
              className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full text-white flex items-center justify-center shadow-lg hover:scale-110 transition-all"
            >
              <Calculator size={16} />
            </button>
          </div>
        )}
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="w-12 h-12 bg-gradient-to-r from-[#d4af37] to-[#b8860b] rounded-full text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-all"
        >
          {isFabOpen ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      {/* TARGET MODAL */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[100] flex items-center justify-center p-3">
          <div className="w-full max-w-xs p-4 rounded-xl border border-[#d4af37]/30 bg-black shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-[#d4af37]">{editingTarget ? 'EDIT TARGET' : 'NEW TARGET'}</h3>
              <button onClick={() => { setShowTargetModal(false); setEditingTarget(null); }} className="text-gray-500 hover:text-white p-1 transition-all">
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={saveTarget} className="space-y-2">
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
                required
              />

              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setTargetType('revenue')}
                  className={`p-1 rounded-lg border text-[9px] font-bold transition-all ${
                    targetType === 'revenue' 
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]' 
                      : 'border-gray-700 text-gray-300 hover:border-[#d4af37]/50'
                  }`}
                >
                  REVENUE
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('units')}
                  className={`p-1 rounded-lg border text-[9px] font-bold transition-all ${
                    targetType === 'units' 
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]' 
                      : 'border-gray-700 text-gray-300 hover:border-[#d4af37]/50'
                  }`}
                >
                  UNITS
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setTargetSpecific('total')}
                  className={`p-1 rounded-lg border text-[8px] font-bold transition-all ${
                    targetSpecific === 'total' 
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]' 
                      : 'border-gray-700 text-gray-300 hover:border-[#d4af37]/50'
                  }`}
                >
                  TOTAL
                </button>
                <button
                  type="button"
                  onClick={() => setTargetSpecific('brand')}
                  className={`p-1 rounded-lg border text-[8px] font-bold transition-all ${
                    targetSpecific === 'brand' 
                      ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black border-[#d4af37]' 
                      : 'border-gray-700 text-gray-300 hover:border-[#d4af37]/50'
                  }`}
                >
                  BRAND
                </button>
              </div>

              {targetSpecific === 'brand' && (
                <select
                  value={targetBrand}
                  onChange={(e) => setTargetBrand(e.target.value)}
                  className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
                  required
                >
                  <option value="">SELECT BRAND</option>
                  {data.brands.map(b => (
                    <option key={b.id} value={b.name}>{b.name} ({b.size})</option>
                  ))}
                </select>
              )}

              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="AMOUNT"
                className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
                required
              />

              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all"
              >
                {editingTarget ? 'UPDATE' : 'SAVE'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CALCULATOR MODAL */}
      {showCalculator && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[100] flex items-center justify-center p-3">
          <div className={`w-full max-w-xs p-4 rounded-xl border ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30' 
              : 'bg-black border-gray-800'
          } shadow-xl`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-[#d4af37]">CALCULATOR</h3>
              <button onClick={() => { setShowCalculator(false); resetCalculator(); }} className="text-gray-500 hover:text-white p-1 transition-all">
                <X size={16}/>
              </button>
            </div>

            <input
              type="number"
              value={totalCalculation.subtotal || ''}
              onChange={(e) => setTotalCalculation({...totalCalculation, subtotal: parseFloat(e.target.value) || 0})}
              placeholder="SUBTOTAL"
              className="w-full p-2 rounded-lg border text-sm mb-2 bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
            />

            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setTotalCalculation({...totalCalculation, usePercentage: false})}
                className={`flex-1 p-1 rounded-lg text-[9px] font-bold transition-all ${
                  !totalCalculation.usePercentage 
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Rs.
              </button>
              <button
                onClick={() => setTotalCalculation({...totalCalculation, usePercentage: true})}
                className={`flex-1 p-1 rounded-lg text-[9px] font-bold transition-all ${
                  totalCalculation.usePercentage 
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                %
              </button>
            </div>

            {totalCalculation.usePercentage ? (
              <input
                type="number"
                value={totalCalculation.discountPercent || ''}
                onChange={(e) => setTotalCalculation({...totalCalculation, discountPercent: parseFloat(e.target.value) || 0})}
                placeholder="DISCOUNT %"
                className="w-full p-2 rounded-lg border text-sm mb-2 bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
              />
            ) : (
              <input
                type="number"
                value={totalCalculation.discount || ''}
                onChange={(e) => setTotalCalculation({...totalCalculation, discount: parseFloat(e.target.value) || 0})}
                placeholder="DISCOUNT"
                className="w-full p-2 rounded-lg border text-sm mb-2 bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
              />
            )}

            <input
              type="number"
              value={totalCalculation.tax || ''}
              onChange={(e) => setTotalCalculation({...totalCalculation, tax: parseFloat(e.target.value) || 0})}
              placeholder="TAX"
              className="w-full p-2 rounded-lg border text-sm mb-3 bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
            />

            <div className="bg-gray-900 p-2 rounded-lg mb-3 text-center border border-gray-800">
              <p className="text-[9px] text-gray-400 mb-1 font-medium">GRAND TOTAL</p>
              <p className="text-base font-black text-[#d4af37]">
                Rs.{(
                  (totalCalculation.subtotal || 0) -
                  (totalCalculation.usePercentage
                    ? ((totalCalculation.subtotal || 0) * (totalCalculation.discountPercent || 0) / 100)
                    : (totalCalculation.discount || 0)
                  ) + (totalCalculation.tax || 0)
                ).toLocaleString()}
              </p>
            </div>

            <button
              onClick={calculateTotal}
              className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs mb-1 hover:opacity-90 transition-all"
            >
              CALCULATE
            </button>
            <button
              onClick={resetCalculator}
              className="w-full py-1.5 bg-gray-800 text-gray-300 font-black rounded-lg text-[10px] hover:bg-gray-700 transition-all"
            >
              RESET
            </button>
          </div>
        </div>
      )}

      {/* INVOICE MODAL */}
      {showModal === 'invoice' && selectedShop && (
        <div className="fixed inset-0 bg-black z-[100] overflow-y-auto">
          <div className="min-h-screen p-3 max-w-lg mx-auto pb-20">
            <div className="flex justify-between items-center mb-3 sticky top-0 bg-black py-2 border-b border-gray-800">
              <h2 className="text-sm font-black text-white">{selectedShop.name}</h2>
              <button onClick={() => { setShowModal(null); setCart({}); }} className="p-1 bg-gray-900 rounded-full hover:bg-gray-800 transition-all">
                <X size={16}/>
              </button>
            </div>

            <div className="space-y-2">
              {data.brands.map((b, index) => (
                <div key={b.id} className="bg-gray-900 p-2 rounded-xl border border-gray-800 flex items-center justify-between hover:border-[#d4af37]/30 transition-all">
                  <div>
                    <span className="text-xs font-bold text-white">{b.name} ({b.size})</span>
                    <p className="text-[10px] text-[#d4af37] font-black">Rs.{b.price}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCart({...cart, [b.id]: Math.max(0, (Number(cart[b.id])||0)-1)})}
                      className="w-6 h-6 bg-gray-800 rounded-lg text-xs text-white hover:bg-gray-700 transition-all font-black"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={cart[b.id] || ''}
                      onChange={(e) => setCart({...cart, [b.id]: e.target.value})}
                      className="w-8 bg-transparent text-center text-[#d4af37] text-xs outline-none font-black"
                      placeholder="0"
                    />
                    <button
                      onClick={() => setCart({...cart, [b.id]: (Number(cart[b.id])||0) + 1})}
                      className="w-6 h-6 bg-gray-800 rounded-lg text-xs text-white hover:bg-gray-700 transition-all font-black"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-0 inset-x-0 p-2 bg-black border-t border-gray-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-white font-bold">Total:</span>
                <span className="text-base font-black text-[#d4af37]">Rs.{calculateCartTotal().toLocaleString()}</span>
              </div>
              <button
                onClick={handleCreateOrder}
                className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all"
              >
                CONFIRM ORDER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ORDER MODAL */}
      {showModal === 'manual' && (
        <div className="fixed inset-0 bg-black z-[100] overflow-y-auto">
          <div className="min-h-screen p-3 max-w-lg mx-auto pb-28">
            <div className="flex justify-between items-center mb-3 sticky top-0 bg-black py-2 border-b border-gray-800">
              <h2 className="text-sm font-black text-white">MANUAL ORDER</h2>
              <button
                onClick={() => {
                  setShowModal(null);
                  setManualItems([{ name: '', qty: 1, price: 0, subtotal: 0 }]);
                }}
                className="p-1 bg-gray-900 rounded-full hover:bg-gray-800 transition-all"
              >
                <X size={16}/>
              </button>
            </div>

            <select
              className="w-full bg-gray-900 p-2 rounded-lg border border-gray-800 text-white text-xs mb-3 outline-none focus:border-[#d4af37] transition-all font-bold"
              onChange={(e) => {
                const shopId = e.target.value;
                setSelectedShop(data.shops.find(s => s.id === shopId));
              }}
            >
              <option value="">SELECT SHOP</option>
              {data.shops.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {manualItems.map((item, index) => (
              <div key={index} className="bg-gray-900 p-2 rounded-lg border border-gray-800 mb-2">
                <div className="grid grid-cols-2 gap-1">
                  <input
                    value={item.name}
                    onChange={(e) => updateManualItem(index, 'name', e.target.value)}
                    placeholder="ITEM"
                    className="bg-black p-1 rounded text-[10px] border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
                  />
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => updateManualItem(index, 'qty', e.target.value)}
                    placeholder="QTY"
                    className="bg-black p-1 rounded text-[10px] border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => updateManualItem(index, 'price', e.target.value)}
                    placeholder="PRICE"
                    className="bg-black p-1 rounded text-[10px] border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium"
                  />
                  <div className="bg-black p-1 rounded text-center border border-gray-700">
                    <span className="text-[#d4af37] text-[10px] font-black">Rs.{item.subtotal}</span>
                  </div>
                </div>
                {manualItems.length > 1 && (
                  <button onClick={() => removeManualItem(index)} className="mt-1 text-red-500 text-[8px] font-black hover:text-red-400 transition-all">Remove</button>
                )}
              </div>
            ))}

            <button onClick={addManualItem} className="w-full py-1.5 bg-gray-800 rounded-lg text-[#d4af37] text-xs font-black mb-3 hover:bg-gray-700 transition-all">+ ADD ITEM</button>

            <div className="fixed bottom-0 inset-x-0 p-2 bg-black border-t border-gray-800">
              <button
                onClick={saveManualOrder}
                disabled={!selectedShop}
                className={`w-full py-2 font-black rounded-lg text-xs transition-all ${selectedShop ? 'bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black hover:opacity-90' : 'bg-gray-800 text-gray-500'}`}
              >
                {selectedShop ? 'SAVE ORDER' : 'SELECT SHOP FIRST'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showModal === 'preview' && lastOrder && (
        <div className="fixed inset-0 bg-black/95 z-[110] flex items-center justify-center p-3">
          <div className="bg-gray-900 w-full max-w-xs p-4 rounded-xl border border-[#d4af37]/30">
            <div className="text-center mb-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-green-500/30">
                <CheckCircle2 size={24} className="text-green-500" />
              </div>
              <h3 className="text-sm font-black text-white">ORDER CONFIRMED</h3>
            </div>

            <div className="bg-black rounded-lg p-2 mb-3 border border-gray-800">
              <div className="space-y-1 max-h-24 overflow-y-auto text-[9px]">
                {lastOrder.items?.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-white font-medium">{it.name} x{it.qty}</span>
                    <span className="font-black text-white">Rs.{it.subtotal}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-800 mt-2 pt-2 flex justify-between">
                <span className="text-[10px] text-gray-400 font-medium">Total</span>
                <span className="text-sm font-black text-[#d4af37]">Rs.{lastOrder.total}</span>
              </div>
            </div>

            <div className="space-y-1">
              <button onClick={() => { printBill(lastOrder); setShowModal(null); }} className="w-full py-1.5 bg-blue-600 text-white font-black rounded-lg text-[10px] hover:bg-blue-700 transition-all">PRINT</button>
              <button onClick={() => { shareToWhatsApp(lastOrder, false); setShowModal(null); }} className="w-full py-1.5 bg-[#d4af37] text-black font-black rounded-lg text-[10px] hover:bg-[#b8860b] transition-all">SHARE</button>
              <button onClick={() => { shareToWhatsApp(lastOrder, true); setShowModal(null); }} className="w-full py-1.5 bg-green-600 text-white font-black rounded-lg text-[10px] hover:bg-green-700 transition-all">SHARE + LOC</button>
              <button onClick={() => { setShowModal(null); setLastOrder(null); }} className="w-full py-1.5 bg-gray-800 text-gray-300 font-black rounded-lg text-[10px] hover:bg-gray-700 transition-all">CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* SHOP MODAL */}
      {showModal === 'shop' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[100] flex items-center justify-center p-3">
          <div className={`w-full max-w-xs p-4 rounded-xl border ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30' 
              : 'bg-black border-gray-800'
          } shadow-xl`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-[#d4af37]">NEW SHOP</h3>
              <button onClick={() => setShowModal(null)} className="text-gray-500 hover:text-white p-1 transition-all">
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = e.target;
              await addDoc(collection(db, 'shops'), {
                userId: user.uid,
                name: f.name.value.toUpperCase(),
                area: f.area.value,
                timestamp: Date.now()
              });
              showToast("Shop added!");
              setShowModal(null);
            }} className="space-y-2">
              <input name="name" placeholder="SHOP NAME" className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold" required />
              <select name="area" className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold" required>
                <option value="">SELECT ROUTE</option>
                {data.routes.map(r => (
                  <option key={r.id} value={r.name}>{r.name}</option>
                ))}
              </select>
              <button type="submit" className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all">SAVE</button>
            </form>
          </div>
        </div>
      )}

      {/* ROUTE MODAL */}
      {showModal === 'route' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[100] flex items-center justify-center p-3">
          <div className={`w-full max-w-xs p-4 rounded-xl border ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30' 
              : 'bg-black border-gray-800'
          } shadow-xl`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-[#d4af37]">NEW ROUTE</h3>
              <button onClick={() => setShowModal(null)} className="text-gray-500 hover:text-white p-1 transition-all">
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await addDoc(collection(db, 'routes'), {
                userId: user.uid,
                name: e.target.name.value.toUpperCase(),
                timestamp: Date.now()
              });
              showToast("Route added!");
              setShowModal(null);
            }} className="space-y-2">
              <input name="name" placeholder="ROUTE NAME" className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold" required />
              <button type="submit" className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all">SAVE</button>
            </form>
          </div>
        </div>
      )}

      {/* BRAND MODAL */}
      {showModal === 'brand' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[100] flex items-center justify-center p-3">
          <div className={`w-full max-w-xs p-4 rounded-xl border ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30' 
              : 'bg-black border-gray-800'
          } shadow-xl`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-[#d4af37]">NEW BRAND</h3>
              <button onClick={() => setShowModal(null)} className="text-gray-500 hover:text-white p-1 transition-all">
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={addBrandWithSequence} className="space-y-2">
              <input name="name" placeholder="BRAND NAME" className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold" required />
              <input name="size" placeholder="SIZE" className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold" required />
              <input name="price" type="number" placeholder="PRICE" className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold" required />
              <button type="submit" className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all">SAVE</button>
            </form>
          </div>
        </div>
      )}

      {/* SHOP PROFILE MODAL */}
      {showModal === 'shopProfile' && selectedShop && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[100] flex items-center justify-center p-3">
          <div className="w-full max-w-xs p-4 rounded-xl border border-[#d4af37]/30 bg-black shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-[#d4af37]">SHOP PROFILE</h3>
              <button onClick={() => { setShowModal(null); setEditingProfile(null); }} className="text-gray-500 hover:text-white p-1 transition-all">
                <X size={16}/>
              </button>
            </div>
            <form onSubmit={saveShopProfile} className="space-y-2">
              <input
                placeholder="OWNER NAME"
                value={shopProfileForm.ownerName}
                onChange={(e) => setShopProfileForm({...shopProfileForm, ownerName: e.target.value})}
                className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold"
              />
              <input
                placeholder="PHONE"
                value={shopProfileForm.phone}
                onChange={(e) => setShopProfileForm({...shopProfileForm, phone: e.target.value})}
                className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold"
              />
              <input
                placeholder="ADDRESS"
                value={shopProfileForm.address}
                onChange={(e) => setShopProfileForm({...shopProfileForm, address: e.target.value})}
                className="w-full p-2 rounded-lg border text-xs bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold"
              />
              <button type="submit" className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all">SAVE</button>
            </form>
          </div>
        </div>
      )}

      {/* EXPENSE MODAL */}
      {showModal === 'expense' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[100] flex items-center justify-center p-3">
          <div className={`w-full max-w-xs p-4 rounded-xl border ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30' 
              : 'bg-black border-gray-800'
          } shadow-xl`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-[#d4af37]">ADD EXPENSE</h3>
              <button onClick={() => setShowModal(null)} className="text-gray-500 hover:text-white p-1 transition-all">
                <X size={16}/>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1 mb-3">
              {['fuel', 'food', 'transport', 'other'].map(t => (
                <button
                  key={t}
                  onClick={() => setExpenseType(t)}
                  className={`p-2 rounded-lg border text-center text-[9px] font-bold uppercase transition-all ${
                    expenseType === t 
                      ? 'border-[#d4af37] bg-[#d4af37]/10 text-white' 
                      : 'border-gray-700 text-gray-400 hover:border-[#d4af37]/50'
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
              className="w-full p-2 rounded-lg border text-sm mb-2 bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-bold"
            />
            <textarea
              value={expenseNote}
              onChange={(e) => setExpenseNote(e.target.value)}
              placeholder="NOTE"
              className="w-full p-2 rounded-lg border text-xs mb-3 bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium h-16"
            />
            <button
              onClick={saveExpense}
              className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all"
            >
              SAVE
            </button>
          </div>
        </div>
      )}

      {/* NOTE MODAL */}
      {showModal === 'note' && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/95 z-[100] flex items-center justify-center p-3">
          <div className={`w-full max-w-xs p-4 rounded-xl border ${
            isDarkMode 
              ? 'bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border-[#d4af37]/30' 
              : 'bg-black border-gray-800'
          } shadow-xl`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-sm text-[#d4af37]">ADD NOTE</h3>
              <button onClick={() => setShowModal(null)} className="text-gray-500 hover:text-white p-1 transition-all">
                <X size={16}/>
              </button>
            </div>
            <textarea
              value={repNote}
              onChange={(e) => setRepNote(e.target.value)}
              placeholder="TYPE NOTE HERE..."
              className="w-full p-2 rounded-lg border text-xs mb-3 bg-gray-900 border-gray-700 text-white outline-none focus:border-[#d4af37] transition-all font-medium h-24"
            />
            <button
              onClick={saveNote}
              className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all"
            >
              SAVE
            </button>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {showPrintPreview && printOrder && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-3">
          <div className="bg-gray-900 w-full max-w-xs p-4 rounded-xl border border-[#d4af37]/30">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-[#d4af37]">PRINT BILL</h3>
              <button onClick={() => setShowPrintPreview(false)} className="text-gray-500 hover:text-white p-1 transition-all">
                <X size={16}/>
              </button>
            </div>

            <div className="bg-white p-3 rounded-lg mb-3 text-black text-[9px] border border-gray-200">
              <div className="text-center border-b border-gray-300 pb-2 mb-2">
                <div className="font-black text-[#d4af37]">{printOrder.companyName}</div>
                <div className="font-black">{printOrder.shopName}</div>
              </div>
              {printOrder.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[8px]">
                  <span className="font-medium">{item.name} x{item.qty}</span>
                  <span className="font-bold">Rs.{item.subtotal}</span>
                </div>
              ))}
              <div className="border-t border-gray-300 mt-2 pt-2 text-right font-black">
                Total: Rs.{printOrder.total}
              </div>
            </div>

            <button
              onClick={() => { handlePrint(printOrder); setShowPrintPreview(false); }}
              className="w-full py-2 bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-black rounded-lg text-xs hover:opacity-90 transition-all"
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
        .animate-progress { animation: progress 1.2s ease-in-out; }
        
        /* Base styles */
        body {
          background: #000000;
        }
        
        /* Light mode specific - only background light, boxes stay dark */
        body:not(.dark) .bg-gradient-to-br {
          background: #fef3c7 !important; /* amber-50 */
        }
        
        body:not(.dark) .text-gray-900,
        body:not(.dark) .text-gray-700,
        body:not(.dark) .text-gray-600 {
          color: #FFFFFF !important;
        }
        
        body:not(.dark) .bg-white,
        body:not(.dark) .bg-gray-50 {
          background: #000000 !important;
          border-color: #333333 !important;
        }
        
        body:not(.dark) .text-gray-900,
        body:not(.dark) .text-gray-700,
        body:not(.dark) .text-gray-600,
        body:not(.dark) .text-white {
          color: #FFFFFF !important;
        }
        
        body:not(.dark) .text-\\[\\#d4af37\\] {
          color: #FFD700 !important;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
        }
        
        body:not(.dark) input,
        body:not(.dark) select,
        body:not(.dark) textarea {
          background: #111111 !important;
          border-color: #333333 !important;
          color: #FFFFFF !important;
        }
        
        body:not(.dark) .border-gray-200,
        body:not(.dark) .border-gray-300 {
          border-color: #333333 !important;
        }
        
        /* Dark mode stays the same */
        .dark body {
          background: #000000;
        }
        
        input, select, textarea { font-size: 16px !important; }
        * { -webkit-text-size-adjust: 100%; -webkit-tap-highlight-color: transparent; }
        button { min-height: 36px; min-width: 36px; }
        ::-webkit-scrollbar { width: 2px; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 215, 0, 0.5); border-radius: 10px; }
      `}</style>
    </div>
  );
}
