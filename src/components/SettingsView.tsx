import { useState, useRef, useEffect, FormEvent, ChangeEvent } from 'react';
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
  Crop,
  X,
  BookmarkCheck,
  Package,
  Layers,
  SlidersHorizontal,
} from 'lucide-react';
import { BusinessProfile, RoundingStep, UserEntitlement, LogoEditSettings, AppTab } from '../types';
import { sanitizeNumber } from '../engine/calculator';
import { runCalculationTests, TestResult } from '../engine/calculator.test';
import { runBackupTests, BackupTestResult } from '../storage/backupEngine.test';
import { isPremium } from '../licensing/features';
import {
  createDefaultFreeEntitlement,
  createDevelopmentTestEntitlement,
} from '../licensing/licenseVerifier';
import { PremiumBadge } from './licensing/PremiumBadge';
import { formatDateFrench } from '../utils/formatters';
import { DEFAULT_PROFILE, getDbSnapshot, applyDbSnapshot } from '../storage/db';
import { LogoEditorModal } from './LogoEditorModal';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { CurrentDbSnapshot } from '../storage/backupEngine';
import { ImportExecutionResult } from '../types';
import { useNotification } from '../context/NotificationContext';
import { focusAndScrollToField } from '../utils/formValidation';

interface Props {
  profile: BusinessProfile;
  onSaveProfile: (profile: BusinessProfile) => void;
  onExportData: () => void;
  onImportData: (jsonString: string) => { success: boolean; message: string };
  onResetData: () => void;
  entitlement?: UserEntitlement;
  onUpdateEntitlement?: (entitlement: UserEntitlement) => void;
  onOpenPremiumModal?: () => void;
  onNavigate?: (tab: AppTab) => void;
  onRestartTour?: () => void;
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
  onNavigate,
  onRestartTour,
}: Props) {
  const [formData, setFormData] = useState<BusinessProfile>({ ...profile });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);

  // In-app modal states
  const [showFactoryResetModal, setShowFactoryResetModal] = useState(false);
  const [isSystemDataModalOpen, setIsSystemDataModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [cropModalSrc, setCropModalSrc] = useState<string | null>(null);
  const [cropModalInitialSettings, setCropModalInitialSettings] = useState<LogoEditSettings | undefined>(undefined);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);

  useEffect(() => {
    setFormData({ ...profile });
  }, [profile]);

  const handleImportSuccess = (nextState: CurrentDbSnapshot, result: ImportExecutionResult) => {
    applyDbSnapshot(nextState);
    setFormData({ ...nextState.profile });
    onSaveProfile(nextState.profile);
    setImportStatus({ success: true, message: result.message });
    showSuccess(result.message);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const userIsPremium = isPremium(entitlement);

  // Test Runner state
  const [testResults, setTestResults] = useState<{ results: TestResult[]; allPassed: boolean } | null>(null);
  const [backupTestResults, setBackupTestResults] = useState<{
    results: BackupTestResult[];
    allPassed: boolean;
  } | null>(null);

  const { showSuccess, showWarning, showError, showInfo } = useNotification();

  const handleToggleSystemSetting = (
    setting: 'templates' | 'templateCategories' | 'materials' | 'materialCategories'
  ) => {
    let updated: BusinessProfile = { ...formData };
    let message = '';

    if (setting === 'templates') {
      const current =
        formData.showSystemTemplates !== false && formData.showPredefinedTemplates !== false;
      const next = !current;
      updated = {
        ...updated,
        showSystemTemplates: next,
        showPredefinedTemplates: next,
      };
      message = next ? '✓ Modèles système activés.' : '✓ Modèles système masqués.';
    } else if (setting === 'templateCategories') {
      const current =
        formData.showSystemTemplateCategories !== false &&
        formData.showPredefinedTemplateCategories !== false;
      const next = !current;
      updated = {
        ...updated,
        showSystemTemplateCategories: next,
        showPredefinedTemplateCategories: next,
      };
      message = next
        ? '✓ Catégories de modèles système activées.'
        : '✓ Catégories de modèles système masquées.';
    } else if (setting === 'materials') {
      const current =
        formData.showSystemMaterials !== false && formData.showPredefinedMaterials !== false;
      const next = !current;
      updated = {
        ...updated,
        showSystemMaterials: next,
        showPredefinedMaterials: next,
      };
      message = next ? '✓ Matériaux système activés.' : '✓ Matériaux système masqués.';
    } else if (setting === 'materialCategories') {
      const current =
        formData.showSystemMaterialCategories !== false &&
        formData.showPredefinedMaterialCategories !== false;
      const next = !current;
      updated = {
        ...updated,
        showSystemMaterialCategories: next,
        showPredefinedMaterialCategories: next,
      };
      message = next
        ? '✓ Catégories de matériaux système activées.'
        : '✓ Catégories de matériaux système masquées.';
    }

    setFormData(updated);
    onSaveProfile(updated);
    showSuccess(message);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleFieldChange = (field: keyof BusinessProfile, value: any, fieldDomId?: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldDomId && validationErrors[fieldDomId]) {
      let isInvalid = false;
      if (field === 'name' && !String(value).trim()) isInvalid = true;
      if (field === 'defaultMarginPercent' && (Number(value) < 0 || Number(value) >= 100)) isInvalid = true;
      if (field === 'defaultWastePercent' && Number(value) < 0) isInvalid = true;
      if (field === 'defaultLaborRate' && Number(value) < 0) isInvalid = true;
      if (field === 'defaultValidityDays' && Number(value) <= 0) isInvalid = true;

      if (!isInvalid) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[fieldDomId];
          return next;
        });
      }
    }
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors['settings-company-name'] = "Veuillez renseigner le nom de l'atelier ou entreprise.";
    }

    if (formData.defaultMarginPercent < 0 || formData.defaultMarginPercent >= 100) {
      errors['settings-default-margin'] = "La marge par défaut doit être comprise entre 0% et 99%.";
    }

    if (formData.defaultWastePercent < 0) {
      errors['settings-default-waste'] = "Le taux de perte par défaut ne peut pas être négatif.";
    }

    if (formData.defaultLaborRate < 0) {
      errors['settings-default-labor-rate'] = "Le tarif horaire moyen par défaut ne peut pas être négatif.";
    }

    if (formData.defaultValidityDays <= 0) {
      errors['settings-default-validity'] = "La durée de validité des devis doit être supérieure à 0 jour.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstKey = Object.keys(errors)[0];
      showError(errors[firstKey]);
      focusAndScrollToField(firstKey);
      return;
    }

    setValidationErrors({});
    onSaveProfile(formData);
    setSaveSuccess(true);
    showSuccess('✓ Paramètres de l\'atelier enregistrés avec succès.');
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropModalSrc(reader.result);
        setCropModalInitialSettings(undefined); // Fresh upload uses default parameters
        setIsCropModalOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyCroppedLogo = (
    croppedDataUrl: string,
    editSettings: LogoEditSettings,
    originalSrc: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: croppedDataUrl,
      logoOriginalUrl: originalSrc,
      logoEditSettings: editSettings,
    }));
    showSuccess('Logo de l\'atelier mis à jour.');
  };

  const handleOpenExistingCrop = () => {
    // Prefer original uncropped source image, fallback to rendered logoUrl for legacy profiles
    const srcToEdit = formData.logoOriginalUrl || formData.logoUrl;
    if (srcToEdit) {
      setCropModalSrc(srcToEdit);
      setCropModalInitialSettings(formData.logoEditSettings);
      setIsCropModalOpen(true);
    }
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoUrl: undefined,
      logoOriginalUrl: undefined,
      logoEditSettings: undefined,
    }));
    showInfo('Logo retiré.');
  };

  const handleConfirmFactoryReset = () => {
    onResetData();
    setFormData({ ...DEFAULT_PROFILE });
    setShowFactoryResetModal(false);
    setResetSuccess(true);
    showSuccess('✓ Données réinitialisées aux valeurs d\'usine.');
    if (onNavigate) {
      onNavigate('home');
    }
  };

  const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      const res = onImportData(content);
      setImportStatus(res);
      if (res.success) {
        showSuccess('✓ Sauvegarde importée avec succès !');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        showError(res.message || 'Erreur lors de l\'importation des données.');
      }
    };
    reader.readAsText(file);
  };

  const handleRunTests = () => {
    const res = runCalculationTests();
    setTestResults(res);
  };

  const handleRunBackupTests = () => {
    const res = runBackupTests();
    setBackupTestResults(res);
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
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 block">Logo de l'atelier (pour les PDF)</span>
                {formData.logoUrl && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                    {formData.logoEditSettings?.maskShape === 'circle'
                      ? 'Masque Cercle'
                      : formData.logoEditSettings?.maskShape === 'rounded'
                      ? 'Masque Arrondi'
                      : formData.logoEditSettings?.maskShape === 'square'
                      ? 'Masque Carré'
                      : 'Format Original'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                  <span>{formData.logoUrl ? 'Changer l\'image' : 'Téléverser un logo'}</span>
                </button>
                {formData.logoUrl && (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenExistingCrop}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg font-semibold transition-colors flex items-center gap-1.5"
                      title="Ajuster le cadrage, zoom ou changer la forme sans perte de qualité"
                    >
                      <Crop className="w-3.5 h-3.5 text-teal-600" />
                      <span>Cadrer / Masque</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer le logo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Édition non destructive : l'image originale est conservée pour vous permettre de changer de masque à volonté sans dégradation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="settings-company-name" className="font-semibold text-slate-700 block mb-1">
                Nom de l'Atelier / Entreprise *
              </label>
              <input
                id="settings-company-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value, 'settings-company-name')}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold text-slate-900 focus:bg-white transition-colors ${
                  validationErrors['settings-company-name']
                    ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-teal-500'
                }`}
              />
              {validationErrors['settings-company-name'] && (
                <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{validationErrors['settings-company-name']}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="settings-tagline" className="font-semibold text-slate-700 block mb-1">
                Slogan / Spécialité
              </label>
              <input
                id="settings-tagline"
                type="text"
                value={formData.tagline || ''}
                onChange={(e) => handleFieldChange('tagline', e.target.value)}
                placeholder="Ex: Soudure, Ferronnerie & Menuiserie métallique"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="settings-phone" className="font-semibold text-slate-700 block mb-1">
                Téléphone principal
              </label>
              <input
                id="settings-phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="+221 77 000 00 00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="settings-whatsapp" className="font-semibold text-slate-700 block mb-1">
                Numéro WhatsApp (pour devis direct)
              </label>
              <input
                id="settings-whatsapp"
                type="tel"
                value={formData.whatsapp || ''}
                onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
                placeholder="+221 77 000 00 00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="settings-email" className="font-semibold text-slate-700 block mb-1">
                Email de contact
              </label>
              <input
                id="settings-email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="contact@atelier.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="settings-tax-id" className="font-semibold text-slate-700 block mb-1">
                NINEA / RCCM / NIF (Optionnel)
              </label>
              <input
                id="settings-tax-id"
                type="text"
                value={formData.taxId || ''}
                onChange={(e) => handleFieldChange('taxId', e.target.value)}
                placeholder="RC/SN-2024-B-0000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="settings-address" className="font-semibold text-slate-700 block mb-1">
                Adresse de l'Atelier
              </label>
              <input
                id="settings-address"
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Zone industrielle, Rue 12"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="settings-city" className="font-semibold text-slate-700 block mb-1">
                Ville & Pays
              </label>
              <input
                id="settings-city"
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleFieldChange('city', e.target.value)}
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
              <label htmlFor="settings-default-margin" className="font-semibold text-slate-700 block mb-1">
                Marge bénéficiaire par défaut (%)
              </label>
              <input
                id="settings-default-margin"
                type="number"
                min="0"
                max="99"
                value={formData.defaultMarginPercent}
                onChange={(e) =>
                  handleFieldChange('defaultMarginPercent', sanitizeNumber(e.target.value), 'settings-default-margin')
                }
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg font-mono font-bold text-slate-900 focus:bg-white transition-colors ${
                  validationErrors['settings-default-margin']
                    ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-teal-500'
                }`}
              />
              {validationErrors['settings-default-margin'] && (
                <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{validationErrors['settings-default-margin']}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="settings-default-waste" className="font-semibold text-slate-700 block mb-1">
                Pertes / Chutes par défaut (%)
              </label>
              <input
                id="settings-default-waste"
                type="number"
                min="0"
                max="50"
                value={formData.defaultWastePercent}
                onChange={(e) =>
                  handleFieldChange('defaultWastePercent', sanitizeNumber(e.target.value), 'settings-default-waste')
                }
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg font-mono font-bold text-slate-900 focus:bg-white transition-colors ${
                  validationErrors['settings-default-waste']
                    ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-teal-500'
                }`}
              />
              {validationErrors['settings-default-waste'] && (
                <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{validationErrors['settings-default-waste']}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="settings-default-labor-rate" className="font-semibold text-slate-700 block mb-1">
                Taux horaire moyen (FCFA/h)
              </label>
              <input
                id="settings-default-labor-rate"
                type="number"
                min="0"
                step="100"
                value={formData.defaultLaborRate}
                onChange={(e) =>
                  handleFieldChange('defaultLaborRate', sanitizeNumber(e.target.value), 'settings-default-labor-rate')
                }
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg font-mono font-bold text-slate-900 focus:bg-white transition-colors ${
                  validationErrors['settings-default-labor-rate']
                    ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-teal-500'
                }`}
              />
              {validationErrors['settings-default-labor-rate'] && (
                <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{validationErrors['settings-default-labor-rate']}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="settings-default-rounding" className="font-semibold text-slate-700 block mb-1">
                Arrondi commercial par défaut
              </label>
              <select
                id="settings-default-rounding"
                value={formData.defaultRounding}
                onChange={(e) =>
                  handleFieldChange('defaultRounding', e.target.value as RoundingStep)
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
              <label htmlFor="settings-default-validity" className="font-semibold text-slate-700 block mb-1">
                Durée de validité des devis (Jours)
              </label>
              <input
                id="settings-default-validity"
                type="number"
                min="1"
                max="180"
                value={formData.defaultValidityDays}
                onChange={(e) =>
                  handleFieldChange('defaultValidityDays', sanitizeNumber(e.target.value), 'settings-default-validity')
                }
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg font-mono text-slate-900 transition-colors ${
                  validationErrors['settings-default-validity']
                    ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:ring-teal-500'
                }`}
              />
              {validationErrors['settings-default-validity'] && (
                <p className="mt-1 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>{validationErrors['settings-default-validity']}</span>
                </p>
              )}
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

          {/* System data visibility settings row */}
          <div className="pt-3 border-t border-slate-200">
            <div
              id="settings-system-data-visibility-row"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition-colors"
            >
              <div className="space-y-1">
                <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Gérer l’affichage des données système</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choisissez séparément quelles données prédéfinies sont visibles dans l’application.
                </p>
              </div>

              <button
                type="button"
                id="btn-open-system-data-modal"
                onClick={() => setIsSystemDataModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-600" />
                <span>Gérer l’affichage</span>
              </button>
            </div>
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
            Stockage 100% local et sécurisé sur cet appareil
          </div>
          <p>
            Toutes vos informations (devis, clients, matériaux, prix) sont stockées dans la mémoire locale de votre navigateur. Pensez à exporter régulièrement une sauvegarde JSON pour conserver vos données en cas de changement d'appareil.
          </p>
        </div>

        {importStatus && (
          <div
            className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
              importStatus.success
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-red-50 border border-red-200 text-red-900'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {/* Export JSON */}
          <button
            id="settings-open-export-modal-btn"
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Exporter mes données (JSON)</span>
          </button>

          {/* Import JSON */}
          <button
            id="settings-open-import-modal-btn"
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            <Upload className="w-4 h-4 text-teal-600" />
            <span>Importer une sauvegarde (JSON)</span>
          </button>
        </div>
      </div>

      {/* 5. Factory Reset / Danger Zone */}
      <div className="bg-red-50/40 rounded-xl border border-red-200/80 shadow-2xs p-5 space-y-3">
        <h2 className="text-sm font-bold text-red-950 uppercase tracking-wider flex items-center gap-2 border-b border-red-100 pb-2">
          <Trash2 className="w-4 h-4 text-red-600" />
          5. Réinitialisation Complète aux Paramètres d'Usine
        </h2>

        <p className="text-xs text-red-800">
          Cette action efface l'intégralité de vos devis enregistrés, historiques de calculs, matériaux personnalisés et remet l'application dans son état d'origine. Cette action est irréversible.
        </p>

        {resetSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Toutes les données ont été réinitialisées avec succès aux valeurs d'usine !</span>
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowFactoryResetModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-red-300 hover:bg-red-600 hover:text-white text-red-700 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Réinitialiser toutes les données d'usine</span>
          </button>
        </div>
      </div>

      {/* Visite Guidée */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
          <Sparkles className="w-4 h-4 text-teal-600" />
          6. Visite Guidée & Prise en Main
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
          <div className="space-y-1">
            <div className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
              <span>Présentation interactive en 7 étapes</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Revoir la visite guidée pour explorer l'ensemble des modules d'AtelierDevis (calculateur, devis, matériaux, modèles, paramètres).
            </p>
          </div>
          <button
            type="button"
            id="btn-restart-guided-tour"
            onClick={() => {
              if (onRestartTour) {
                onRestartTour();
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Play className="w-4 h-4" />
            <span>Relancer la visite guidée</span>
          </button>
        </div>
      </div>

      {/* 7. Automated Mathematical Self-Test Suite */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            7. Vérification & Tests des Formules Mathématiques
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

        {/* Lot 3: Backup & Restore Self-Tests (12 Scenarios) */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between pb-2">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-teal-600" />
                Tests Automatisés Sauvegarde & Import JSON Intelligent (Lot 3)
              </div>
              <p className="text-[11px] text-slate-500">
                12 scénarios : export complet, export sélectif (matériaux/modèles/devis/profil), import partiel, fusion sans écrasement, remplacement ciblé, détection & arbitrage des conflits, rejet JSON corrompu, et rétrocompatibilité V1.
              </p>
            </div>

            <button
              id="btn-run-backup-tests"
              type="button"
              onClick={handleRunBackupTests}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 font-bold rounded-lg text-xs border border-teal-300 transition-colors shrink-0 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Lancer les 12 tests Lot 3</span>
            </button>
          </div>

          {backupTestResults && (
            <div className="space-y-2 pt-2 animate-in fade-in duration-150">
              <div
                className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                  backupTestResults.allPassed
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-red-100 text-red-900 border border-red-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  {backupTestResults.allPassed
                    ? `Tous les ${backupTestResults.results.length} tests d'import/export intelligent (Lot 3) sont validés avec succès à 100% !`
                    : 'Certains tests de sauvegarde ont échoué.'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs">
                {backupTestResults.results.map((t) => (
                  <div
                    key={t.id}
                    className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5"
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-slate-800">{t.name}</span>
                      <span
                        className={`font-mono text-[11px] font-bold ${
                          t.passed ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {t.passed ? '✓ Validé' : '✗ Échec'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{t.details}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Modal: Independent System Data Visibility Management */}
      {isSystemDataModalOpen && (
        <div
          id="modal-system-data-visibility"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Gérer l’affichage des données système
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choisissez séparément quelles données prédéfinies sont visibles dans l’application.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSystemDataModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Section 1: Modèles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <BookmarkCheck className="w-4 h-4 text-teal-600" />
                  <span>Modèles</span>
                </div>

                {/* Control 1: Modèles système */}
                <div
                  id="setting-system-templates-row"
                  className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-xs sm:text-sm text-slate-900">
                      Modèles système
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                      Afficher ou masquer les modèles gratuits et premium fournis par AtelierDevis.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        formData.showSystemTemplates !== false &&
                        formData.showPredefinedTemplates !== false
                          ? 'text-teal-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {formData.showSystemTemplates !== false &&
                      formData.showPredefinedTemplates !== false
                        ? 'Activé'
                        : 'Masqué'}
                    </span>
                    <button
                      type="button"
                      id="toggle-system-templates"
                      role="switch"
                      aria-checked={
                        formData.showSystemTemplates !== false &&
                        formData.showPredefinedTemplates !== false
                      }
                      onClick={() => handleToggleSystemSetting('templates')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                        formData.showSystemTemplates !== false &&
                        formData.showPredefinedTemplates !== false
                          ? 'bg-teal-600'
                          : 'bg-slate-300'
                      }`}
                    >
                      <span className="sr-only">Afficher les modèles système</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          formData.showSystemTemplates !== false &&
                          formData.showPredefinedTemplates !== false
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Control 2: Catégories des modèles système */}
                <div
                  id="setting-system-template-categories-row"
                  className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-xs sm:text-sm text-slate-900">
                      Catégories des modèles système
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                      Afficher ou masquer les catégories par défaut (Métallerie, Bois, Aluminium, etc.) dans la bibliothèque de modèles.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        formData.showSystemTemplateCategories !== false &&
                        formData.showPredefinedTemplateCategories !== false
                          ? 'text-teal-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {formData.showSystemTemplateCategories !== false &&
                      formData.showPredefinedTemplateCategories !== false
                        ? 'Activé'
                        : 'Masqué'}
                    </span>
                    <button
                      type="button"
                      id="toggle-system-template-categories"
                      role="switch"
                      aria-checked={
                        formData.showSystemTemplateCategories !== false &&
                        formData.showPredefinedTemplateCategories !== false
                      }
                      onClick={() => handleToggleSystemSetting('templateCategories')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                        formData.showSystemTemplateCategories !== false &&
                        formData.showPredefinedTemplateCategories !== false
                          ? 'bg-teal-600'
                          : 'bg-slate-300'
                      }`}
                    >
                      <span className="sr-only">Afficher les catégories des modèles système</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          formData.showSystemTemplateCategories !== false &&
                          formData.showPredefinedTemplateCategories !== false
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 2: Matériaux */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-teal-600" />
                  <span>Matériaux</span>
                </div>

                {/* Control 3: Matériaux système */}
                <div
                  id="setting-system-materials-row"
                  className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-xs sm:text-sm text-slate-900">
                      Matériaux système
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                      Afficher ou masquer la liste des profilés, fers et consommables intégrés par défaut.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        formData.showSystemMaterials !== false &&
                        formData.showPredefinedMaterials !== false
                          ? 'text-teal-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {formData.showSystemMaterials !== false &&
                      formData.showPredefinedMaterials !== false
                        ? 'Activé'
                        : 'Masqué'}
                    </span>
                    <button
                      type="button"
                      id="toggle-system-materials"
                      role="switch"
                      aria-checked={
                        formData.showSystemMaterials !== false &&
                        formData.showPredefinedMaterials !== false
                      }
                      onClick={() => handleToggleSystemSetting('materials')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                        formData.showSystemMaterials !== false &&
                        formData.showPredefinedMaterials !== false
                          ? 'bg-teal-600'
                          : 'bg-slate-300'
                      }`}
                    >
                      <span className="sr-only">Afficher les matériaux système</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          formData.showSystemMaterials !== false &&
                          formData.showPredefinedMaterials !== false
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Control 4: Catégories des matériaux système */}
                <div
                  id="setting-system-material-categories-row"
                  className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="space-y-0.5 pr-2">
                    <div className="font-bold text-xs sm:text-sm text-slate-900">
                      Catégories des matériaux système
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                      Afficher ou masquer les catégories de matériaux standard du système (Tubes & Profilés, Tôles, Soudure, etc.).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        formData.showSystemMaterialCategories !== false &&
                        formData.showPredefinedMaterialCategories !== false
                          ? 'text-teal-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {formData.showSystemMaterialCategories !== false &&
                      formData.showPredefinedMaterialCategories !== false
                        ? 'Activé'
                        : 'Masqué'}
                    </span>
                    <button
                      type="button"
                      id="toggle-system-material-categories"
                      role="switch"
                      aria-checked={
                        formData.showSystemMaterialCategories !== false &&
                        formData.showPredefinedMaterialCategories !== false
                      }
                      onClick={() => handleToggleSystemSetting('materialCategories')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                        formData.showSystemMaterialCategories !== false &&
                        formData.showPredefinedMaterialCategories !== false
                          ? 'bg-teal-600'
                          : 'bg-slate-300'
                      }`}
                    >
                      <span className="sr-only">Afficher les catégories des matériaux système</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          formData.showSystemMaterialCategories !== false &&
                          formData.showPredefinedMaterialCategories !== false
                            ? 'translate-x-5'
                            : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsSystemDataModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer shadow-2xs transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated In-App Confirmation Modal for Factory Reset */}
      {showFactoryResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-red-200 overflow-hidden">
            <div className="p-4 bg-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <span>Confirmation de Réinitialisation d'Usine</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFactoryResetModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900 font-semibold space-y-1">
                <p>⚠️ Cette opération est irréversible et supprimera définitivement :</p>
                <ul className="list-disc pl-4 space-y-0.5 text-red-800 text-[11px]">
                  <li>Tous vos devis enregistrés et numéros de séquence</li>
                  <li>Vos brouillons de calculs et de devis en cours</li>
                  <li>Vos coordonnées d'atelier et logo enregistrés</li>
                  <li>Vos matériaux et modèles personnalisés ajoutés</li>
                </ul>
              </div>

              <p className="text-slate-600">
                L'application sera remise dans son état d'origine propre sans données fictives. Êtes-vous certain de vouloir continuer ?
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowFactoryResetModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmFactoryReset}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Oui, tout réinitialiser</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logo Cropping & Mask Editor Modal */}
      {cropModalSrc && (
        <LogoEditorModal
          isOpen={isCropModalOpen}
          imageSrc={cropModalSrc}
          initialSettings={cropModalInitialSettings}
          onClose={() => {
            setIsCropModalOpen(false);
            setCropModalSrc(null);
            setCropModalInitialSettings(undefined);
          }}
          onConfirm={handleApplyCroppedLogo}
        />
      )}

      {/* Lot 3: Selective JSON Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        snapshot={getDbSnapshot()}
      />

      {/* Lot 3: Intelligent JSON Import Modal with Preview & Conflicts */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        snapshot={getDbSnapshot()}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
}
