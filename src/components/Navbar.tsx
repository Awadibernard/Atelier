import {
  Calculator,
  FileText,
  History,
  Package,
  Settings,
  Hammer,
  BookmarkCheck,
  Home,
  Wifi,
  WifiOff,
  Plus,
  Crown,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { AppTab, BusinessProfile, UserEntitlement } from '../types';
import { isPremium } from '../licensing/features';
import { PremiumBadge } from './licensing/PremiumBadge';

interface Props {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  profile: BusinessProfile;
  quotesCount?: number;
  entitlement?: UserEntitlement;
  onOpenPremiumModal?: () => void;
}

export function Navbar({
  activeTab,
  onSelectTab,
  profile,
  quotesCount = 0,
  entitlement,
  onOpenPremiumModal,
}: Props) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const userIsPremium = isPremium(entitlement);


  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems: Array<{
    id: AppTab;
    label: string;
    icon: typeof Calculator;
    badge?: number;
  }> = [
    { id: 'home', label: 'Accueil', icon: Home },
    { id: 'calculator', label: 'Calculateur', icon: Calculator },
    { id: 'quotes', label: 'Devis & Historique', icon: History, badge: quotesCount },
    { id: 'materials', label: 'Matériaux', icon: Package },
    { id: 'templates', label: 'Modèles', icon: BookmarkCheck },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Brand */}
          <button
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 hover:opacity-90 transition-opacity text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Hammer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  Atelier<span className="text-teal-400">Devis</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                  {profile.currencySymbol || 'FCFA'}
                </span>
              </div>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id || (item.id === 'quotes' && activeTab === 'quote-builder');
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg text-[11px] lg:text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-700/80 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
                  <span>
                    {item.id === 'quotes' ? (
                      <>
                        <span>Devis</span>
                        <span className="hidden xl:inline"> & Historique</span>
                      </>
                    ) : item.id === 'calculator' ? (
                      <>
                        <span>Calcul</span>
                        <span className="hidden xl:inline">ateur</span>
                      </>
                    ) : (
                      item.label
                    )}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[9px] lg:text-[10px] px-1 lg:px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-white text-teal-900'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Status / Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs shrink-0">
            {/* Plan Badge Button */}
            {onOpenPremiumModal && (
              <button
                onClick={onOpenPremiumModal}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold transition-all ${
                  userIsPremium
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
                title={userIsPremium ? 'Version Premium Active - Voir les détails' : 'Passer à la version Premium'}
              >
                {userIsPremium ? (
                  <>
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Premium</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Version</span>
                    <span>Gratuite</span>
                  </>
                )}
              </button>
            )}

            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                isOnline
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
              }`}
              title={isOnline ? 'Application synchronisée localement' : 'Mode 100% hors-ligne actif'}
            >
              {isOnline ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-amber-400" />
              )}
              <span>{isOnline ? 'Local-First' : 'Hors-ligne'}</span>
            </div>

            <button
              onClick={() => onSelectTab('calculator')}
              className="hidden xl:flex px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-xs items-center gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calcul Rapide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Phone-first UX) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 py-1 flex justify-around items-center text-slate-400">
        {[
          { id: 'home' as AppTab, label: 'Accueil', icon: Home },
          { id: 'calculator' as AppTab, label: 'Calcul', icon: Calculator },
          { id: 'quotes' as AppTab, label: 'Devis', icon: History, badge: quotesCount },
          { id: 'materials' as AppTab, label: 'Matériaux', icon: Package },
          { id: 'templates' as AppTab, label: 'Modèles', icon: BookmarkCheck },
          { id: 'settings' as AppTab, label: 'Réglages', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id || (item.id === 'quotes' && activeTab === 'quote-builder');
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex-1 min-w-0 flex flex-col items-center justify-center py-1 rounded-lg transition-colors ${
                isActive ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-teal-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[54px] text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
