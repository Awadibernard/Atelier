import {
  X,
  Crown,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { FeatureKey } from '../../licensing/types';
import { FEATURE_DEFINITIONS } from '../../licensing/features';
import { PremiumBadge } from './PremiumBadge';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  featureKey?: FeatureKey;
  onOpenPremiumInfo: () => void;
  customTitle?: string;
  customDescription?: string;
}

export function PremiumGateModal({
  isOpen,
  onClose,
  featureKey,
  onOpenPremiumInfo,
  customTitle,
  customDescription,
}: Props) {
  if (!isOpen) return null;

  const feature = featureKey ? FEATURE_DEFINITIONS[featureKey] : null;
  const title = customTitle || feature?.name || 'Fonctionnalité Premium';
  const description =
    customDescription ||
    feature?.description ||
    'Cette fonctionnalité est disponible dans la version AtelierDevis Premium.';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Top Header with subtle golden accent */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 shadow-inner">
            <Crown className="w-6 h-6" />
          </div>

          <div className="inline-block mb-1">
            <PremiumBadge label="AtelierDevis Premium" size="sm" variant="gold" />
          </div>

          <h3 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-950 leading-relaxed">
            <p className="font-semibold text-slate-900 mb-1">
              Cette fonctionnalité est disponible dans AtelierDevis Premium.
            </p>
            <p className="text-slate-600">{description}</p>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">
              Ce qui reste 100% gratuit et illimité :
            </div>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Calculs complets d'ouvrages (matière, chutes, main d'œuvre, marge)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Modèles standards (portes, portails, fenêtres, grilles, tables)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Génération & impression de devis PDF professionnels</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Fonctionnement 100% hors-ligne local</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => {
                onClose();
                onOpenPremiumInfo();
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-98"
            >
              <Zap className="w-4 h-4" />
              <span>En savoir plus sur Premium</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 px-4 text-slate-600 hover:text-slate-900 font-semibold text-xs transition-colors text-center"
            >
              Continuer avec la version Gratuite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
