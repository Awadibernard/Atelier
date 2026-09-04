import React, { useState, useRef } from 'react';
import {
  Upload,
  X,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Package,
  Layers,
  Building2,
  Image as ImageIcon,
  Sliders,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  HelpCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  BackupParsedContent,
  BackupSectionsConfig,
  ImportConflictItem,
  ImportConflictResolution,
  ImportExecutionResult,
  ImportMode,
} from '../types';
import {
  CurrentDbSnapshot,
  parseAndValidateBackupJSON,
  detectConflicts,
  executeImport,
  DEFAULT_BACKUP_SECTIONS,
} from '../storage/backupEngine';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: CurrentDbSnapshot;
  onImportSuccess: (nextState: CurrentDbSnapshot, result: ImportExecutionResult) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  onImportSuccess,
}) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<BackupParsedContent | null>(null);

  const [mode, setMode] = useState<ImportMode>('merge');
  const [selectedSections, setSelectedSections] = useState<BackupSectionsConfig>({
    ...DEFAULT_BACKUP_SECTIONS,
  });
  const [conflictResolutions, setConflictResolutions] = useState<
    Record<string, ImportConflictResolution>
  >({});
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = (file: File) => {
    setParseError(null);
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      const res = parseAndValidateBackupJSON(content);

      if (!res.success) {
        setParseError(res.error);
        setParsedData(null);
      } else {
        setParsedData(res.parsed);
        // Default select all available sections
        const initialSections: BackupSectionsConfig = {
          quotes: res.parsed.availableSections.quotes > 0,
          materials: res.parsed.availableSections.materials > 0,
          customTemplates: res.parsed.availableSections.customTemplates > 0,
          companyProfile: res.parsed.availableSections.companyProfile,
          logo: res.parsed.availableSections.logo,
          settings: res.parsed.availableSections.settings,
        };
        setSelectedSections(initialSections);

        // Precompute conflicts
        const detected = detectConflicts(res.parsed, initialSections, snapshot);
        const initialResolutions: Record<string, ImportConflictResolution> = {};
        detected.forEach((c) => {
          initialResolutions[c.id] = c.resolution;
        });
        setConflictResolutions(initialResolutions);
      }
    };

    reader.onerror = () => {
      setParseError("Impossible de lire ce fichier depuis votre appareil.");
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const resetFile = () => {
    setFileContent(null);
    setFileName('');
    setParseError(null);
    setParsedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleSection = (key: keyof BackupSectionsConfig) => {
    if (!parsedData) return;
    const next = { ...selectedSections, [key]: !selectedSections[key] };
    setSelectedSections(next);

    // Refresh conflicts
    const detected = detectConflicts(parsedData, next, snapshot);
    const newResolutions = { ...conflictResolutions };
    detected.forEach((c) => {
      if (!newResolutions[c.id]) {
        newResolutions[c.id] = c.resolution;
      }
    });
    setConflictResolutions(newResolutions);
  };

  const setAllSections = (val: boolean) => {
    if (!parsedData) return;
    const next: BackupSectionsConfig = {
      quotes: val && parsedData.availableSections.quotes > 0,
      materials: val && parsedData.availableSections.materials > 0,
      customTemplates: val && parsedData.availableSections.customTemplates > 0,
      companyProfile: val && parsedData.availableSections.companyProfile,
      logo: val && parsedData.availableSections.logo,
      settings: val && parsedData.availableSections.settings,
    };
    setSelectedSections(next);

    const detected = detectConflicts(parsedData, next, snapshot);
    const newResolutions = { ...conflictResolutions };
    detected.forEach((c) => {
      if (!newResolutions[c.id]) {
        newResolutions[c.id] = c.resolution;
      }
    });
    setConflictResolutions(newResolutions);
  };

  const conflicts =
    parsedData && mode === 'merge'
      ? detectConflicts(parsedData, selectedSections, snapshot)
      : [];

  const handleSetConflictResolution = (
    conflictId: string,
    resolution: ImportConflictResolution
  ) => {
    setConflictResolutions((prev) => ({
      ...prev,
      [conflictId]: resolution,
    }));
  };

  const setAllConflictsResolution = (resolution: ImportConflictResolution) => {
    const updated: Record<string, ImportConflictResolution> = {};
    conflicts.forEach((c) => {
      updated[c.id] = resolution;
    });
    setConflictResolutions(updated);
  };

  const handleConfirmImport = () => {
    if (!parsedData) return;
    setIsProcessing(true);

    setTimeout(() => {
      const execution = executeImport(
        parsedData,
        {
          mode,
          selectedSections,
          conflictResolutions,
        },
        snapshot
      );

      setIsProcessing(false);
      if (execution.success) {
        onImportSuccess(execution.nextDbState, execution.result);
        onClose();
      } else {
        setParseError(execution.message);
      }
    }, 250);
  };

  const selectedCount = Object.entries(selectedSections).filter(
    ([k, v]) => v && parsedData?.availableSections[k as keyof BackupSectionsConfig]
  ).length;

  return (
    <div
      id="import-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        id="import-modal-container"
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100/80 text-blue-700 rounded-xl shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Importer des données (Restauration ou Fusion)
              </h3>
              <p className="text-xs text-slate-500">
                Restauration intelligente et sécurisée avec aperçu et contrôle des conflits
              </p>
            </div>
          </div>
          <button
            id="import-modal-close-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6">
          {/* STEP 1: File Selection if not loaded */}
          {!parsedData && !parseError && (
            <div
              id="import-dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/60'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/40 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                <FileJson className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                Glissez votre fichier JSON ici ou cliquez pour parcourir
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Compatible avec les sauvegardes complètes, les exports ciblés (v2) et les anciennes
                sauvegardes d&apos;AtelierDevis.
              </p>
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 shadow-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Vos données actuelles restent
                intactes tant que vous ne confirmez pas
              </div>
            </div>
          )}

          {/* PARSE ERROR STATE */}
          {parseError && (
            <div
              id="import-error-banner"
              className="p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-900">
                    Fichier non reconnu ou corrompu
                  </h4>
                  <p className="text-xs text-rose-700 mt-1 leading-relaxed">{parseError}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  id="import-retry-file-btn"
                  type="button"
                  onClick={resetFile}
                  className="px-4 py-2 text-xs font-bold text-rose-700 bg-white border border-rose-300 hover:bg-rose-100 rounded-xl transition-colors"
                >
                  Choisir un autre fichier
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & CONFIGURE IMPORT */}
          {parsedData && (
            <div className="space-y-6">
              {/* File details bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{fileName}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-medium">
                        {parsedData.format === 'v2_structured'
                          ? 'Archive v2 AtelierDevis'
                          : 'Sauvegarde Legacy v1'}
                      </span>
                      {parsedData.exportedAt && (
                        <span>Exporté le {new Date(parsedData.exportedAt).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  id="import-change-file-btn"
                  type="button"
                  onClick={resetFile}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline px-2 py-1"
                >
                  Changer de fichier
                </button>
              </div>

              {/* Import Mode Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Mode d&apos;importation
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label
                    id="import-mode-merge-card"
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      mode === 'merge'
                        ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={mode === 'merge'}
                      onChange={() => setMode('merge')}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        <RefreshCw className="w-4 h-4 text-blue-600" /> Mode Fusion intelligente
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">
                          Recommandé
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Conserve vos données actuelles et ajoute les nouveaux éléments sans perte ni
                        écrasement involontaire.
                      </p>
                    </div>
                  </label>

                  <label
                    id="import-mode-replace-card"
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      mode === 'replace'
                        ? 'border-amber-600 bg-amber-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={mode === 'replace'}
                      onChange={() => setMode('replace')}
                      className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" /> Mode Remplacement ciblé
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Remplace uniquement les sections cochées ci-dessous par celles du fichier. Les
                        sections non cochées restent intactes.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sections to Import */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Sections à importer
                  </label>
                  <div className="flex gap-2">
                    <button
                      id="import-select-all-btn"
                      type="button"
                      onClick={() => setAllSections(true)}
                      className="text-xs font-semibold text-blue-700 hover:underline inline-flex items-center gap-1"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Tout cocher
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      id="import-deselect-all-btn"
                      type="button"
                      onClick={() => setAllSections(false)}
                      className="text-xs font-semibold text-slate-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Square className="w-3.5 h-3.5" /> Tout décocher
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Quotes */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      !parsedData.availableSections.quotes
                        ? 'opacity-40 bg-slate-50 cursor-not-allowed border-slate-200'
                        : selectedSections.quotes
                        ? 'border-blue-500 bg-blue-50/40 cursor-pointer'
                        : 'border-slate-200 bg-white cursor-pointer hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!parsedData.availableSections.quotes}
                      checked={selectedSections.quotes && Boolean(parsedData.availableSections.quotes)}
                      onChange={() => toggleSection('quotes')}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" /> Devis
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {parsedData.availableSections.quotes} devis trouvés
                      </div>
                    </div>
                  </label>

                  {/* Materials */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      !parsedData.availableSections.materials
                        ? 'opacity-40 bg-slate-50 cursor-not-allowed border-slate-200'
                        : selectedSections.materials
                        ? 'border-blue-500 bg-blue-50/40 cursor-pointer'
                        : 'border-slate-200 bg-white cursor-pointer hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!parsedData.availableSections.materials}
                      checked={
                        selectedSections.materials && Boolean(parsedData.availableSections.materials)
                      }
                      onChange={() => toggleSection('materials')}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-emerald-600" /> Matériaux
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {parsedData.availableSections.materials} articles
                      </div>
                    </div>
                  </label>

                  {/* Templates */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      !parsedData.availableSections.customTemplates
                        ? 'opacity-40 bg-slate-50 cursor-not-allowed border-slate-200'
                        : selectedSections.customTemplates
                        ? 'border-blue-500 bg-blue-50/40 cursor-pointer'
                        : 'border-slate-200 bg-white cursor-pointer hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!parsedData.availableSections.customTemplates}
                      checked={
                        selectedSections.customTemplates &&
                        Boolean(parsedData.availableSections.customTemplates)
                      }
                      onChange={() => toggleSection('customTemplates')}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-600" /> Modèles créés
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {parsedData.availableSections.customTemplates} modèles
                      </div>
                    </div>
                  </label>

                  {/* Company Profile */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      !parsedData.availableSections.companyProfile
                        ? 'opacity-40 bg-slate-50 cursor-not-allowed border-slate-200'
                        : selectedSections.companyProfile
                        ? 'border-blue-500 bg-blue-50/40 cursor-pointer'
                        : 'border-slate-200 bg-white cursor-pointer hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!parsedData.availableSections.companyProfile}
                      checked={
                        selectedSections.companyProfile &&
                        Boolean(parsedData.availableSections.companyProfile)
                      }
                      onChange={() => toggleSection('companyProfile')}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" /> Profil Atelier
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {parsedData.availableSections.companyProfile ? 'Disponible' : 'Absent'}
                      </div>
                    </div>
                  </label>

                  {/* Logo */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      !parsedData.availableSections.logo
                        ? 'opacity-40 bg-slate-50 cursor-not-allowed border-slate-200'
                        : selectedSections.logo
                        ? 'border-blue-500 bg-blue-50/40 cursor-pointer'
                        : 'border-slate-200 bg-white cursor-pointer hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!parsedData.availableSections.logo}
                      checked={selectedSections.logo && Boolean(parsedData.availableSections.logo)}
                      onChange={() => toggleSection('logo')}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Logo
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {parsedData.availableSections.logo ? 'Image présente' : 'Absent'}
                      </div>
                    </div>
                  </label>

                  {/* Settings */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                      !parsedData.availableSections.settings
                        ? 'opacity-40 bg-slate-50 cursor-not-allowed border-slate-200'
                        : selectedSections.settings
                        ? 'border-blue-500 bg-blue-50/40 cursor-pointer'
                        : 'border-slate-200 bg-white cursor-pointer hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!parsedData.availableSections.settings}
                      checked={
                        selectedSections.settings && Boolean(parsedData.availableSections.settings)
                      }
                      onChange={() => toggleSection('settings')}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-slate-700" /> Réglages & Taux
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {parsedData.availableSections.settings ? 'Paramètres & taux' : 'Absent'}
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* CONFLICTS RESOLUTION (If in Merge mode and conflicts exist) */}
              {mode === 'merge' && conflicts.length > 0 && (
                <div id="import-conflicts-section" className="space-y-3 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-xs font-bold text-amber-900">
                        {conflicts.length} doublon(s) / différence(s) détecté(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAllConflictsResolution('keep_current')}
                        className="text-[11px] font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50"
                      >
                        Tout conserver
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllConflictsResolution('use_imported')}
                        className="text-[11px] font-bold text-amber-800 bg-white px-2.5 py-1 rounded-md border border-amber-300 hover:bg-amber-100"
                      >
                        Tout remplacer
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllConflictsResolution('import_as_new')}
                        className="text-[11px] font-bold text-blue-800 bg-white px-2.5 py-1 rounded-md border border-blue-300 hover:bg-blue-50"
                      >
                        Tout dupliquer
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                    {conflicts.map((c) => {
                      const currentRes = conflictResolutions[c.id] || c.resolution;
                      return (
                        <div
                          key={c.id}
                          className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{c.title}</span>
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full">
                              {c.type === 'material'
                                ? 'Matériau'
                                : c.type === 'template'
                                ? 'Modèle'
                                : 'Devis'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Actuel dans votre atelier
                              </span>
                              <span className="font-medium text-slate-800">{c.currentDisplay}</span>
                            </div>
                            <div className="p-2 bg-blue-50/70 rounded-lg border border-blue-200">
                              <span className="block text-[10px] font-bold text-blue-500 uppercase">
                                Dans le fichier importé
                              </span>
                              <span className="font-medium text-blue-900">{c.importedDisplay}</span>
                            </div>
                          </div>

                          {/* Resolution choices */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSetConflictResolution(c.id, 'keep_current')}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                currentRes === 'keep_current'
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              Conserver l&apos;existant
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetConflictResolution(c.id, 'use_imported')}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                currentRes === 'use_imported'
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                              }`}
                            >
                              Remplacer par importé
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetConflictResolution(c.id, 'import_as_new')}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                currentRes === 'import_as_new'
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'
                              }`}
                            >
                              Garder les deux (copie)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetConflictResolution(c.id, 'skip')}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                currentRes === 'skip'
                                  ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50'
                              }`}
                            >
                              Ignorer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Safety guarantee */}
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Validation stricte réussie. L&apos;importation s&apos;exécutera de manière
                  transactionnelle dès que vous cliquerez sur Confirmer.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 bg-slate-50/70">
          <button
            id="import-cancel-btn"
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors text-center"
          >
            Annuler
          </button>

          {parsedData && (
            <button
              id="import-confirm-execute-btn"
              type="button"
              disabled={selectedCount === 0 || isProcessing}
              onClick={handleConfirmImport}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 transition-all text-center"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Traitement en cours...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" /> Confirmer et importer les données
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
