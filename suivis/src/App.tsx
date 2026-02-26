import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from "motion/react"
import { AlertCircle, CheckCircle, ChevronDown, Clock, Disc, FileX, Info, MessageCircle, Search, Send, Shield, Target, User, X, Zap } from 'lucide-react';

import './App.css'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from './libs/api';
import { useWebSocket } from './contexts/WebSocketContext';

interface OrderData {
  id: string;
  status: string;
  progress: number;
  steps: Array<{
    label: string;
    date: string;
    completed: boolean;
  }>;
  product: string;
  quantity: number;
  delivered: number;
  remains: number;
  link: string;
  created_at: string;
  estimated: string;
  isDripFeed: boolean;
  runs: number;
  executedRuns: number;
  raw: any;
}

interface TimelineStep {
  title: string;
  description: string;
  status: 'completed' | 'active' | 'pending';
  icon: any;
  badge: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

function App() {
  const { on, off, isConnected } = useWebSocket();
  
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Verification states
  const [verificationStep, setVerificationStep] = useState<'search' | 'verify' | 'result'>('search');
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Bonjour ! Je suis votre assistant Broreps. Comment puis-je vous aider aujourd'hui ?",
      sender: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');

  const generateChartData = () => {
    if (!orderData) return [];

    const createdDate = new Date(orderData.created_at);
    const now = new Date();
    const daysDiff = Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    const data = [];
    const deliveredTotal = calculateDripProgress().delivered;
    const dailyAverage = deliveredTotal / Math.max(daysDiff, 1);

    for (let i = 0; i <= Math.min(daysDiff, 10); i++) {
      const date = new Date(createdDate);
      date.setDate(date.getDate() + i);

      // Croissance progressive simulée
      const value = Math.floor(dailyAverage * i * (1 + Math.random() * 0.2));

      data.push({
        name: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        value: Math.min(value, deliveredTotal)
      });
    }

    return data;
  };

  const generateTimelineSteps = (): TimelineStep[] => {
    if (!orderData) return [];

    // Use calculated percentage for accurate progress steps
    const percentComplete = calculateDripProgress().progress;
    
    // Map percentage to progress steps (0-4)
    let progressStep = 0;
    if (percentComplete >= 100) progressStep = 4;        // Completed
    else if (percentComplete >= 76) progressStep = 3;     // Stabilization
    else if (percentComplete >= 26) progressStep = 2;     // In Progress
    else if (percentComplete >= 1) progressStep = 1;      // Planning
    else progressStep = 0;                                // Just Created

    return [
      {
        title: 'Commande validée',
        description: 'Votre commande a été confirmée',
        status: 'completed',
        icon: CheckCircle,
        badge: 'Terminé'
      },
      {
        title: 'Planification',
        description: orderData.isDripFeed ? 'Organisation de la livraison progressive' : 'Préparation de la livraison',
        status: progressStep >= 1 ? 'completed' : 'pending',
        icon: Clock,
        badge: progressStep >= 1 ? 'Terminé' : ''
      },
      {
        title: 'Livraison en cours',
        description: 'Croissance active de votre compte',
        status: progressStep >= 2 && progressStep < 4 ? 'active' : progressStep >= 4 ? 'completed' : 'pending',
        icon: Zap,
        badge: progressStep >= 2 && progressStep < 4 ? 'En cours' : progressStep >= 4 ? 'Terminé' : ''
      },
      {
        title: 'Stabilisation',
        description: 'Sécurisation de votre croissance',
        status: progressStep >= 3 && progressStep < 4 ? 'active' : progressStep >= 4 ? 'completed' : 'pending',
        icon: Shield,
        badge: progressStep >= 3 && progressStep < 4 ? 'En cours' : ''
      },
      {
        title: 'Objectif atteint',
        description: 'Mission accomplie !',
        status: progressStep >= 4 ? 'completed' : 'pending',
        icon: Target,
        badge: progressStep >= 4 ? 'Terminé' : ''
      }
    ];
  };

  const refreshOrderData = async (silent = false) => {
    if (!searchQuery.trim()) return;
    
    try {
      if (!silent) setIsLoading(true);
      const data = await api.trackOrder(searchQuery.trim().replace('#', ''));
      setOrderData(data);
      console.log('🔄 Order data refreshed:', data);
    } catch (err: any) {
      console.error('Error refreshing order:', err);
      if (!silent) {
        setError(err.message || 'Erreur lors du rafraîchissement');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 Step 1: Order number entered:', searchQuery);
    
    if (!searchQuery.trim()) {
      console.log('⚠️ Empty search query');
      return;
    }

    // Move to verification step
    const cleanQuery = searchQuery.trim().replace('#', '');
    setOrderNumber(cleanQuery);
    setVerificationStep('verify');
    setError(null);
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔐 Step 2: Verifying with email:', email);
    
    if (!email.trim()) {
      setError('Veuillez entrer votre email');
      return;
    }

    console.log('📡 Starting verification...');
    setIsLoading(true);
    setError(null);

    try {
      const data = await api.verifyOrder(orderNumber, email.trim());
      console.log('✅ Order verified:', data);
      setOrderData(data);
      setVerificationStep('result');
      setShowResult(true);
    } catch (err: any) {
      console.error('❌ Verification failed:', err);
      setError(err.message || 'Email incorrect ou commande introuvable');
    } finally {
      console.log('🏁 Verification completed');
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setVerificationStep('search');
    setOrderNumber('');
    setEmail('');
    setError(null);
  };

  // WebSocket listeners for real-time order updates
  useEffect(() => {
    if (!isConnected || !orderData || !showResult) return;

    const handleOrderUpdated = (data: any) => {
      // Refresh if the updated order matches the tracked order
      if (data.order_id === searchQuery.trim().replace('#', '') || 
          data.id?.toString() === searchQuery.trim().replace('#', '') ||
          data.shopify_order_number === searchQuery.trim().replace('#', '')) {
        console.log('🔄 Suivis: Order updated via WebSocket', data);
        refreshOrderData(true);
      }
    };

    const handleDripExecuted = (data: any) => {
      // Refresh if this is a drip feed order
      if (orderData.isDripFeed) {
        console.log('💧 Suivis: Drip executed via WebSocket', data);
        refreshOrderData(true);
      }
    };

    on('order:updated', handleOrderUpdated);
    on('drip:executed', handleDripExecuted);

    return () => {
      off('order:updated', handleOrderUpdated);
      off('drip:executed', handleDripExecuted);
    };
  }, [isConnected, on, off, orderData, showResult, searchQuery]);

  const calculateDripProgress = () => {
    const dripInfo = orderData?.raw?.drip_feed_info;
    
    if (!orderData?.isDripFeed || !dripInfo) {
      return {
        delivered: orderData?.delivered || 0,
        remains: orderData?.remains || 0,
        progress: orderData ? Math.round((orderData.delivered / orderData.quantity) * 100) : 0
      };
    }

    // Sum up all sub-orders for drip feed
    const totalDelivered = dripInfo.sub_orders.reduce((sum: number, sub: any) => sum + sub.delivered, 0);
    const quantity = orderData.quantity;
    // For drip feed: remains = total quantity - delivered (includes unexecuted runs)
    const totalRemains = quantity - totalDelivered;
    const progress = quantity > 0 ? Math.round((totalDelivered / quantity) * 100) : 0;

    return { delivered: totalDelivered, remains: totalRemains, progress };
  };

  const calculateDailyAverage = () => {
    if (!orderData) return 0;

    // Pour les drip feed, afficher la quantité par run (depuis les sub-orders du provider)
    if (orderData.isDripFeed && orderData.raw?.drip_feed_info?.sub_orders?.length > 0) {
      // Prendre la quantité du premier sub-order (quantité configurée par livraison)
      return orderData.raw.drip_feed_info.sub_orders[0].quantity || 0;
    }

    // Pour les commandes standard, calculer la moyenne par jour
    const createdDate = new Date(orderData.created_at);
    const now = new Date();
    const daysDiff = Math.max(Math.ceil((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)), 1);
    return Math.floor(calculateDripProgress().delivered / daysDiff);
  };

  const getNextDeliveryTime = () => {
    if (!orderData) return '--';
    if (orderData.progress >= 4) return 'Livraison terminée';
    if (orderData.isDripFeed && orderData.raw?.account?.next_run_at) {
      return new Date(orderData.raw.account.next_run_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return 'Prochainement';
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: messages.length + 1,
      text: input,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages([...messages, userMessage]);
    setInput('');

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: messages.length + 2,
        text: "Merci pour votre message ! Notre équipe vous répondra dans les plus brefs délais.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  const handleResiliation = () => {
    const resiliationMessage: Message = {
      id: messages.length + 1,
      text: "Je souhaite faire une demande de résiliation.",
      sender: 'user',
      timestamp: new Date()
    };
    setMessages([...messages, resiliationMessage]);

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: messages.length + 2,
        text: "Nous avons bien reçu votre demande de résiliation. Un membre de notre équipe va traiter votre demande dans les plus brefs délais. Vous recevrez un email de confirmation.",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  if (!showResult) {
    return (
      <div className="min-h-screen bg-broreps-dark text-white p-4 font-sans flex flex-col justify-center items-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-broreps-green/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-broreps-green/5 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg z-10 text-center"
        >
          <div className="mb-12">
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 drop-shadow-lg transform -skew-x-6 mb-4">
              <span className="text-broreps-green drop-shadow-[0_0_15px_rgba(57,255,20,0.6)]">BRO</span>REPS
            </h1>
            <p className="text-broreps-green font-bold tracking-[0.2em] text-sm uppercase glow-sm">Plateforme de Suivi</p>
          </div>

          {/* Step 1: Search by order number */}
          {verificationStep === 'search' && (
            <form onSubmit={handleSearch} className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-broreps-green to-emerald-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative flex items-center bg-[#0F0F0F] border border-white/10 rounded-xl p-2 shadow-2xl">
                <Search className="text-gray-500 ml-4 w-6 h-6" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Numéro de commande Shopify (ex: #1234)"
                  className="w-full bg-transparent text-white px-4 py-4 text-lg focus:outline-none placeholder-gray-600 font-medium"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-broreps-green hover:bg-[#2ecc12] text-black font-black italic tracking-wider py-3 px-8 rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_30px_rgba(57,255,20,0.5)]"
                >
                  CONTINUER
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Verify with email */}
          {verificationStep === 'verify' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="bg-[#0F0F0F]/80 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-broreps-green" />
                  <h2 className="text-xl font-bold">Vérification de sécurité</h2>
                </div>
                <p className="text-gray-400 text-sm mb-2">
                  Pour accéder aux détails de la commande <span className="text-white font-bold">#{orderNumber}</span>,
                </p>
                <p className="text-gray-400 text-sm">
                  veuillez confirmer l'email utilisé lors de la commande Shopify.
                </p>
              </div>

              <form onSubmit={handleVerify} className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-broreps-green to-emerald-600 rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                <div className="relative flex items-center bg-[#0F0F0F] border border-white/10 rounded-xl p-2 shadow-2xl">
                  <User className="text-gray-500 ml-4 w-6 h-6" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email de la commande"
                    className="w-full bg-transparent text-white px-4 py-4 text-lg focus:outline-none placeholder-gray-600 font-medium"
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-broreps-green hover:bg-[#2ecc12] text-black font-black italic tracking-wider py-3 px-8 rounded-lg transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(57,255,20,0.3)] hover:shadow-[0_0_30px_rgba(57,255,20,0.5)]"
                  >
                    {isLoading ? <Disc className="animate-spin w-6 h-6" /> : 'VÉRIFIER'}
                  </button>
                </div>
              </form>

              <button
                onClick={handleBack}
                className="text-gray-400 hover:text-white text-sm transition-colors flex items-center gap-2 mx-auto"
              >
                <Search className="w-4 h-4" />
                Retour à la recherche
              </button>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-400 text-sm">{error}</p>
            </motion.div>
          )}
        </motion.div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-broreps-dark text-white p-4 md:p-8 font-sans flex justify-center items-center">
        <div className="text-center">
          <Disc className="w-16 h-16 text-broreps-green animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const chartData = generateChartData();
  const timelineSteps = generateTimelineSteps();
  const dripProgress = calculateDripProgress();
  const percentage = dripProgress.progress;
  const dailyAverage = calculateDailyAverage();
  const nextDelivery = getNextDeliveryTime();

  return (
    <div className="antialiased selection:bg-broreps-green selection:text-black">
      <div className="min-h-screen bg-broreps-dark text-white p-4 md:p-8 font-sans flex justify-center items-center">
        <button
          onClick={() => {
            setShowResult(false);
            setOrderData(null);
            setError(null);
            setSearchQuery('');
            setVerificationStep('search');
            setOrderNumber('');
            setEmail('');
          }}
          className="fixed top-4 left-4 z-50 bg-[#0F0F0F] border border-white/10 p-2 rounded-full hover:bg-white/5 transition-colors"
          title="Retour à la recherche"
        >
          <Search className="w-5 h-5 text-gray-400" />
        </button>

        <div className="max-w-8xl w-full grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* 1. Header Section (Full Width) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-4 bg-[#0F0F0F]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 flex flex-col md:flex-row justify-between items-center shadow-lg"
          >
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className="w-14 h-14 bg-[#1a1a1a] rounded-2xl flex items-center justify-center border border-white/10 text-broreps-green">
                <Disc className="w-8 h-8 spin-slow" />
              </div>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  Commande {orderData.id}
                  <span className="bg-[#1a1a1a] text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                    {orderData.status}
                  </span>
                </h1>
                <p className="text-gray-400 text-sm">{orderData.product}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#0a0a0a] p-1.5 rounded-xl border border-white/5">
              <div className="px-4 py-2 rounded-lg bg-[#151515] flex items-center gap-2 border border-white/5">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-200">{orderData.link || orderData.shopify?.social_link || 'Non fourni'}</span>
              </div>
              <div className="px-4 py-2 rounded-lg bg-[#151515] flex items-center gap-2 border border-white/5">
                <Target className="w-4 h-4 text-broreps-green" />
                <span className="text-sm font-bold text-white">{orderData.quantity.toLocaleString()} objectif</span>
              </div>
            </div>
          </motion.div>

          {/* Shopify Information Card (if available) */}
          {orderData.shopify && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="lg:col-span-4 bg-[#0F0F0F]/80 backdrop-blur-md rounded-3xl p-6 border border-white/5 shadow-lg"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-broreps-green" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                    </svg>
                    Informations Shopify
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Lien social:</span>
                      <span className="text-white text-sm font-medium">
                        {orderData.shopify.social_link || 'Non fourni'}
                      </span>
                    </div>
                    {orderData.shopify.customer_name && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Client:</span>
                        <span className="text-white text-sm font-medium">
                          {orderData.shopify.customer_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-lg flex items-center gap-2 border ${
                    orderData.shopify.payment_validated 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      orderData.shopify.payment_validated ? 'bg-green-500' : 'bg-yellow-500'
                    } animate-pulse`} />
                    <span className={`text-sm font-bold ${
                      orderData.shopify.payment_validated ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {orderData.shopify.payment_validated ? 'Payé' : 'Paiement en attente'}
                    </span>
                  </div>
                  {orderData.shopify.total_price && (
                    <div className="px-4 py-2 rounded-lg bg-[#151515] border border-white/5">
                      <span className="text-white text-sm font-bold">
                        {parseFloat(orderData.shopify.total_price).toFixed(2)} €
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* 2. Progress Card (Left Column, Top) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 bg-[#0F0F0F] rounded-3xl p-8 border border-white/5 relative overflow-hidden group shadow-2xl"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-broreps-green/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-broreps-green/10 transition-all duration-700" />

            <div className="flex justify-between items-end mb-6">
              <span className="bg-[#151515] text-broreps-green border border-broreps-green/20 px-4 py-1.5 rounded-full text-sm font-bold">
                Finalisation
              </span>
              <span className="text-6xl font-black text-white tracking-tight">
                {percentage}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-4 w-full bg-[#1a1a1a] rounded-full mb-8 relative overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="absolute top-0 left-0 h-full bg-linear-to-r from-emerald-600 to-broreps-green shadow-[0_0_20px_rgba(57,255,20,0.4)] rounded-full"
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#151515] rounded-2xl p-4 text-center border border-white/5">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Livré</p>
                {orderData.isDripFeed ? (
                  <>
                    <p className="text-sm text-gray-400 mb-1">{orderData.executedRuns || 0} run(s) exécuté(s)</p>
                    <p className="text-2xl font-black text-white">
                      {dripProgress.delivered.toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-black text-white">{dripProgress.delivered.toLocaleString()}</p>
                )}
              </div>
              <div className="bg-[#151515] rounded-2xl p-4 text-center border border-white/5">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Objectif</p>
                {orderData.isDripFeed ? (
                  <>
                    <p className="text-sm text-gray-400 mb-1">{orderData.runs || 0} run(s) total</p>
                    <p className="text-2xl font-black text-white">{orderData.quantity.toLocaleString()}</p>
                  </>
                ) : (
                  <p className="text-2xl font-black text-white">{orderData.quantity.toLocaleString()}</p>
                )}
              </div>
              <div className="bg-[#151515] rounded-2xl p-4 text-center border border-white/5">
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Restant</p>
                {orderData.isDripFeed ? (
                  <>
                    <p className="text-sm text-gray-400 mb-1">{(orderData.runs || 0) - (orderData.executedRuns || 0)} run(s)</p>
                    <p className="text-2xl font-black text-white">{dripProgress.remains.toLocaleString()}</p>
                  </>
                ) : (
                  <p className="text-2xl font-black text-white">{dripProgress.remains.toLocaleString()}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* 3. Timeline Card (Far Right Column, Spans 2 Rows) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1 lg:row-span-2 bg-[#0F0F0F] rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col"
          >
            <h3 className="text-xl font-bold mb-8 text-white">Progression</h3>

            <div className="relative space-y-6">
              {/* Vertical Line - centered with icons */}
              <div className="absolute top-5 left-5 bottom-5 w-0.5 bg-linear-to-b from-[#1a1a1a] via-[#2a2a2a] to-[#1a1a1a]"></div>

              {timelineSteps.map((step, idx) => {
                const isCompleted = step.status === 'completed';
                const isActive = step.status === 'active';

                return (
                  <div key={idx} className="relative flex gap-4 items-start z-10">
                    <div className={`
                                        w-10 h-10 rounded-full shrink-0 flex items-center justify-center border-4
                                        transition-all duration-300
                                        ${isCompleted ? 'bg-broreps-green border-[#0F0F0F] text-black shadow-[0_0_20px_rgba(57,255,20,0.4)]' :
                        isActive ? 'bg-[#0F0F0F] border-broreps-green text-broreps-green shadow-[0_0_15px_rgba(57,255,20,0.3)]' :
                          'bg-[#0F0F0F] border-[#1a1a1a] text-gray-600'}
                                    `}>
                      <step.icon size={18} strokeWidth={isCompleted || isActive ? 2.5 : 2} />
                    </div>
                    <div className="flex-1 pt-1.5">
                      <h4 className={`font-bold text-sm mb-1 ${isActive || isCompleted ? 'text-white' : 'text-gray-500'}`}>
                        {step.title}
                      </h4>
                      {step.badge && (
                        <span className={`
                                                text-[10px] font-bold px-2 py-0.5 rounded-md inline-block uppercase tracking-wider
                                                ${isCompleted ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20' :
                            isActive ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/20' : ''}
                                            `}>
                          {step.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* 4. Delivery Status (Left Column, Bottom) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1 bg-[#0F0F0F] rounded-3xl p-6 border border-white/5 shadow-2xl flex flex-col justify-between"
          >
            <h3 className="text-xl font-bold mb-6 text-white">État de la livraison</h3>

            <div className="space-y-4">
              {/* Avg/Day Card */}
              <div className="bg-[#151515] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-yellow-400" fill="currentColor" />
                  <span className="text-gray-400 text-sm">Moyenne/jour</span>
                </div>
                <p className="text-3xl font-black text-white">~{dailyAverage}</p>
              </div>

              {/* Mode Card */}
              <div className="bg-[#151515] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-400 text-sm">Mode</span>
                </div>
                <p className="text-3xl font-black text-blue-400">{orderData.isDripFeed ? 'Progressif' : 'Standard'}</p>
              </div>

              {/* Next Delivery Card */}
              <div className="bg-[#151515] rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className="text-gray-400 text-sm">Prochaine livraison</span>
                </div>
                <p className="text-xl font-bold text-white">{nextDelivery}</p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-gray-500 text-sm cursor-pointer hover:text-white transition-colors">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Pourquoi c'est progressif ?</span>
              </div>
              <ChevronDown className="w-4 h-4" />
            </div>
          </motion.div>

          {/* 5. Growth Chart (Center Column, Bottom) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2 bg-[#0F0F0F] rounded-3xl p-8 border border-white/5 relative shadow-2xl min-h-100"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-white">Évolution de votre croissance</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-broreps-green animate-pulse"></div>
                <span className="text-gray-400 text-sm">Abonnés</span>
              </div>
            </div>

            <div className="w-full h-75">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#39FF14" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#39FF14" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#121212', border: '1px solid #333', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{ stroke: '#39FF14', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#666', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    hide={true}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#39FF14"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

        </div>
      </div>

      <>
        {/* Chat Window */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-24 right-6 w-96 h-125 glass-panel rounded-2xl shadow-2xl flex flex-col z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-linear-to-r from-broreps-green/20 to-transparent rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-broreps-green flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Assistant Broreps</h3>
                    <p className="text-xs text-green-400">En ligne</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2 ${message.sender === 'user'
                          ? 'bg-broreps-green text-black rounded-br-none'
                          : 'bg-white/10 text-white rounded-bl-none'
                        }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-black/60' : 'text-white/60'
                        }`}>
                        {message.timestamp.toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-white/10">
                {/* Resiliation Button */}
                <div className="p-3 pb-2">
                  <button
                    onClick={handleResiliation}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 rounded-xl px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <FileX className="w-4 h-4" />
                    Faire une demande de résiliation
                  </button>
                </div>

                <form onSubmit={handleSend} className="p-3 pt-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Écrivez votre message..."
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-broreps-green/50 focus:ring-1 focus:ring-broreps-green/50 transition-all"
                    />
                    <button
                      type="submit"
                      className="bg-broreps-green hover:bg-broreps-green/90 text-black rounded-xl px-4 py-2 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 w-16 h-16 bg-linear-to-br from-broreps-green to-green-400 rounded-full shadow-lg shadow-broreps-green/50 flex items-center justify-center z-50 hover:shadow-xl hover:shadow-broreps-green/60 transition-all"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6 text-black" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <MessageCircle className="w-6 h-6 text-black" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </>
    </div>
  )
}

export default App
