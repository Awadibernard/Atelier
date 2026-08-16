import { useState } from 'react';
import {
  BookmarkCheck,
  Plus,
  Trash2,
  Copy,
  Edit,
  Play,
  Hammer,
  ArrowRight,
  Sparkles,
  X,
  FileText,
  Crown,
  Lock,
} from 'lucide-react';
import {
  BusinessProfile,
  CalculationInput,
  CalculationResult,
  UserEntitlement,
  WorkshopTemplate,
} from '../types';
import { calculateQuote } from '../engine/calculator';
import { formatCurrency, generateId } from '../utils/formatters';
import { canUseFeature, isPremium } from '../licensing/features';
import { PremiumBadge } from './licensing/PremiumBadge';
import { PremiumGateModal } from './licensing/PremiumGateModal';

interface Props {
  templates: WorkshopTemplate[];
  profile: BusinessProfile;
  onUseTemplate: (template: WorkshopTemplate) => void;
  onSaveTemplate: (template: Omit<WorkshopTemplate, 'id'> & { id?: string }) => void;
  onDeleteTemplate: (id: string) => void;
  entitlement?: UserEntitlement;
  onOpenPremiumModal?: () => void;
}

export function TemplateLibrary({
  templates,
  profile,
  onUseTemplate,
  onSaveTemplate,
  onDeleteTemplate,
  entitlement,
  onOpenPremiumModal,
}: Props) {
  const currency = profile.currencySymbol || 'FCFA';
  const userIsPremium = isPremium(entitlement);

  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [selectedPremiumTemplate, setSelectedPremiumTemplate] = useState<WorkshopTemplate | null>(null);

  const handleDuplicate = (tpl: WorkshopTemplate) => {
    onSaveTemplate({
      name: `${tpl.name} (Copie)`,
      category: tpl.category,
      description: tpl.description,
      isPremiumOnly: tpl.isPremiumOnly,
      defaultMaterials: [...tpl.defaultMaterials],
      defaultLabor: [...tpl.defaultLabor],
      defaultOtherCosts: [...tpl.defaultOtherCosts],
      wastePercent: tpl.wastePercent,
      targetMarginPercent: tpl.targetMarginPercent,
    });
  };

  const handleAttemptUseTemplate = (tpl: WorkshopTemplate) => {
    if (tpl.isPremiumOnly && !userIsPremium) {
      setSelectedPremiumTemplate(tpl);
      setGateModalOpen(true);
      return;
    }
    onUseTemplate(tpl);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 md:pb-12 space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BookmarkCheck className="w-6 h-6 text-teal-600" />
            Modèles d'Ouvrages Préconfigurés
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Lancez un calcul ou un devis en 1 clic à partir d'un type d'ouvrage standard (porte, portail, grille, table...) ou industriel.
          </p>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((tpl) => {
          // Pre-calculate sample price for this template
          const calcInput: CalculationInput = {
            materials: tpl.defaultMaterials.map((m) => ({ ...m, id: generateId() })),
            wastePercent: tpl.wastePercent || 5,
            labor: tpl.defaultLabor.map((l) => ({ ...l, id: generateId() })),
            otherCosts: tpl.defaultOtherCosts.map((o) => ({ ...o, id: generateId() })),
            overheadType: 'percent',
            overheadValue: 0,
            pricingMode: 'margin',
            targetProfitPercent: tpl.targetMarginPercent || 25,
            roundingStep: 'none',
          };
          const previewResult = calculateQuote(calcInput);
          const isGated = tpl.isPremiumOnly && !userIsPremium;

          return (
            <div
              key={tpl.id}
              className={`rounded-xl border shadow-2xs p-5 flex flex-col justify-between space-y-4 transition-all ${
                tpl.isPremiumOnly
                  ? 'bg-gradient-to-br from-white to-amber-50/30 border-amber-300/80 hover:border-amber-400'
                  : 'bg-white border-slate-200 hover:border-teal-400'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold ${
                        tpl.isPremiumOnly
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      {tpl.isPremiumOnly ? (
                        <Crown className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Hammer className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-slate-900">{tpl.name}</h3>
                        {tpl.isPremiumOnly && (
                          <PremiumBadge label="Pro" size="xs" variant="gold" />
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-semibold uppercase">
                        {tpl.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-semibold">Prix Indicatif</span>
                    <span className="font-mono text-sm font-black text-slate-900">
                      {formatCurrency(previewResult.roundedSellingPrice, currency)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{tpl.description}</p>

                {/* Items preview pills */}
                <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] text-slate-500">
                  <span className="px-2 py-0.5 bg-slate-100 rounded">
                    📦 {tpl.defaultMaterials.length} matériaux
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 rounded">
                    ⏱️ {tpl.defaultLabor.reduce((s, l) => s + l.hours, 0)}h main d'œuvre
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-semibold">
                    🎯 {tpl.targetMarginPercent}% marge
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(tpl)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Dupliquer le modèle"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Supprimer le modèle "${tpl.name}" ?`)) {
                        onDeleteTemplate(tpl.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer le modèle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleAttemptUseTemplate(tpl)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-2xs ${
                    isGated
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                  }`}
                >
                  {isGated ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Ouvrir (Modèle Pro)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Utiliser dans le Calculateur</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Gate Modal */}
      <PremiumGateModal
        isOpen={gateModalOpen}
        onClose={() => setGateModalOpen(false)}
        featureKey="advanced_templates"
        customTitle={`Modèle Spécialisé : ${selectedPremiumTemplate?.name || 'Ouvrage Pro'}`}
        customDescription={`Ce modèle (${selectedPremiumTemplate?.name}) est inclus dans la suite AtelierDevis Premium. Tous les modèles standards restent 100% gratuits.`}
        onOpenPremiumInfo={() => {
          if (onOpenPremiumModal) {
            onOpenPremiumModal();
          }
        }}
      />
    </div>
  );
}

