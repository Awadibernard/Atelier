import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import {
  Settings,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Upload,
  Download,
  Database,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Coins,
  ShieldCheck,
  Percent,
  Clock,
  Play,
  Crown,
  Key,
  Sparkles,
  Flame,
  Zap,
} from 'lucide-react';
import { BusinessProfile, RoundingStep, UserEntitlement } from '../types';
import { sanitizeNumber } from '../engine/calculator';
import { runCalculationTests, TestResult } from '../engine/calculator.test';
import { isPremium } from '../licensing/features';
import {
  createDefaultFreeEntitlement,
  createDevelopmentTestEntitlement,
} from '../licensing/licenseVerifier';
import { PremiumBadge } from './licensing/PremiumBadge';
import { formatDateFrench } from '../utils/formatters';

interface Props {
  profile: BusinessProfile;
  onSaveProfile: (profile: BusinessProfile) => void;
  onExportData: () => void;
  onImportData: (jsonString: string) => { success: boolean; message: string };
  onResetData: () => void;
  entitlement?: UserEntitlement;
  onUpdateEntitlement?: (entitlement: UserEntitlement) => void;
  onOpenPremiumModal?: () => void;
}

export function SettingsView({
  profile,
  onSaveProfile,
  onExportData,
  onImportData,
  onResetData,
  entitlement,
  onUpdateEntitlement,
  onOpenPremiumModal,
}: Props) {
  const [formData, setFormData] = useState<BusinessProfile>({ ...profile });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const userIsPremium = isPremium(entitlement);


  // Test Runner state
  const [testResults, setTestResults] = useState<{ results: TestResult[]; allPassed: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert image to data URL
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData((prev) => ({ ...prev, logoUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: undefined }));
  };

  const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const res = onImportData(content);
      setImportStatus(res.message);
      if (res.success) {
        setTimeout(() => window.location.reload(), 1200);
      }
    };
    reader.readAsText(file);
  };

  const handleRunTests = () => {
    const res = runCalculationTests();
    setTestResults(res);
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 md:pb-12 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-600" />
            Paramètres de l'Atelier
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configurez les coordonnées de votre atelier, vos marges par défaut et sauvegardez vos données.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Business Profile */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            1. Profil & Coordonnées de l'Atelier
          </h2>

          {/* Logo upload */}
          <div className="flex items-center gap-4 py-2">
            <div className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
              {formData.logoUrl ? (
                <img
                  src={formData.logoUrl}
                  alt="Logo atelier"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 block">Logo de l'atelier (pour les PDF)</span>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{formData.logoUrl ? 'Changer le logo' : 'Téléverser un logo'}</span>
                </button>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Supprimer le logo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Format PNG ou JPG, fond transparent recommandé.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nom de l'Atelier / Entreprise *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Slogan / Spécialité
              </label>
              <input
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Ex: Soudure, Ferronnerie & Menuiserie métallique"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Téléphone principal
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+221 77 000 00 00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Numéro WhatsApp (pour devis direct)
              </label>
              <input
                type="tel"
                value={formData.whatsapp || ''}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+221 77 000 00 00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Email de contact
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@atelier.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                NINEA / RCCM / NIF (Optionnel)
              </label>
              <input
                type="text"
                value={formData.taxId || ''}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="RC/SN-2024-B-0000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Adresse de l'Atelier
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Zone industrielle, Rue 12"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Ville & Pays
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Dakar, Sénégal"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* 2. Defaults for calculations */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <Coins className="w-4 h-4 text-teal-600" />
            2. Valeurs par Défaut du Calculateur
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Marge bénéficiaire par défaut (%)
              </label>
              <input
                type="number"
                min="5"
                max="80"
                value={formData.defaultMarginPercent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultMarginPercent: sanitizeNumber(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Pertes / Chutes par défaut (%)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={formData.defaultWastePercent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultWastePercent: sanitizeNumber(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Taux horaire moyen (FCFA/h)
              </label>
              <input
                type="number"
                min="500"
                step="100"
                value={formData.defaultLaborRate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultLaborRate: sanitizeNumber(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Arrondi commercial par défaut
              </label>
              <select
                value={formData.defaultRounding}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultRounding: e.target.value as RoundingStep,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900"
              >
                <option value="none">Sans arrondi (Montant exact)</option>
                <option value="100">À 100 FCFA près</option>
                <option value="500">À 500 FCFA près</option>
                <option value="1000">À 1 000 FCFA près</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Durée de validité des devis (Jours)
              </label>
              <input
                type="number"
                min="7"
                max="90"
                value={formData.defaultValidityDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultValidityDays: sanitizeNumber(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="font-semibold text-slate-700 block mb-1 text-xs">
              Modalités de paiement par défaut
            </label>
            <input
              type="text"
              value={formData.defaultPaymentTerms || ''}
              onChange={(e) =>
                setFormData({ ...formData, defaultPaymentTerms: e.target.value })
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs"
          >
            {saveSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            ) : (
              <Building2 className="w-4 h-4" />
            )}
            <span>{saveSuccess ? 'Paramètres enregistrés !' : 'Enregistrer les paramètres'}</span>
          </button>
        </div>
      </form>

      {/* 3. Licence & Version (Free / Premium) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            3. Licence & Version (Gratuit / Premium)
          </h2>
          <PremiumBadge
            label={userIsPremium ? 'Version Premium Active' : 'Version Gratuite'}
            variant={userIsPremium ? 'gold' : 'subtle'}
            size="sm"
          />
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">
                {userIsPremium ? 'AtelierDevis Premium' : 'AtelierDevis Gratuit'}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {userIsPremium ? '(Accès complet illimité)' : '(15 devis inclus)'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {userIsPremium
                ? 'Tous les outils avancés sont déverrouillés (modèles industriels, devis illimités, branding PDF).'
                : 'Version gratuite opérationnelle hors-ligne avec calculateur complet.'}
            </p>
            {entitlement?.licenseKeyMasked && (
              <div className="text-[11px] font-mono text-slate-500 pt-0.5">
                Clé active : <span className="font-bold text-slate-700">{entitlement.licenseKeyMasked}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenPremiumModal && (
              <button
                type="button"
                onClick={onOpenPremiumModal}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{userIsPremium ? 'Gérer la licence' : 'Découvrir Premium'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Development Test Toggle for dev verification */}
        {onUpdateEntitlement && (
          <div className="p-3 bg-amber-50/60 border border-dashed border-amber-300 rounded-lg text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px]">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                Mode Test Développeur (Architecture Free/Premium)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">
                DEV
              </span>
            </div>
            <p className="text-[11px] text-amber-800">
              Basculez rapidement entre Free et Premium pour vérifier le verrouillage et déverrouillage des fonctionnalités.
            </p>
            <div className="flex gap-2 pt-1">
              {!userIsPremium ? (
                <button
                  type="button"
                  onClick={() => onUpdateEntitlement(createDevelopmentTestEntitlement())}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-md text-xs transition-colors"
                >
                  Basculer en Premium (Test)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateEntitlement(createDefaultFreeEntitlement())}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-md text-xs transition-colors"
                >
                  Revenir au Mode Gratuit
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Backup, Export and Restore */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
          <Database className="w-4 h-4 text-teal-600" />
          4. Sauvegarde & Restauration des Données
        </h2>

        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Stockage 100% local sur cet appareil
          </div>
          <p>
            Toutes vos informations (devis, clients, matériaux, prix) sont stockées dans la mémoire de votre navigateur. Pensez à exporter régulièrement une sauvegarde fichier JSON pour ne rien perdre si vous changez de téléphone ou nettoyez votre historique.
          </p>
        </div>

        {importStatus && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs font-semibold text-teal-800">
            {importStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {/* Export JSON */}
          <button
            type="button"
            onClick={onExportData}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exporter mes données (JSON)</span>
          </button>

          {/* Import JSON */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            <Upload className="w-4 h-4 text-slate-600" />
            <span>Importer une sauvegarde (JSON)</span>
          </button>

          {/* Factory Reset */}
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  '⚠️ ATTENTION : Voulez-vous vraiment réinitialiser toutes les données aux paramètres d’usine ? Tous vos devis locaux seront effacés.'
                )
              ) {
                onResetData();
                window.location.reload();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Réinitialiser aux valeurs d'usine</span>
          </button>
        </div>
      </div>

      {/* 4. Automated Mathematical Self-Test Suite */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            4. Vérification & Tests des Formules Mathématiques
          </h2>

          <button
            type="button"
            onClick={handleRunTests}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold rounded-lg text-xs border border-emerald-300 transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Lancer les tests de calcul</span>
          </button>
        </div>

        <p className="text-xs text-slate-600">
          Valide automatiquement le scénario de test d'atelier (Tube 40x40, Tôle 2mm, Soudure 8h, Transport 5 000, Chutes 5%, Marge 25%, Arrondis, Acompte 40%).
        </p>

        {testResults && (
          <div className="space-y-2 pt-2">
            <div
              className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                testResults.allPassed
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  : 'bg-red-100 text-red-900 border border-red-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>
                {testResults.allPassed
                  ? `Tous les ${testResults.results.length} tests financiers sont validés avec succès à 100% !`
                  : 'Certains tests ont échoué.'}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              {testResults.results.map((t, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200"
                >
                  <span className="text-slate-700">{t.name}</span>
                  <span className="font-mono text-emerald-700 font-bold">
                    {t.passed ? '✓ Validé' : '✗ Échec'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
