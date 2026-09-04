import React, { useState } from 'react';
import {
  Download,
  X,
  CheckSquare,
  Square,
  FileText,
  Package,
  Layers,
  Building2,
  Image as ImageIcon,
  Sliders,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { BackupSectionsConfig } from '../types';
import { CurrentDbSnapshot, buildExportJSON, DEFAULT_BACKUP_SECTIONS } from '../storage/backupEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: CurrentDbSnapshot;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, snapshot }) => {
  const [sections, setSections] = useState<BackupSectionsConfig>({ ...DEFAULT_BACKUP_SECTIONS });
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;

  const customTemplatesCount = snapshot.templates.filter((t) => t.isCustom).length;
  const quotesCount = snapshot.quotes.length;
  const materialsCount = snapshot.materials.length;
  const hasLogo = Boolean(snapshot.profile.logoUrl && snapshot.profile.logoUrl.trim().length > 0);
  const hasProfile = Boolean(snapshot.profile.name || snapshot.profile.phone);
  const hasSettings = true;

  const selectedCount = Object.values(sections).filter(Boolean).length;
  const allSelected = selectedCount === 6;

  const toggleAll = () => {
    const nextState = !allSelected;
    setSections({
      quotes: nextState,
      materials: nextState,
      customTemplates: nextState,
      companyProfile: nextState,
      logo: nextState,
      settings: nextState,
    });
  };

  const toggleSection = (key: keyof BackupSectionsConfig) => {
    setSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleExportDownload = () => {
    const jsonString = buildExportJSON(sections, snapshot);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `AtelierDevis-Export-${dateStr}.json`;

    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCopiedNotification(true);
    setTimeout(() => {
      setCopiedNotification(false);
      onClose();
    }, 1200);
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="export-modal-container"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100/80 text-blue-700 rounded-xl shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Exporter les données (Sauvegarde JSON)
              </h3>
              <p className="text-xs text-slate-500">
                Choisissez les éléments que vous souhaitez inclure dans le fichier
              </p>
            </div>
          </div>
          <button
            id="export-modal-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5">
          {/* Quick toggle bar */}
          <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-700">
              {selectedCount === 0
                ? 'Aucune section sélectionnée'
                : selectedCount === 6
                ? 'Toutes les sections incluses'
                : `${selectedCount} section(s) sélectionnée(s)`}
            </div>
            <button
              id="export-select-all-btn"
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              {allSelected ? (
                <>
                  <Square className="w-3.5 h-3.5" /> Tout désélectionner
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> Tout sélectionner
                </>
              )}
            </button>
          </div>

          {/* Section Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* 1. Quotes */}
            <label
              id="export-opt-quotes"
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                sections.quotes
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={sections.quotes}
                onChange={() => toggleSection('quotes')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" /> Devis & Chiffrages
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                    {quotesCount} devis
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Historique complet des devis clients, statuts, montants et détails.
                </p>
              </div>
            </label>

            {/* 2. Materials */}
            <label
              id="export-opt-materials"
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                sections.materials
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={sections.materials}
                onChange={() => toggleSection('materials')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" /> Matériaux & Prix
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    {materialsCount} articles
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Bibliothèque des prix unitaires, catégories et matériaux personnalisés.
                </p>
              </div>
            </label>

            {/* 3. Custom Templates */}
            <label
              id="export-opt-templates"
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                sections.customTemplates
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={sections.customTemplates}
                onChange={() => toggleSection('customTemplates')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" /> Modèles sur mesure
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                    {customTemplatesCount} modèles
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Vos modèles personnalisés d&apos;ouvrages et catégories créées.
                </p>
              </div>
            </label>

            {/* 4. Company Profile */}
            <label
              id="export-opt-profile"
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                sections.companyProfile
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={sections.companyProfile}
                onChange={() => toggleSection('companyProfile')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" /> Profil Entreprise
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {hasProfile ? snapshot.profile.name || 'Configuré' : 'Non renseigné'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Nom commercial, téléphone, adresse, IFU/NINEA et mentions de bas de page.
                </p>
              </div>
            </label>

            {/* 5. Logo */}
            <label
              id="export-opt-logo"
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                sections.logo
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={sections.logo}
                onChange={() => toggleSection('logo')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-indigo-600" /> Logo de l&apos;atelier
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {hasLogo ? 'Présent' : 'Aucun logo'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Image du logo intégré pour l&apos;en-tête officiel des devis PDF.
                </p>
              </div>
            </label>

            {/* 6. Settings */}
            <label
              id="export-opt-settings"
              className={`flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                sections.settings
                  ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={sections.settings}
                onChange={() => toggleSection('settings')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-700" /> Paramètres & Taux
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {snapshot.laborRates.length} taux horaires
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Marges par défaut, pertes chutes, devise et grille de main-d&apos;œuvre.
                </p>
              </div>
            </label>
          </div>

          {/* Security note */}
          <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Le fichier exporté est au format standard JSON. Il contient les métadonnées de version
              permettant une restauration ciblée ou complète ultérieure.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50/70">
          <button
            id="export-cancel-btn"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors text-center"
          >
            Annuler
          </button>

          <button
            id="export-download-confirm-btn"
            type="button"
            disabled={selectedCount === 0}
            onClick={handleExportDownload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 transition-all text-center"
          >
            {copiedNotification ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Export téléchargé !
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Télécharger l&apos;archive JSON
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
