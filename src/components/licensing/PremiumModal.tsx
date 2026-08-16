import { useState, FormEvent } from 'react';
import {
  X,
  Crown,
  Sparkles,
  CheckCircle2,
  Key,
  ShieldCheck,
  Zap,
  HelpCircle,
  Smartphone,
  CreditCard,
  Building2,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Infinity as InfinityIcon,
  Layers,
  Cloud,
  FileCheck,
  Flame,
} from 'lucide-react';
import { UserEntitlement } from '../../licensing/types';
import { isPremium } from '../../licensing/features';
import {
  createDefaultFreeEntitlement,
  createDevelopmentTestEntitlement,
  verifyLicenseKey,
} from '../../licensing/licenseVerifier';
import { PremiumBadge } from './PremiumBadge';
import { formatDateFrench } from '../../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entitlement: UserEntitlement;
  onUpdateEntitlement: (entitlement: UserEntitlement) => void;
}

export function PremiumModal({
  isOpen,
  onClose,
  entitlement,
  onUpdateEntitlement,
}: Props) {
  const [licenseInput, setLicenseInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState(false);

  if (!isOpen) return null;

  const userIsPremium = isPremium(entitlement);

  const handleVerifyLicense = async (e: FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setVerificationError(null);
    setActivationSuccess(false);


    try {
      const result = await verifyLicenseKey(licenseInput);
      if (result.valid && result.entitlement) {
        onUpdateEntitlement(result.entitlement);
        setActivationSuccess(true);
        setLicenseInput('');
      } else {
        setVerificationError(
          result.errorMessage || 'Clé de licence invalide. Veuillez réessayer.'
        );
      }
    } catch {
      setVerificationError('Une erreur est survenue lors de la vérification.');
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleDevTest = (enable: boolean) => {
    if (enable) {
      const devEntitlement = createDevelopmentTestEntitlement();
      onUpdateEntitlement(devEntitlement);
      setActivationSuccess(true);
    } else {
      const freeEntitlement = createDefaultFreeEntitlement();
      onUpdateEntitlement(freeEntitlement);
      setActivationSuccess(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 sm:p-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  AtelierDevis <span className="text-amber-400">Premium</span>
                </h2>
                <PremiumBadge
                  label={userIsPremium ? 'Actif' : 'Pro'}
                  size="sm"
                  variant="gold"
                />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Outils professionnels étendus pour artisans et ateliers exigeants
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Active Status Banner if user is currently Premium */}
          {userIsPremium && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1 text-emerald-950">
                <div className="font-bold text-emerald-900 text-sm">
                  Licence Premium Active
                </div>
                <p>
                  Vous bénéficiez de toutes les fonctionnalités avancées : devis illimités, modèles industriels, exports tableur et personnalisation complète.
                </p>
                <div className="pt-1 flex flex-wrap gap-3 text-[11px] text-emerald-800 font-mono">
                  <span>Méthode : {entitlement.activationMethod}</span>
                  {entitlement.licenseKeyMasked && (
                    <span>Clé : {entitlement.licenseKeyMasked}</span>
                  )}
                  {entitlement.isDevelopmentTest && (
                    <span className="text-amber-800 font-bold">[Mode Test Dev]</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Success Message on activation */}
          {activationSuccess && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {userIsPremium
                  ? 'Licence Premium activée avec succès sur cet appareil !'
                  : 'Mode Gratuit réactivé.'}
              </span>
            </div>
          )}

          {/* Comparison / Features List */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider text-[11px]">
              Ce que propose la version Premium
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <InfinityIcon className="w-4 h-4 text-teal-600" />
                  <span>Devis & Historique Illimité</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Enregistrez et conservez tous vos devis sans limite de quota (la version Gratuite en permet 15).
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Modèles Ouvrages Avancés</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Garde-corps Inox 304, pergolas bioclimatiques, charpentes industrielles et verrières complexes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <FileCheck className="w-4 h-4 text-teal-600" />
                  <span>Branding PDF & Sans Mention</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Suppression automatique du filigrane standard et mise en page haute définition pour vos clients.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Export Tableur (CSV / Excel)</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Exportez les feuilles de débits de matière et de quincaillerie directement vers Excel.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1 sm:col-span-2">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span>Synchronisation Cloud & Multi-Appareils (À venir)</span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Retrouvez vos devis sur atelier, bureau et chantier via synchronisation sécurisée.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Placeholder Box (Strictly No Invented Prices) */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl p-4 sm:p-5 space-y-2 border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Offre Commerciale
              </span>
              <span className="text-xs text-slate-400">Tarification flexible</span>
            </div>

            <div className="text-base sm:text-lg font-black text-amber-300">
              Prix et moyens de paiement : à venir
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              AtelierDevis sera disponible via de multiples moyens de paiement adaptés à votre pays : <strong>Mobile Money</strong> (Afrique de l'Ouest & Centrale), <strong>Carte bancaire</strong>, et <strong>Virement bancaire</strong> ou licence annuelle/perpétuelle.
            </p>
          </div>

          {/* License Key Activation Section */}
          <div className="border border-slate-200 rounded-xl p-4 sm:p-5 space-y-3 bg-white">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Key className="w-4 h-4 text-teal-600" />
              <span>Activer avec une clé de licence</span>
            </div>

            <p className="text-xs text-slate-500">
              Si vous disposez d'un code ou d'une clé d'activation, saisissez-la ci-dessous pour débloquer votre version Premium sur cet appareil.
            </p>

            <form onSubmit={handleVerifyLicense} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={licenseInput}
                  onChange={(e) => {
                    setLicenseInput(e.target.value);
                    setVerificationError(null);
                  }}
                  placeholder="ex: ATELIER-PREM-TEST-2025"
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={verifying || !licenseInput.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{verifying ? 'Vérification...' : 'Valider la clé'}</span>
                </button>
              </div>

              {verificationError && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{verificationError}</span>
                </div>
              )}
            </form>
          </div>

          {/* Development Test Section (Isolated & Clearly Identified) */}
          <div className="border border-dashed border-amber-300 bg-amber-50/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Mode Test Développeur (Architecture Free/Premium)
                </span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-bold">
                DEV ONLY
              </span>
            </div>

            <p className="text-[11px] text-amber-800 leading-relaxed">
              Ce commutateur permet de basculer instantanément entre le profil <strong>Gratuit</strong> et le profil <strong>Premium</strong> pour tester le comportement des quotas, modèles et exports.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {!userIsPremium ? (
                <button
                  onClick={() => handleToggleDevTest(true)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Activer Premium (Mode Test)</span>
                </button>
              ) : (
                <button
                  onClick={() => handleToggleDevTest(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <span>Désactiver / Revenir au Mode Gratuit</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>Architecture locale-first : fonctionne 100% hors-ligne</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
