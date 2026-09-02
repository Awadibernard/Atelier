import { useState, useMemo } from 'react';
import {
  Calculator,
  FileText,
  History,
  Package,
  BookmarkCheck,
  ArrowRight,
  TrendingUp,
  Clock,
  Sparkles,
  Plus,
  ShieldCheck,
  Hammer,
  CheckCircle2,
  Crown,
  Zap,
  Lock,
} from 'lucide-react';
import {
  AppTab,
  BusinessProfile,
  Quote,
  RecentCalculation,
  UserEntitlement,
  WorkshopTemplate,
} from '../types';
import { formatCurrency, formatDateFrench } from '../utils/formatters';
import { isPremium } from '../licensing/features';
import { PremiumBadge } from './licensing/PremiumBadge';
import { PremiumGateModal } from './licensing/PremiumGateModal';

interface Props {
  profile: BusinessProfile;
  quotes: Quote[];
  recentCalculations?: RecentCalculation[];
  templates: WorkshopTemplate[];
  onNavigate: (tab: AppTab) => void;
  onNewQuote: () => void;
  onOpenCalculator: () => void;
  onUseTemplate: (template: WorkshopTemplate) => void;
  onSelectQuote: (quote: Quote) => void;
  entitlement?: UserEntitlement;
  onOpenPremiumModal?: () => void;
}

export function HomeView({
  profile,
  quotes,
  recentCalculations = [],
  templates,
  onNavigate,
  onNewQuote,
  onOpenCalculator,
  onUseTemplate,
  onSelectQuote,
  entitlement,
  onOpenPremiumModal,
}: Props) {
  const currency = profile.currencySymbol || 'FCFA';
  const recentQuotes = quotes.slice(0, 4);
  const userIsPremium = isPremium(entitlement);

  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [selectedPremiumTemplate, setSelectedPremiumTemplate] = useState<WorkshopTemplate | null>(null);

  // Filter templates based on showSystemTemplates user preference
  const showSysTemplates =
    profile.showSystemTemplates !== false && profile.showPredefinedTemplates !== false;
  const visibleTemplates = useMemo(() => {
    if (!showSysTemplates) {
      return templates.filter((t) => t.isCustom);
    }
    return templates;
  }, [templates, showSysTemplates]);

  const handleAttemptUseTemplate = (tpl: WorkshopTemplate) => {
    if (tpl.isPremiumOnly && !userIsPremium) {
      setSelectedPremiumTemplate(tpl);
      setGateModalOpen(true);
      return;
    }
    onUseTemplate(tpl);
  };

  // Quick workshop statistics
  const totalDevisAmount = quotes.reduce((sum, q) => sum + (q.finalTotal || 0), 0);
  const acceptedDevis = quotes.filter((q) => q.status === 'Accepté' || q.status === 'Terminé');
  const acceptedAmount = acceptedDevis.reduce((sum, q) => sum + (q.finalTotal || 0), 0);


  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 pb-32 md:pb-12 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold">
              <Hammer className="w-3.5 h-3.5" />
              <span>Atelier & Fabrication sur mesure</span>
            </div>
            {userIsPremium ? (
              <PremiumBadge label="Premium Actif" size="sm" variant="gold" />
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                Version Gratuite
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {profile.name || 'AtelierDevis'}
          </h1>
          <p className="text-sm text-slate-300 font-normal">
            Calculez le coût réel de vos ouvrages (acier, tôles, découpe, soudure, chutes et finitions) avec une marge garantie, et générez des devis professionnels prêts pour WhatsApp et PDF.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenCalculator}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all shadow-md active:scale-98"
          >
            <Calculator className="w-4 h-4" />
            <span>Calculer un ouvrage</span>
          </button>

          <button
            onClick={onNewQuote}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs sm:text-sm border border-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Devis direct</span>
          </button>
        </div>
      </div>

      {/* Non-blocking reminder to set up company profile if empty */}
      {(!profile.name || !profile.phone || !profile.address) && (
        <div className="bg-teal-50/80 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <span className="font-bold text-teal-950 block text-xs sm:text-sm">
                Personnalisez vos devis avec les informations de votre entreprise
              </span>
              <p className="text-teal-800 text-[11px] sm:text-xs">
                Pensez à renseigner le nom de votre atelier, vos numéros de contact et votre adresse dans les paramètres pour vos documents PDF et partages.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('settings')}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition-all shadow-2xs shrink-0"
          >
            <span>Renseigner mes infos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Free tier discovery strip */}
      {!userIsPremium && onOpenPremiumModal && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-xs sm:text-sm">
                Passez au niveau supérieur avec AtelierDevis Premium
              </span>
              <p className="text-slate-600 text-[11px] sm:text-xs">
                Modèles industriels spécialisés, devis illimités, exports tableurs Excel et PDF certifiés.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenPremiumModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-2xs shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Découvrir Premium</span>
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Devis Émis
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-1">
            {quotes.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Volume : <span className="font-mono">{formatCurrency(totalDevisAmount, currency)}</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
            Devis Acceptés & Livrés
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-900 mt-1">
            {acceptedDevis.length}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">
            Chiffre d'affaires : <span className="font-mono font-bold">{formatCurrency(acceptedAmount, currency)}</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Marge Cible Atelier
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-teal-700 mt-1">
            {profile.defaultMarginPercent}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Taux horaire : <span className="font-mono">{formatCurrency(profile.defaultLaborRate, currency)}/h</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Modèles Prêts à l'emploi
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 mt-1">
            {visibleTemplates.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Portes, fenêtres, portails, grilles...
          </div>
        </div>
      </div>

      {/* Quick Launch Section: Templates & Calculations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Templates shortcuts (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <BookmarkCheck className="w-5 h-5 text-teal-600" />
              Modèles rapides d'ouvrages
            </h2>
            <button
              onClick={() => onNavigate('templates')}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-1"
            >
              <span>Voir tous ({visibleTemplates.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleTemplates.slice(0, 4).map((tpl) => {
              const isGated = tpl.isPremiumOnly && !userIsPremium;
              return (
                <div
                  key={tpl.id}
                  onClick={() => handleAttemptUseTemplate(tpl)}
                  className={`group p-4 rounded-xl shadow-2xs cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    tpl.isPremiumOnly
                      ? 'bg-gradient-to-br from-white to-amber-50/40 border border-amber-300 hover:border-amber-400'
                      : tpl.isCustom
                      ? 'bg-gradient-to-br from-white to-teal-50/30 border border-teal-200 hover:border-teal-400'
                      : 'bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-400'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-800">
                          {tpl.category}
                        </span>
                        {tpl.isPremiumOnly && (
                          <PremiumBadge label="Pro" size="xs" variant="gold" />
                        )}
                        {tpl.isCustom && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-bold">
                            Perso
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {tpl.targetMarginPercent}% marge
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-teal-900 line-clamp-1 flex items-center gap-1">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{tpl.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-slate-100">
                    <span className={isGated ? 'text-amber-700 flex items-center gap-1' : 'text-teal-700'}>
                      {isGated ? (
                        <>
                          <Lock className="w-3 h-3 text-amber-600" />
                          <span>Modèle Pro</span>
                        </>
                      ) : (
                        <span>Charger ce calcul</span>
                      )}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Quotes & Calculations (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-teal-600" />
              Devis Récents
            </h2>
            <button
              onClick={() => onNavigate('quotes')}
              className="text-xs text-teal-700 hover:text-teal-900 font-semibold inline-flex items-center gap-1"
            >
              <span>Historique complet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {recentQuotes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p>Aucun devis enregistré pour l'instant.</p>
                <button
                  onClick={onNewQuote}
                  className="px-3 py-1.5 bg-teal-50 text-teal-800 rounded font-bold hover:bg-teal-100 text-xs"
                >
                  Créer un premier devis
                </button>
              </div>
            ) : (
              recentQuotes.map((q) => (
                <div
                  key={q.id}
                  onClick={() => onSelectQuote(q)}
                  className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{q.quoteNumber}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                          q.status === 'Accepté' || q.status === 'Terminé'
                            ? 'bg-emerald-100 text-emerald-800'
                            : q.status === 'Envoyé'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 truncate">
                      {q.customer.name || 'Client sans nom'}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{q.projectTitle}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(q.finalTotal, currency)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatDateFrench(q.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      {/* Feature Gate Modal */}
      <PremiumGateModal
        isOpen={gateModalOpen}
        onClose={() => setGateModalOpen(false)}
        featureKey="advanced_templates"
        customTitle={`Modèle Professionnel Spécialisé : ${selectedPremiumTemplate?.name || 'Ouvrage Pro'}`}
        customDescription={`Ce modèle avancé (${selectedPremiumTemplate?.name}) est inclus dans la formule AtelierDevis Premium. Les modèles de base restent 100% gratuits.`}
        onOpenPremiumInfo={() => {
          if (onOpenPremiumModal) {
            onOpenPremiumModal();
          }
        }}
      />
    </div>
  );
}
