import {
  AppBackupDataV2,
  BackupSectionsConfig,
  BackupParsedContent,
  ParseBackupResult,
  BusinessProfile,
  ImportConflictItem,
  ImportExecutionOptions,
  ImportExecutionResult,
  LaborRateLibraryItem,
  MaterialCategory,
  MaterialLibraryItem,
  Quote,
  TemplateCategory,
  WorkshopTemplate,
  AppSettingsPayload,
  LogoEditSettings,
} from '../types';
import { generateId } from '../utils/formatters';

export const isSystemMaterial = (item: MaterialLibraryItem): boolean => {
  if (item.isCustom === true) return false;
  if (item.isCustom === false) return true;
  return /^mat-[0-9]+$/.test(item.id);
};

export const DEFAULT_BACKUP_SECTIONS: BackupSectionsConfig = {
  quotes: true,
  materials: true,
  customTemplates: true,
  companyProfile: true,
  logo: true,
  settings: true,
};

export interface CurrentDbSnapshot {
  profile: BusinessProfile;
  quotes: Quote[];
  materials: MaterialLibraryItem[];
  materialCategories: MaterialCategory[];
  laborRates: LaborRateLibraryItem[];
  templates: WorkshopTemplate[];
  templateCategories: TemplateCategory[];
}

/**
 * Builds the v2 JSON export structure containing only the selected data sections.
 */
export function buildExportJSON(
  sections: BackupSectionsConfig,
  snapshot: CurrentDbSnapshot
): string {
  const customTemplates = snapshot.templates.filter((t) => t.isCustom);
  const customMaterialCategories = snapshot.materialCategories.filter((c) => !c.isDefault);
  const customTemplateCategories = snapshot.templateCategories.filter((c) => !c.isDefault);

  // Extract pure company profile without logoUrl, logoOriginalUrl, logoEditSettings
  const companyProfilePartial: Partial<Omit<BusinessProfile, 'logoUrl' | 'logoOriginalUrl' | 'logoEditSettings'>> = {
    name: snapshot.profile.name,
    tagline: snapshot.profile.tagline,
    phone: snapshot.profile.phone,
    whatsapp: snapshot.profile.whatsapp,
    email: snapshot.profile.email,
    address: snapshot.profile.address,
    city: snapshot.profile.city,
    country: snapshot.profile.country,
    taxId: snapshot.profile.taxId,
    footerNotes: snapshot.profile.footerNotes,
  };

  const settingsPartial: Partial<AppSettingsPayload> = {
    defaultCurrency: snapshot.profile.defaultCurrency,
    currencySymbol: snapshot.profile.currencySymbol,
    defaultMarginPercent: snapshot.profile.defaultMarginPercent,
    defaultWastePercent: snapshot.profile.defaultWastePercent,
    defaultLaborRate: snapshot.profile.defaultLaborRate,
    defaultRounding: snapshot.profile.defaultRounding,
    defaultPaymentTerms: snapshot.profile.defaultPaymentTerms,
    defaultValidityDays: snapshot.profile.defaultValidityDays,
    showSystemTemplates: snapshot.profile.showSystemTemplates,
    showPredefinedTemplates: snapshot.profile.showPredefinedTemplates,
    showSystemTemplateCategories: snapshot.profile.showSystemTemplateCategories,
    showPredefinedTemplateCategories: snapshot.profile.showPredefinedTemplateCategories,
    showSystemMaterials: snapshot.profile.showSystemMaterials,
    showPredefinedMaterials: snapshot.profile.showPredefinedMaterials,
    showSystemMaterialCategories: snapshot.profile.showSystemMaterialCategories,
    showPredefinedMaterialCategories: snapshot.profile.showPredefinedMaterialCategories,
    laborRatesLibrary: snapshot.laborRates,
  };

  const backup: AppBackupDataV2 = {
    version: 2,
    app: 'AtelierDevis',
    exportedAt: new Date().toISOString(),
    sections: { ...sections },
    data: {},
  };

  if (sections.quotes) {
    backup.data.quotes = snapshot.quotes;
  }

  if (sections.materials) {
    // Export all materials from library and custom categories
    backup.data.materialsLibrary = snapshot.materials;
    if (customMaterialCategories.length > 0) {
      backup.data.materialCategories = customMaterialCategories;
    }
  }

  if (sections.customTemplates) {
    // Only user-created custom templates
    backup.data.customTemplates = customTemplates;
    if (customTemplateCategories.length > 0) {
      backup.data.templateCategories = customTemplateCategories;
    }
  }

  if (sections.companyProfile) {
    backup.data.companyProfile = companyProfilePartial;
  }

  if (sections.logo && (snapshot.profile.logoUrl || snapshot.profile.logoOriginalUrl)) {
    backup.data.logo = snapshot.profile.logoUrl || snapshot.profile.logoOriginalUrl;
    if (snapshot.profile.logoOriginalUrl) {
      backup.data.logoOriginal = snapshot.profile.logoOriginalUrl;
    }
    if (snapshot.profile.logoEditSettings) {
      backup.data.logoEditSettings = snapshot.profile.logoEditSettings;
    }
  }

  if (sections.settings) {
    backup.data.settings = settingsPartial;
    backup.data.laborRatesLibrary = snapshot.laborRates;
  }

  return JSON.stringify(backup, null, 2);
}

/**
 * Parses and validates any JSON backup string (v2, legacy v1, unversioned, partial).
 */
export function parseAndValidateBackupJSON(
  jsonString: string
): ParseBackupResult {
  if (!jsonString || typeof jsonString !== 'string' || !jsonString.trim()) {
    return {
      success: false,
      error: "Le fichier est vide ou n'a pas pu être lu.",
    };
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(jsonString) as Record<string, unknown>;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Erreur de syntaxe JSON inconnue';
    return {
      success: false,
      error: `Fichier JSON corrompu ou syntaxe non valide (${errMsg}). Aucune donnée de votre application n'a été modifiée.`,
    };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      success: false,
      error: "Format de sauvegarde non reconnu : l'archive doit être un objet JSON valide.",
    };
  }

  // Detect format & version
  let isV2 = false;
  let version = 1;
  let exportedAt: string | undefined;
  let quotes: Quote[] = [];
  let materials: MaterialLibraryItem[] = [];
  let materialCategories: MaterialCategory[] = [];
  let laborRates: LaborRateLibraryItem[] = [];
  let customTemplates: WorkshopTemplate[] = [];
  let allTemplates: WorkshopTemplate[] = [];
  let templateCategories: TemplateCategory[] = [];
  let companyProfile: Partial<BusinessProfile> | undefined;
  let logo: string | undefined;
  let logoOriginal: string | undefined;
  let logoEditSettings: LogoEditSettings | undefined;
  let settings: Partial<AppSettingsPayload> | undefined;

  if (raw.version === 2 && raw.data && typeof raw.data === 'object') {
    // V2 Structured Format
    isV2 = true;
    version = 2;
    exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : undefined;
    const data = raw.data as Record<string, unknown>;

    if (Array.isArray(data.quotes)) {
      quotes = data.quotes as Quote[];
    }
    if (Array.isArray(data.materialsLibrary)) {
      materials = data.materialsLibrary as MaterialLibraryItem[];
    }
    if (Array.isArray(data.materialCategories)) {
      materialCategories = data.materialCategories as MaterialCategory[];
    }
    if (Array.isArray(data.laborRatesLibrary)) {
      laborRates = data.laborRatesLibrary as LaborRateLibraryItem[];
    }
    if (Array.isArray(data.customTemplates)) {
      customTemplates = (data.customTemplates as WorkshopTemplate[]).map((t) => ({
        ...t,
        isCustom: true,
      }));
      allTemplates = [...customTemplates];
    } else if (Array.isArray(data.templates)) {
      allTemplates = data.templates as WorkshopTemplate[];
      customTemplates = allTemplates.filter((t) => t.isCustom);
    }
    if (Array.isArray(data.templateCategories)) {
      templateCategories = data.templateCategories as TemplateCategory[];
    }
    if (data.companyProfile && typeof data.companyProfile === 'object') {
      companyProfile = data.companyProfile as Partial<BusinessProfile>;
    }
    if (typeof data.logo === 'string') {
      logo = data.logo;
    }
    if (typeof data.logoOriginal === 'string') {
      logoOriginal = data.logoOriginal;
    }
    if (data.logoEditSettings && typeof data.logoEditSettings === 'object') {
      logoEditSettings = data.logoEditSettings as LogoEditSettings;
    }
    if (data.settings && typeof data.settings === 'object') {
      settings = data.settings as Partial<AppSettingsPayload>;
    }
  } else {
    // V1 Legacy or Unversioned AtelierDevis backup
    version = typeof raw.version === 'number' ? raw.version : 1;
    exportedAt = typeof raw.exportedAt === 'string' ? raw.exportedAt : undefined;

    if (Array.isArray(raw.quotes)) {
      quotes = raw.quotes as Quote[];
    }
    if (Array.isArray(raw.materialsLibrary)) {
      materials = raw.materialsLibrary as MaterialLibraryItem[];
    }
    if (Array.isArray(raw.materialCategories)) {
      materialCategories = raw.materialCategories as MaterialCategory[];
    }
    if (Array.isArray(raw.laborRatesLibrary)) {
      laborRates = raw.laborRatesLibrary as LaborRateLibraryItem[];
    }
    if (Array.isArray(raw.templates)) {
      allTemplates = raw.templates as WorkshopTemplate[];
      customTemplates = allTemplates.filter((t) => t.isCustom);
    }
    if (Array.isArray(raw.templateCategories)) {
      templateCategories = raw.templateCategories as TemplateCategory[];
    }

    if (raw.businessProfile && typeof raw.businessProfile === 'object') {
      const bp = raw.businessProfile as Partial<BusinessProfile>;
      companyProfile = {
        name: bp.name,
        tagline: bp.tagline,
        phone: bp.phone,
        whatsapp: bp.whatsapp,
        email: bp.email,
        address: bp.address,
        city: bp.city,
        country: bp.country,
        taxId: bp.taxId,
        footerNotes: bp.footerNotes,
      };
      if (typeof bp.logoUrl === 'string' && bp.logoUrl.trim().length > 0) {
        logo = bp.logoUrl;
      }
      if (typeof bp.logoOriginalUrl === 'string' && bp.logoOriginalUrl.trim().length > 0) {
        logoOriginal = bp.logoOriginalUrl;
      }
      if (bp.logoEditSettings && typeof bp.logoEditSettings === 'object') {
        logoEditSettings = bp.logoEditSettings as LogoEditSettings;
      }
      settings = {
        defaultCurrency: bp.defaultCurrency,
        currencySymbol: bp.currencySymbol,
        defaultMarginPercent: bp.defaultMarginPercent,
        defaultWastePercent: bp.defaultWastePercent,
        defaultLaborRate: bp.defaultLaborRate,
        defaultRounding: bp.defaultRounding,
        defaultPaymentTerms: bp.defaultPaymentTerms,
        defaultValidityDays: bp.defaultValidityDays,
        showSystemTemplates: bp.showSystemTemplates,
        showPredefinedTemplates: bp.showPredefinedTemplates,
        showSystemTemplateCategories: bp.showSystemTemplateCategories,
        showPredefinedTemplateCategories: bp.showPredefinedTemplateCategories,
        showSystemMaterials: bp.showSystemMaterials,
        showPredefinedMaterials: bp.showPredefinedMaterials,
        showSystemMaterialCategories: bp.showSystemMaterialCategories,
        showPredefinedMaterialCategories: bp.showPredefinedMaterialCategories,
      };
    }
  }

  // Count available data sections
  const availableSections = {
    quotes: quotes.length,
    materials: materials.length,
    customTemplates: customTemplates.length,
    companyProfile: Boolean(companyProfile && (companyProfile.name || companyProfile.phone)),
    logo: Boolean((logo && logo.startsWith('data:image')) || (logoOriginal && logoOriginal.startsWith('data:image'))),
    settings: Boolean(
      settings &&
        (settings.defaultMarginPercent !== undefined ||
          settings.defaultLaborRate !== undefined ||
          laborRates.length > 0)
    ),
  };

  const hasAnyData =
    availableSections.quotes > 0 ||
    availableSections.materials > 0 ||
    availableSections.customTemplates > 0 ||
    availableSections.companyProfile ||
    availableSections.logo ||
    availableSections.settings;

  if (!hasAnyData) {
    return {
      success: false,
      error:
        "Aucune donnée exploitable d'AtelierDevis n'a été détectée dans ce fichier JSON.",
    };
  }

  return {
    success: true,
    parsed: {
      format: isV2 ? 'v2_structured' : 'v1_legacy',
      version,
      exportedAt,
      quotes,
      materials,
      materialCategories,
      laborRates,
      customTemplates,
      allTemplates,
      templateCategories,
      companyProfile,
      logo,
      logoOriginal,
      logoEditSettings,
      settings,
      availableSections,
    },
  };
}

/**
 * Detects conflicts between parsed backup items and the current database state in Merge mode.
 */
export function detectConflicts(
  parsed: BackupParsedContent,
  selectedSections: BackupSectionsConfig,
  currentDbState: CurrentDbSnapshot
): ImportConflictItem[] {
  const conflicts: ImportConflictItem[] = [];

  // 1. Check Materials Conflicts
  if (selectedSections.materials && parsed.materials.length > 0) {
    const currentMatMap = new Map<string, MaterialLibraryItem>();
    const currentNameMap = new Map<string, MaterialLibraryItem>();

    currentDbState.materials.forEach((m) => {
      currentMatMap.set(m.id, m);
      currentNameMap.set(m.name.trim().toLowerCase(), m);
    });

    parsed.materials.forEach((impMat) => {
      if (!impMat || !impMat.name) return;
      const normalizedName = impMat.name.trim().toLowerCase();
      const existing = currentMatMap.get(impMat.id) || currentNameMap.get(normalizedName);

      if (existing) {
        const priceDiffers = existing.defaultUnitPrice !== impMat.defaultUnitPrice;
        const unitDiffers = existing.unit !== impMat.unit;
        const categoryDiffers = (existing.categoryId || existing.category) !== (impMat.categoryId || impMat.category);

        if (priceDiffers || unitDiffers || categoryDiffers) {
          conflicts.push({
            id: `conflict-mat-${impMat.id || normalizedName}`,
            type: 'material',
            title: `Matériau : ${existing.name}`,
            description: 'Un matériau portant le même nom ou identifiant existe déjà avec des propriétés différentes.',
            currentDisplay: `Prix : ${existing.defaultUnitPrice.toLocaleString('fr-FR')} FCFA / ${existing.unit}`,
            importedDisplay: `Prix importé : ${impMat.defaultUnitPrice.toLocaleString('fr-FR')} FCFA / ${impMat.unit}`,
            currentItem: existing,
            importedItem: impMat,
            resolution: 'keep_current',
          });
        }
      }
    });
  }

  // 2. Check Custom Templates Conflicts
  if (selectedSections.customTemplates && parsed.customTemplates.length > 0) {
    const currentTplMap = new Map<string, WorkshopTemplate>();
    const currentTplNameMap = new Map<string, WorkshopTemplate>();

    currentDbState.templates.forEach((t) => {
      currentTplMap.set(t.id, t);
      currentTplNameMap.set(t.name.trim().toLowerCase(), t);
    });

    parsed.customTemplates.forEach((impTpl) => {
      if (!impTpl || !impTpl.name) return;
      const normalizedName = impTpl.name.trim().toLowerCase();
      const existing = currentTplMap.get(impTpl.id) || currentTplNameMap.get(normalizedName);

      if (existing && existing.isCustom) {
        const marginDiffers = existing.targetMarginPercent !== impTpl.targetMarginPercent;
        const wasteDiffers = existing.wastePercent !== impTpl.wastePercent;
        const matCountDiffers = (existing.defaultMaterials?.length || 0) !== (impTpl.defaultMaterials?.length || 0);

        if (marginDiffers || wasteDiffers || matCountDiffers) {
          conflicts.push({
            id: `conflict-tpl-${impTpl.id || normalizedName}`,
            type: 'template',
            title: `Modèle sur mesure : ${existing.name}`,
            description: 'Un modèle avec le même nom existe déjà dans votre atelier avec des paramètres différents.',
            currentDisplay: `Marge : ${existing.targetMarginPercent}%, Perte : ${existing.wastePercent}%, ${existing.defaultMaterials?.length || 0} matériaux`,
            importedDisplay: `Marge importée : ${impTpl.targetMarginPercent}%, Perte : ${impTpl.wastePercent}%, ${impTpl.defaultMaterials?.length || 0} matériaux`,
            currentItem: existing,
            importedItem: impTpl,
            resolution: 'keep_current',
          });
        }
      }
    });
  }

  // 3. Check Quotes Conflicts
  if (selectedSections.quotes && parsed.quotes.length > 0) {
    const currentQuoteIdMap = new Map<string, Quote>();
    const currentQuoteNumberMap = new Map<string, Quote>();

    currentDbState.quotes.forEach((q) => {
      currentQuoteIdMap.set(q.id, q);
      currentQuoteNumberMap.set(q.quoteNumber, q);
    });

    parsed.quotes.forEach((impQuote) => {
      if (!impQuote || !impQuote.quoteNumber) return;
      const existing = currentQuoteIdMap.get(impQuote.id) || currentQuoteNumberMap.get(impQuote.quoteNumber);

      if (existing) {
        const amountDiffers = existing.finalTotal !== impQuote.finalTotal;
        const clientDiffers = existing.customer?.name !== impQuote.customer?.name;
        const titleDiffers = existing.projectTitle !== impQuote.projectTitle;

        if (amountDiffers || clientDiffers || titleDiffers) {
          conflicts.push({
            id: `conflict-quote-${impQuote.id}`,
            type: 'quote',
            title: `Devis N° ${impQuote.quoteNumber} : ${impQuote.projectTitle || 'Sans titre'}`,
            description: 'Un devis avec le même numéro ou identifiant existe déjà dans votre historique.',
            currentDisplay: `Client : ${existing.customer?.name || 'Inconnu'} • Montant : ${existing.finalTotal?.toLocaleString('fr-FR')} FCFA`,
            importedDisplay: `Client importé : ${impQuote.customer?.name || 'Inconnu'} • Montant importé : ${impQuote.finalTotal?.toLocaleString('fr-FR')} FCFA`,
            currentItem: existing,
            importedItem: impQuote,
            resolution: 'import_as_new',
          });
        }
      }
    });
  }

  return conflicts;
}

/**
 * Executes the safe, transactional import based on user mode, selected sections, and conflict resolutions.
 */
export function executeImport(
  parsed: BackupParsedContent,
  options: ImportExecutionOptions,
  currentDbState: CurrentDbSnapshot
): {
  success: boolean;
  message: string;
  nextDbState: CurrentDbSnapshot;
  result: ImportExecutionResult;
} {
  const { mode, selectedSections, conflictResolutions } = options;

  let nextQuotes = [...currentDbState.quotes];
  let nextMaterials = [...currentDbState.materials];
  let nextMaterialCats = [...currentDbState.materialCategories];
  let nextLaborRates = [...currentDbState.laborRates];
  let nextTemplates = [...currentDbState.templates];
  let nextTemplateCats = [...currentDbState.templateCategories];
  let nextProfile: BusinessProfile = { ...currentDbState.profile };

  let quotesImported = 0;
  let materialsImported = 0;
  let templatesImported = 0;
  let profileUpdated = false;
  let logoUpdated = false;
  let settingsUpdated = false;
  let conflictsResolved = 0;

  // ─────────────────────────────────────────────────────────────
  // 1. QUOTES IMPORT
  // ─────────────────────────────────────────────────────────────
  if (selectedSections.quotes && parsed.quotes.length > 0) {
    if (mode === 'replace') {
      nextQuotes = [...parsed.quotes];
      quotesImported = parsed.quotes.length;
    } else {
      // MERGE MODE
      const existingQuoteIds = new Set(nextQuotes.map((q) => q.id));
      const existingQuoteNumbers = new Set(nextQuotes.map((q) => q.quoteNumber));

      parsed.quotes.forEach((impQuote) => {
        const conflictKey = `conflict-quote-${impQuote.id}`;
        const resolution = conflictResolutions[conflictKey] || 'import_as_new';

        const isExactDuplicate = nextQuotes.some(
          (q) =>
            q.id === impQuote.id &&
            q.quoteNumber === impQuote.quoteNumber &&
            q.finalTotal === impQuote.finalTotal
        );

        if (isExactDuplicate) {
          // Skip identical quote to prevent exact double insertion
          return;
        }

        const hasConflict = conflictResolutions[conflictKey] !== undefined;
        if (hasConflict) {
          conflictsResolved++;
          if (resolution === 'keep_current' || resolution === 'skip') {
            return;
          }
          if (resolution === 'use_imported') {
            // Replace existing quote matching ID or number
            nextQuotes = nextQuotes.map((q) =>
              q.id === impQuote.id || q.quoteNumber === impQuote.quoteNumber ? impQuote : q
            );
            quotesImported++;
            return;
          }
          if (resolution === 'import_as_new') {
            const newId = generateId();
            let newNumber = `${impQuote.quoteNumber}-IMP`;
            let counter = 1;
            while (existingQuoteNumbers.has(newNumber)) {
              counter++;
              newNumber = `${impQuote.quoteNumber}-IMP${counter}`;
            }
            nextQuotes.push({
              ...impQuote,
              id: newId,
              quoteNumber: newNumber,
            });
            existingQuoteIds.add(newId);
            existingQuoteNumbers.add(newNumber);
            quotesImported++;
            return;
          }
        }

        // No conflict: Add safely
        let quoteToAdd = { ...impQuote };
        if (existingQuoteIds.has(quoteToAdd.id)) {
          quoteToAdd.id = generateId();
        }
        if (existingQuoteNumbers.has(quoteToAdd.quoteNumber)) {
          quoteToAdd.quoteNumber = `${quoteToAdd.quoteNumber}-IMP`;
        }
        nextQuotes.push(quoteToAdd);
        existingQuoteIds.add(quoteToAdd.id);
        existingQuoteNumbers.add(quoteToAdd.quoteNumber);
        quotesImported++;
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. MATERIALS IMPORT
  // ─────────────────────────────────────────────────────────────
  if (selectedSections.materials && parsed.materials.length > 0) {
    if (mode === 'replace') {
      // Keep system materials, replace user custom materials
      const systemMaterials = nextMaterials.filter((m) => isSystemMaterial(m));
      const importedCustomOnly = parsed.materials.filter((m) => !isSystemMaterial(m));
      // If the backup contains all materials, merge safely
      const importedIds = new Set(importedCustomOnly.map((m) => m.id));
      nextMaterials = [
        ...systemMaterials.filter((s) => !importedIds.has(s.id)),
        ...importedCustomOnly,
      ];
      materialsImported = importedCustomOnly.length;

      // Also replace custom material categories
      if (parsed.materialCategories.length > 0) {
        const defaultCats = nextMaterialCats.filter((c) => c.isDefault);
        const importedCustomCats = parsed.materialCategories.filter((c) => !c.isDefault);
        nextMaterialCats = [...defaultCats, ...importedCustomCats];
      }
    } else {
      // MERGE MODE
      const existingMatIds = new Set(nextMaterials.map((m) => m.id));
      const existingMatNames = new Map(nextMaterials.map((m) => [m.name.trim().toLowerCase(), m]));

      // Merge Material Categories first
      if (parsed.materialCategories.length > 0) {
        const existingCatIds = new Set(nextMaterialCats.map((c) => c.id));
        const existingCatNames = new Set(nextMaterialCats.map((c) => c.name.trim().toLowerCase()));

        parsed.materialCategories.forEach((cat) => {
          if (!cat || !cat.name) return;
          const norm = cat.name.trim().toLowerCase();
          if (!existingCatNames.has(norm) && !existingCatIds.has(cat.id)) {
            nextMaterialCats.push({
              id: cat.id || `matcat-${generateId()}`,
              name: cat.name,
              isDefault: false,
              enabled: cat.enabled !== false,
            });
            existingCatNames.add(norm);
          }
        });
      }

      // Merge Materials
      parsed.materials.forEach((impMat) => {
        if (!impMat || !impMat.name) return;
        const normName = impMat.name.trim().toLowerCase();
        const conflictKey = `conflict-mat-${impMat.id || normName}`;
        const resolution = conflictResolutions[conflictKey];

        if (resolution !== undefined) {
          conflictsResolved++;
          if (resolution === 'keep_current' || resolution === 'skip') {
            return;
          }
          if (resolution === 'use_imported') {
            nextMaterials = nextMaterials.map((m) =>
              m.id === impMat.id || m.name.trim().toLowerCase() === normName
                ? { ...impMat, updatedAt: new Date().toISOString() }
                : m
            );
            materialsImported++;
            return;
          }
          if (resolution === 'import_as_new') {
            const newId = generateId();
            nextMaterials.push({
              ...impMat,
              id: newId,
              name: `${impMat.name} (Importé)`,
              isCustom: true,
              updatedAt: new Date().toISOString(),
            });
            existingMatIds.add(newId);
            materialsImported++;
            return;
          }
        }

        const existingItem = existingMatNames.get(normName) || (impMat.id ? nextMaterials.find((m) => m.id === impMat.id) : undefined);

        if (!existingItem) {
          // New Material
          const newId = existingMatIds.has(impMat.id) ? generateId() : (impMat.id || generateId());
          nextMaterials.push({
            ...impMat,
            id: newId,
            isCustom: true,
            updatedAt: new Date().toISOString(),
          });
          existingMatIds.add(newId);
          existingMatNames.set(normName, impMat);
          materialsImported++;
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. CUSTOM TEMPLATES IMPORT
  // ─────────────────────────────────────────────────────────────
  if (selectedSections.customTemplates && parsed.customTemplates.length > 0) {
    if (mode === 'replace') {
      // Keep system templates, replace custom templates
      const systemTemplates = nextTemplates.filter((t) => !t.isCustom);
      nextTemplates = [...systemTemplates, ...parsed.customTemplates.map((t) => ({ ...t, isCustom: true }))];
      templatesImported = parsed.customTemplates.length;

      // Replace custom template categories
      if (parsed.templateCategories.length > 0) {
        const defaultCats = nextTemplateCats.filter((c) => c.isDefault);
        const importedCustomCats = parsed.templateCategories.filter((c) => !c.isDefault);
        nextTemplateCats = [...defaultCats, ...importedCustomCats];
      }
    } else {
      // MERGE MODE
      const existingTplIds = new Set(nextTemplates.map((t) => t.id));
      const existingTplNames = new Map(nextTemplates.map((t) => [t.name.trim().toLowerCase(), t]));

      // Merge Template Categories first
      if (parsed.templateCategories.length > 0) {
        const existingCatIds = new Set(nextTemplateCats.map((c) => c.id));
        const existingCatNames = new Set(nextTemplateCats.map((c) => c.name.trim().toLowerCase()));

        parsed.templateCategories.forEach((cat) => {
          if (!cat || !cat.name) return;
          const norm = cat.name.trim().toLowerCase();
          if (!existingCatNames.has(norm) && !existingCatIds.has(cat.id)) {
            nextTemplateCats.push({
              id: cat.id || `cat-${generateId()}`,
              name: cat.name,
              isDefault: false,
              enabled: cat.enabled !== false,
            });
            existingCatNames.add(norm);
          }
        });
      }

      // Merge Custom Templates
      parsed.customTemplates.forEach((impTpl) => {
        if (!impTpl || !impTpl.name) return;
        const normName = impTpl.name.trim().toLowerCase();
        const conflictKey = `conflict-tpl-${impTpl.id || normName}`;
        const resolution = conflictResolutions[conflictKey];

        if (resolution !== undefined) {
          conflictsResolved++;
          if (resolution === 'keep_current' || resolution === 'skip') {
            return;
          }
          if (resolution === 'use_imported') {
            nextTemplates = nextTemplates.map((t) =>
              t.id === impTpl.id || t.name.trim().toLowerCase() === normName
                ? { ...impTpl, isCustom: true, updatedAt: new Date().toISOString() }
                : t
            );
            templatesImported++;
            return;
          }
          if (resolution === 'import_as_new') {
            const newId = generateId();
            nextTemplates.push({
              ...impTpl,
              id: newId,
              name: `${impTpl.name} (Importé)`,
              isCustom: true,
              updatedAt: new Date().toISOString(),
            });
            existingTplIds.add(newId);
            templatesImported++;
            return;
          }
        }

        const existingTpl = existingTplNames.get(normName) || (impTpl.id ? nextTemplates.find((t) => t.id === impTpl.id) : undefined);

        if (!existingTpl) {
          const newId = existingTplIds.has(impTpl.id) ? generateId() : (impTpl.id || generateId());
          nextTemplates.push({
            ...impTpl,
            id: newId,
            isCustom: true,
            updatedAt: new Date().toISOString(),
          });
          existingTplIds.add(newId);
          existingTplNames.set(normName, impTpl);
          templatesImported++;
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. COMPANY PROFILE IMPORT (Scalar Application Value)
  // ─────────────────────────────────────────────────────────────
  if (selectedSections.companyProfile && parsed.companyProfile) {
    nextProfile = {
      ...nextProfile,
      name: parsed.companyProfile.name || nextProfile.name,
      tagline: parsed.companyProfile.tagline !== undefined ? parsed.companyProfile.tagline : nextProfile.tagline,
      phone: parsed.companyProfile.phone || nextProfile.phone,
      whatsapp: parsed.companyProfile.whatsapp !== undefined ? parsed.companyProfile.whatsapp : nextProfile.whatsapp,
      email: parsed.companyProfile.email !== undefined ? parsed.companyProfile.email : nextProfile.email,
      address: parsed.companyProfile.address !== undefined ? parsed.companyProfile.address : nextProfile.address,
      city: parsed.companyProfile.city !== undefined ? parsed.companyProfile.city : nextProfile.city,
      country: parsed.companyProfile.country !== undefined ? parsed.companyProfile.country : nextProfile.country,
      taxId: parsed.companyProfile.taxId !== undefined ? parsed.companyProfile.taxId : nextProfile.taxId,
      footerNotes: parsed.companyProfile.footerNotes !== undefined ? parsed.companyProfile.footerNotes : nextProfile.footerNotes,
    };
    profileUpdated = true;
  }

  // ─────────────────────────────────────────────────────────────
  // 5. LOGO IMPORT (Scalar Application Value)
  // ─────────────────────────────────────────────────────────────
  if (selectedSections.logo && (parsed.logo || parsed.logoOriginal)) {
    nextProfile.logoUrl = parsed.logo || parsed.logoOriginal;
    nextProfile.logoOriginalUrl = parsed.logoOriginal || parsed.logo;
    nextProfile.logoEditSettings = parsed.logoEditSettings;
    logoUpdated = true;
  }

  // ─────────────────────────────────────────────────────────────
  // 6. SETTINGS IMPORT (Scalar Application Value)
  // ─────────────────────────────────────────────────────────────
  if (selectedSections.settings && parsed.settings) {
    if (parsed.settings.defaultMarginPercent !== undefined) {
      nextProfile.defaultMarginPercent = parsed.settings.defaultMarginPercent;
    }
    if (parsed.settings.defaultWastePercent !== undefined) {
      nextProfile.defaultWastePercent = parsed.settings.defaultWastePercent;
    }
    if (parsed.settings.defaultLaborRate !== undefined) {
      nextProfile.defaultLaborRate = parsed.settings.defaultLaborRate;
    }
    if (parsed.settings.defaultRounding !== undefined) {
      nextProfile.defaultRounding = parsed.settings.defaultRounding;
    }
    if (parsed.settings.defaultPaymentTerms !== undefined) {
      nextProfile.defaultPaymentTerms = parsed.settings.defaultPaymentTerms;
    }
    if (parsed.settings.defaultValidityDays !== undefined) {
      nextProfile.defaultValidityDays = parsed.settings.defaultValidityDays;
    }
    if (parsed.settings.defaultCurrency !== undefined) {
      nextProfile.defaultCurrency = parsed.settings.defaultCurrency;
    }
    if (parsed.settings.currencySymbol !== undefined) {
      nextProfile.currencySymbol = parsed.settings.currencySymbol;
    }
    if (parsed.settings.showSystemTemplates !== undefined) {
      nextProfile.showSystemTemplates = parsed.settings.showSystemTemplates;
      nextProfile.showPredefinedTemplates = parsed.settings.showSystemTemplates;
    }
    if (parsed.settings.showSystemTemplateCategories !== undefined) {
      nextProfile.showSystemTemplateCategories = parsed.settings.showSystemTemplateCategories;
      nextProfile.showPredefinedTemplateCategories = parsed.settings.showSystemTemplateCategories;
    }
    if (parsed.settings.showSystemMaterials !== undefined) {
      nextProfile.showSystemMaterials = parsed.settings.showSystemMaterials;
      nextProfile.showPredefinedMaterials = parsed.settings.showSystemMaterials;
    }
    if (parsed.settings.showSystemMaterialCategories !== undefined) {
      nextProfile.showSystemMaterialCategories = parsed.settings.showSystemMaterialCategories;
      nextProfile.showPredefinedMaterialCategories = parsed.settings.showSystemMaterialCategories;
    }

    if (Array.isArray(parsed.laborRates) && parsed.laborRates.length > 0) {
      if (mode === 'replace') {
        nextLaborRates = [...parsed.laborRates];
      } else {
        const existingTasks = new Set(nextLaborRates.map((r) => r.task.trim().toLowerCase()));
        parsed.laborRates.forEach((r) => {
          if (r && r.task && !existingTasks.has(r.task.trim().toLowerCase())) {
            nextLaborRates.push({
              ...r,
              id: generateId(),
            });
            existingTasks.add(r.task.trim().toLowerCase());
          }
        });
      }
    }
    settingsUpdated = true;
  }

  const resultStats = {
    quotesImported,
    materialsImported,
    templatesImported,
    profileUpdated,
    logoUpdated,
    settingsUpdated,
    conflictsResolved,
  };

  const message = `Importation réussie (${mode === 'merge' ? 'Mode Fusion' : 'Mode Remplacement'}) ! ${quotesImported} devis, ${materialsImported} matériaux et ${templatesImported} modèles importés.`;

  return {
    success: true,
    message,
    nextDbState: {
      profile: nextProfile,
      quotes: nextQuotes,
      materials: nextMaterials,
      materialCategories: nextMaterialCats,
      laborRates: nextLaborRates,
      templates: nextTemplates,
      templateCategories: nextTemplateCats,
    },
    result: {
      success: true,
      message,
      stats: resultStats,
    },
  };
}
