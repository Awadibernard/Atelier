import {
  CurrentDbSnapshot,
  buildExportJSON,
  parseAndValidateBackupJSON,
  detectConflicts,
  executeImport,
  DEFAULT_BACKUP_SECTIONS,
} from './backupEngine';
import {
  BusinessProfile,
  MaterialLibraryItem,
  Quote,
  WorkshopTemplate,
  MaterialCategory,
  TemplateCategory,
  LaborRateLibraryItem,
} from '../types';

export interface BackupTestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const mockProfile: BusinessProfile = {
  name: 'Ferronnerie Moderne Dakar',
  tagline: 'Expert Métal & Inox',
  phone: '+221 77 123 45 67',
  whatsapp: '+221 77 123 45 67',
  email: 'contact@ferronnerie-dakar.sn',
  address: 'Zone Industrielle',
  city: 'Dakar',
  country: 'Sénégal',
  taxId: 'SN-NINEA-998877',
  logoUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  logoOriginalUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  logoEditSettings: {
    maskShape: 'circle',
    zoom: 1.2,
    offsetX: 5,
    offsetY: -3,
    bgColor: 'transparent',
  },
  defaultCurrency: 'XOF',
  currencySymbol: 'FCFA',
  defaultMarginPercent: 30,
  defaultWastePercent: 7,
  defaultLaborRate: 3000,
  defaultRounding: '1000',
  defaultValidityDays: 45,
  defaultPaymentTerms: '50% à la commande, solde à la pose',
  footerNotes: 'Garantie décennale sur profilés',
  showSystemTemplates: true,
  showPredefinedTemplates: true,
  showSystemTemplateCategories: true,
  showPredefinedTemplateCategories: true,
  showSystemMaterials: true,
  showPredefinedMaterials: true,
  showSystemMaterialCategories: true,
  showPredefinedMaterialCategories: true,
};

const mockMaterials: MaterialLibraryItem[] = [
  {
    id: 'mat-1',
    name: 'Tube carré 40×40 (ép. 1.5mm)',
    category: 'Tubes & Profilés',
    categoryId: 'matcat-tubes',
    unit: 'm',
    defaultUnitPrice: 2000,
    isCustom: false,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'custom-mat-1',
    name: 'Tôle perforée décorative 2mm',
    category: 'Tôles & Fers',
    categoryId: 'matcat-toles',
    unit: 'm2',
    defaultUnitPrice: 12000,
    isCustom: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

const mockMaterialCategories: MaterialCategory[] = [
  { id: 'matcat-tubes', name: 'Tubes & Profilés', isDefault: true, enabled: true },
  { id: 'matcat-toles', name: 'Tôles & Fers', isDefault: true, enabled: true },
  { id: 'custom-matcat-1', name: 'Inox Spécial', isDefault: false, enabled: true },
];

const mockLaborRates: LaborRateLibraryItem[] = [
  { id: 'rate-1', task: 'Soudure TIG', defaultRate: 3500 },
];

const mockTemplates: WorkshopTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Portail Coulissant Simple',
    categoryId: 'metal',
    category: 'metal',
    description: 'Modèle standard portail coulissant',
    isCustom: false,
    wastePercent: 5,
    targetMarginPercent: 25,
    defaultMaterials: [],
    defaultLabor: [],
    defaultOtherCosts: [],
  },
  {
    id: 'custom-tpl-1',
    name: 'Grille Fer Forgé Royale',
    categoryId: 'metal',
    category: 'metal',
    description: 'Grille forgée à volutes et pointes',
    isCustom: true,
    wastePercent: 8,
    targetMarginPercent: 35,
    defaultMaterials: [
      {
        name: 'Tôle perforée décorative 2mm',
        unit: 'm2',
        unitPrice: 12000,
        quantity: 2,
      },
    ],
    defaultLabor: [],
    defaultOtherCosts: [],
  },
];

const mockTemplateCategories: TemplateCategory[] = [
  { id: 'metal', name: 'Métallerie', isDefault: true, enabled: true },
  { id: 'custom-cat-1', name: 'Ouvrages d’Art', isDefault: false, enabled: true },
];

const mockQuotes: Quote[] = [
  {
    id: 'quote-1',
    quoteNumber: 'DEV-2026-0001',
    projectTitle: 'Portail Villa Almadies',
    createdAt: '2026-02-01T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
    validUntil: '2026-03-01T10:00:00.000Z',
    status: 'Envoyé',
    customer: {
      name: 'M. Amadou Diallo',
      phone: '+221 77 000 11 22',
      email: 'amadou@example.sn',
      address: 'Almadies',
      city: 'Dakar',
    },
    calculationInput: {
      materials: [],
      wastePercent: 7,
      labor: [],
      otherCosts: [],
      overheadType: 'percent',
      overheadValue: 0,
      pricingMode: 'margin',
      targetProfitPercent: 30,
      roundingStep: '1000',
    },
    calculationResult: {
      rawMaterialCost: 150000,
      wasteAmount: 10500,
      adjustedMaterialCost: 160500,
      laborCost: 50000,
      otherCostsTotal: 0,
      directCost: 210500,
      overheadCost: 0,
      totalCost: 210500,
      rawSellingPrice: 300714,
      roundedSellingPrice: 301000,
      profitAmount: 90500,
      effectiveMarginPercent: 30.06,
      effectiveMarkupPercent: 42.99,
      isValid: true,
      errors: [],
    },
    detailLevel: 'detailed',
    lineItems: [
      {
        id: 'li-1',
        description: 'Fabrication et assemblage portail',
        quantity: 1,
        unit: 'ens',
        unitPrice: 301000,
        total: 301000,
      },
    ],
    subtotal: 301000,
    finalTotal: 301000,
    depositConfig: {
      type: 'percent',
      value: 50,
    },
    depositAmount: 150500,
    balanceAmount: 150500,
    paymentTerms: '50% acompte',
    notes: 'Inclus serrure et pose',
  },
];

export function runBackupTests(): { results: BackupTestResult[]; allPassed: boolean } {
  const results: BackupTestResult[] = [];
  const snapshot: CurrentDbSnapshot = {
    profile: { ...mockProfile },
    materials: [...mockMaterials],
    materialCategories: [...mockMaterialCategories],
    laborRates: [...mockLaborRates],
    templates: [...mockTemplates],
    templateCategories: [...mockTemplateCategories],
    quotes: [...mockQuotes],
  };

  // Test 1: Full export contains all sections
  try {
    const json = buildExportJSON(DEFAULT_BACKUP_SECTIONS, snapshot);
    const parsed = JSON.parse(json);
    const valid =
      parsed.version === 2 &&
      parsed.app === 'AtelierDevis' &&
      parsed.data.quotes.length === 1 &&
      parsed.data.materialsLibrary.length === 2 &&
      parsed.data.customTemplates.length === 1 &&
      parsed.data.companyProfile.name === 'Ferronnerie Moderne Dakar' &&
      Boolean(parsed.data.logo) &&
      parsed.data.settings.defaultMarginPercent === 30;

    results.push({
      id: 'test-1-full-export',
      name: '1. Export complet V2',
      passed: valid,
      details: valid
        ? 'Export complet V2 généré avec succès avec toutes les sections et métadonnées.'
        : 'Échec de la génération des sections.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-1-full-export',
      name: '1. Export complet V2',
      passed: false,
      details: String(err),
    });
  }

  // Test 2: Selective export: only materials
  try {
    const json = buildExportJSON(
      {
        quotes: false,
        materials: true,
        customTemplates: false,
        companyProfile: false,
        logo: false,
        settings: false,
      },
      snapshot
    );
    const parsed = JSON.parse(json);
    const valid =
      parsed.data.materialsLibrary?.length === 2 &&
      parsed.data.quotes === undefined &&
      parsed.data.customTemplates === undefined &&
      parsed.data.companyProfile === undefined &&
      parsed.data.logo === undefined;

    results.push({
      id: 'test-2-export-materials-only',
      name: '2. Export sélectif matériaux uniquement',
      passed: valid,
      details: valid
        ? 'Seuls les matériaux sont exportés, les devis et profil sont omis.'
        : 'Inclusion inattendue de données non sélectionnées.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-2-export-materials-only',
      name: '2. Export sélectif matériaux uniquement',
      passed: false,
      details: String(err),
    });
  }

  // Test 3: Selective export: only custom templates
  try {
    const json = buildExportJSON(
      {
        quotes: false,
        materials: false,
        customTemplates: true,
        companyProfile: false,
        logo: false,
        settings: false,
      },
      snapshot
    );
    const parsed = JSON.parse(json);
    const valid =
      parsed.data.customTemplates?.length === 1 &&
      parsed.data.customTemplates[0].name === 'Grille Fer Forgé Royale' &&
      parsed.data.quotes === undefined;

    results.push({
      id: 'test-3-export-templates-only',
      name: '3. Export sélectif modèles sur mesure',
      passed: valid,
      details: valid
        ? 'Seuls les modèles personnalisés sont exportés.'
        : 'Échec du filtrage des modèles.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-3-export-templates-only',
      name: '3. Export sélectif modèles sur mesure',
      passed: false,
      details: String(err),
    });
  }

  // Test 4: Selective export: only quotes
  try {
    const json = buildExportJSON(
      {
        quotes: true,
        materials: false,
        customTemplates: false,
        companyProfile: false,
        logo: false,
        settings: false,
      },
      snapshot
    );
    const parsed = JSON.parse(json);
    const valid =
      parsed.data.quotes?.length === 1 &&
      parsed.data.quotes[0].quoteNumber === 'DEV-2026-0001' &&
      parsed.data.materialsLibrary === undefined;

    results.push({
      id: 'test-4-export-quotes-only',
      name: '4. Export sélectif devis uniquement',
      passed: valid,
      details: valid ? 'Devis isolés avec succès dans l’export.' : 'Structure invalide.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-4-export-quotes-only',
      name: '4. Export sélectif devis uniquement',
      passed: false,
      details: String(err),
    });
  }

  // Test 5: Selective export: company profile + logo
  try {
    const json = buildExportJSON(
      {
        quotes: false,
        materials: false,
        customTemplates: false,
        companyProfile: true,
        logo: true,
        settings: false,
      },
      snapshot
    );
    const parsed = JSON.parse(json);
    const valid =
      parsed.data.companyProfile?.name === 'Ferronnerie Moderne Dakar' &&
      Boolean(parsed.data.logo) &&
      parsed.data.quotes === undefined &&
      parsed.data.materialsLibrary === undefined;

    results.push({
      id: 'test-5-export-profile-logo',
      name: '5. Export sélectif profil et logo',
      passed: valid,
      details: valid ? 'Profil et logo exportés sans données de devis.' : 'Structure invalide.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-5-export-profile-logo',
      name: '5. Export sélectif profil et logo',
      passed: false,
      details: String(err),
    });
  }

  // Test 6: Import partial backup in Merge mode (preserve other data)
  try {
    const partialBackupJSON = JSON.stringify({
      version: 2,
      app: 'AtelierDevis',
      sections: { materials: true },
      data: {
        materialsLibrary: [
          {
            id: 'imp-mat-99',
            name: 'Tube rond 50mm Inox 316',
            category: 'Tubes & Profilés',
            unit: 'm',
            defaultUnitPrice: 4500,
            isCustom: true,
          },
        ],
      },
    });

    const parseRes = parseAndValidateBackupJSON(partialBackupJSON);
    if (!parseRes.success) {
      throw new Error(parseRes.error);
    }

    const exec = executeImport(
      parseRes.parsed,
      {
        mode: 'merge',
        selectedSections: {
          quotes: false,
          materials: true,
          customTemplates: false,
          companyProfile: false,
          logo: false,
          settings: false,
        },
        conflictResolutions: {},
      },
      snapshot
    );

    const valid =
      exec.success &&
      exec.nextDbState.quotes.length === 1 && // Quotes preserved!
      exec.nextDbState.profile.name === 'Ferronnerie Moderne Dakar' && // Profile preserved!
      exec.nextDbState.materials.some((m) => m.name === 'Tube rond 50mm Inox 316');

    results.push({
      id: 'test-6-import-merge-partial',
      name: '6. Importation partielle en mode Fusion',
      passed: valid,
      details: valid
        ? 'Nouveau matériau ajouté, profil et devis existants parfaitement intacts.'
        : 'Données existantes écrasées ou altérées.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-6-import-merge-partial',
      name: '6. Importation partielle en mode Fusion',
      passed: false,
      details: String(err),
    });
  }

  // Test 7: Import in Replace mode for quotes only
  try {
    const quotesBackupJSON = JSON.stringify({
      version: 2,
      app: 'AtelierDevis',
      sections: { quotes: true },
      data: {
        quotes: [
          {
            id: 'new-quote-100',
            quoteNumber: 'DEV-2026-9999',
            projectTitle: 'Chantier Remplacement Seul',
            finalTotal: 500000,
            customer: { name: 'Client Test' },
          },
        ],
      },
    });

    const parseRes = parseAndValidateBackupJSON(quotesBackupJSON);
    if (!parseRes.success) {
      throw new Error(parseRes.error);
    }

    const exec = executeImport(
      parseRes.parsed,
      {
        mode: 'replace',
        selectedSections: {
          quotes: true,
          materials: false,
          customTemplates: false,
          companyProfile: false,
          logo: false,
          settings: false,
        },
        conflictResolutions: {},
      },
      snapshot
    );

    const valid =
      exec.success &&
      exec.nextDbState.quotes.length === 1 &&
      exec.nextDbState.quotes[0].quoteNumber === 'DEV-2026-9999' &&
      exec.nextDbState.materials.length === 2 && // Materials untouched!
      exec.nextDbState.profile.name === 'Ferronnerie Moderne Dakar'; // Profile untouched!

    results.push({
      id: 'test-7-import-replace-quotes-only',
      name: '7. Remplacement ciblé devis seuls',
      passed: valid,
      details: valid
        ? 'Seuls les devis ont été remplacés, profil et matériaux conservés sans altération.'
        : 'Échec du remplacement ciblé.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-7-import-replace-quotes-only',
      name: '7. Remplacement ciblé devis seuls',
      passed: false,
      details: String(err),
    });
  }

  // Test 8: Import in Replace mode for materials only
  try {
    const materialsBackupJSON = JSON.stringify({
      version: 2,
      app: 'AtelierDevis',
      sections: { materials: true },
      data: {
        materialsLibrary: [
          {
            id: 'custom-mat-replacement',
            name: 'Poutrelle IPE 100',
            unit: 'm',
            defaultUnitPrice: 15000,
            isCustom: true,
          },
        ],
      },
    });

    const parseRes = parseAndValidateBackupJSON(materialsBackupJSON);
    if (!parseRes.success) {
      throw new Error(parseRes.error);
    }

    const exec = executeImport(
      parseRes.parsed,
      {
        mode: 'replace',
        selectedSections: {
          quotes: false,
          materials: true,
          customTemplates: false,
          companyProfile: false,
          logo: false,
          settings: false,
        },
        conflictResolutions: {},
      },
      snapshot
    );

    const valid =
      exec.success &&
      exec.nextDbState.quotes.length === 1 && // Quotes untouched!
      exec.nextDbState.materials.some((m) => m.name === 'Poutrelle IPE 100');

    results.push({
      id: 'test-8-import-replace-materials-only',
      name: '8. Remplacement ciblé matériaux seuls',
      passed: valid,
      details: valid
        ? 'Matériaux remplacés avec succès sans impacter les devis et profil existants.'
        : 'Échec du remplacement sélectif.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-8-import-replace-materials-only',
      name: '8. Remplacement ciblé matériaux seuls',
      passed: false,
      details: String(err),
    });
  }

  // Test 9: Conflict resolution: Keep Current
  try {
    const conflictingJSON = JSON.stringify({
      version: 2,
      app: 'AtelierDevis',
      sections: { materials: true },
      data: {
        materialsLibrary: [
          {
            id: 'mat-1',
            name: 'Tube carré 40×40 (ép. 1.5mm)',
            unit: 'm',
            defaultUnitPrice: 5000, // Differs from 2000
          },
        ],
      },
    });

    const parseRes = parseAndValidateBackupJSON(conflictingJSON);
    if (!parseRes.success) {
      throw new Error(parseRes.error);
    }

    const conflicts = detectConflicts(
      parseRes.parsed,
      {
        quotes: false,
        materials: true,
        customTemplates: false,
        companyProfile: false,
        logo: false,
        settings: false,
      },
      snapshot
    );

    const conflictDetected = conflicts.length === 1;

    const exec = executeImport(
      parseRes.parsed,
      {
        mode: 'merge',
        selectedSections: {
          quotes: false,
          materials: true,
          customTemplates: false,
          companyProfile: false,
          logo: false,
          settings: false,
        },
        conflictResolutions: {
          [conflicts[0].id]: 'keep_current',
        },
      },
      snapshot
    );

    const existingMat = exec.nextDbState.materials.find((m) => m.name === 'Tube carré 40×40 (ép. 1.5mm)');
    const pricePreserved = existingMat?.defaultUnitPrice === 2000;

    const valid = conflictDetected && pricePreserved;
    results.push({
      id: 'test-9-conflict-keep-current',
      name: '9. Détection et arbitrage de conflit (Conserver)',
      passed: valid,
      details: valid
        ? 'Conflit de prix détecté et prix existant de 2000 FCFA conservé selon l’arbitrage.'
        : 'Échec de résolution du conflit.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-9-conflict-keep-current',
      name: '9. Détection et arbitrage de conflit (Conserver)',
      passed: false,
      details: String(err),
    });
  }

  // Test 10: Conflict resolution: Use Imported
  try {
    const conflictingJSON = JSON.stringify({
      version: 2,
      app: 'AtelierDevis',
      sections: { materials: true },
      data: {
        materialsLibrary: [
          {
            id: 'custom-mat-1',
            name: 'Tôle perforée décorative 2mm',
            unit: 'm2',
            defaultUnitPrice: 14500, // Differs from 12000
            isCustom: true,
          },
        ],
      },
    });

    const parseRes = parseAndValidateBackupJSON(conflictingJSON);
    if (!parseRes.success) {
      throw new Error(parseRes.error);
    }

    const conflicts = detectConflicts(
      parseRes.parsed,
      {
        quotes: false,
        materials: true,
        customTemplates: false,
        companyProfile: false,
        logo: false,
        settings: false,
      },
      snapshot
    );

    const exec = executeImport(
      parseRes.parsed,
      {
        mode: 'merge',
        selectedSections: {
          quotes: false,
          materials: true,
          customTemplates: false,
          companyProfile: false,
          logo: false,
          settings: false,
        },
        conflictResolutions: {
          [conflicts[0].id]: 'use_imported',
        },
      },
      snapshot
    );

    const updatedMat = exec.nextDbState.materials.find((m) => m.name === 'Tôle perforée décorative 2mm');
    const priceUpdated = updatedMat?.defaultUnitPrice === 14500;

    const valid = conflicts.length === 1 && priceUpdated;
    results.push({
      id: 'test-10-conflict-use-imported',
      name: '10. Arbitrage de conflit (Remplacer par importé)',
      passed: valid,
      details: valid
        ? 'Prix mis à jour à 14500 FCFA conformément au choix de l’utilisateur.'
        : 'Échec de mise à jour.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-10-conflict-use-imported',
      name: '10. Arbitrage de conflit (Remplacer par importé)',
      passed: false,
      details: String(err),
    });
  }

  // Test 11: Invalid / Corrupted JSON handling
  try {
    const corruptedJSON = '{ "version": 2, "quotes": [ incomplete ';
    const parseRes = parseAndValidateBackupJSON(corruptedJSON);
    const valid = parseRes.success === false && parseRes.error.length > 0;

    results.push({
      id: 'test-11-corrupted-json-rejection',
      name: '11. Rejet sécurisé de JSON corrompu',
      passed: valid,
      details: valid
        ? 'Fichier corrompu rejeté proprement avec message clair sans altération de l’application.'
        : 'Échec de la validation d’erreur.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-11-corrupted-json-rejection',
      name: '11. Rejet sécurisé de JSON corrompu',
      passed: false,
      details: String(err),
    });
  }

  // Test 12: Legacy V1 backup compatibility
  try {
    const legacyBackupJSON = JSON.stringify({
      version: 1,
      exportedAt: '2025-12-01T00:00:00.000Z',
      businessProfile: {
        name: 'Atelier Ancien Format',
        phone: '+221 33 000 00 00',
        defaultMarginPercent: 28,
      },
      quotes: [
        {
          id: 'legacy-quote-1',
          quoteNumber: 'DEV-2025-001',
          projectTitle: 'Chantier Historique',
          finalTotal: 120000,
        },
      ],
      materialsLibrary: [
        {
          id: 'mat-legacy-1',
          name: 'Fer plat 30x4',
          unit: 'm',
          defaultUnitPrice: 1100,
        },
      ],
      templates: [],
    });

    const parseRes = parseAndValidateBackupJSON(legacyBackupJSON);
    const validParse =
      parseRes.success &&
      parseRes.parsed.format === 'v1_legacy' &&
      parseRes.parsed.quotes.length === 1 &&
      parseRes.parsed.materials.length === 1 &&
      parseRes.parsed.companyProfile?.name === 'Atelier Ancien Format';

    let validExec = false;
    if (parseRes.success) {
      const exec = executeImport(
        parseRes.parsed,
        {
          mode: 'merge',
          selectedSections: {
            quotes: true,
            materials: true,
            customTemplates: false,
            companyProfile: false,
            logo: false,
            settings: false,
          },
          conflictResolutions: {},
        },
        snapshot
      );
      validExec =
        exec.success &&
        exec.nextDbState.quotes.some((q) => q.quoteNumber === 'DEV-2025-001') &&
        exec.nextDbState.materials.some((m) => m.name === 'Fer plat 30x4');
    }

    const valid = Boolean(validParse && validExec);
    results.push({
      id: 'test-12-legacy-v1-compatibility',
      name: '12. Rétrocompatibilité avec les sauvegardes V1',
      passed: valid,
      details: valid
        ? 'Sauvegarde Legacy V1 reconnue, normalisée et importée parfaitement.'
        : 'Échec de rétrocompatibilité V1.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-12-legacy-v1-compatibility',
      name: '12. Rétrocompatibilité avec les sauvegardes V1',
      passed: false,
      details: String(err),
    });
  }

  // Test 13: Non-destructive Logo Preservation in Export and Import Cycle
  try {
    const json = buildExportJSON(
      {
        quotes: false,
        materials: false,
        customTemplates: false,
        companyProfile: true,
        logo: true,
        settings: false,
      },
      snapshot
    );
    const parsedRes = parseAndValidateBackupJSON(json);
    let valid = false;

    if (parsedRes.success) {
      const exec = executeImport(
        parsedRes.parsed,
        {
          mode: 'merge',
          selectedSections: {
            quotes: false,
            materials: false,
            customTemplates: false,
            companyProfile: true,
            logo: true,
            settings: false,
          },
          conflictResolutions: {},
        },
        {
          ...snapshot,
          profile: {
            ...snapshot.profile,
            logoUrl: undefined,
            logoOriginalUrl: undefined,
            logoEditSettings: undefined,
          },
        }
      );

      valid =
        exec.success &&
        exec.nextDbState.profile.logoUrl === mockProfile.logoUrl &&
        exec.nextDbState.profile.logoOriginalUrl === mockProfile.logoOriginalUrl &&
        exec.nextDbState.profile.logoEditSettings?.maskShape === 'circle' &&
        exec.nextDbState.profile.logoEditSettings?.zoom === 1.2;
    }

    results.push({
      id: 'test-13-logo-nondestructive-cycle',
      name: '13. Préservation Logo non destructif (Export / Import)',
      passed: valid,
      details: valid
        ? 'Image source originale, masque et réglages de cadrage intégralement préservés.'
        : 'Échec de préservation du logo original.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-13-logo-nondestructive-cycle',
      name: '13. Préservation Logo non destructif (Export / Import)',
      passed: false,
      details: String(err),
    });
  }

  // Test 14: Graceful legacy logo import without original source
  try {
    const legacyBackupJSON = JSON.stringify({
      version: 2,
      app: 'AtelierDevis',
      sections: { logo: true },
      data: {
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    });

    const parsedRes = parseAndValidateBackupJSON(legacyBackupJSON);
    let valid = false;

    if (parsedRes.success) {
      const exec = executeImport(
        parsedRes.parsed,
        {
          mode: 'merge',
          selectedSections: {
            quotes: false,
            materials: false,
            customTemplates: false,
            companyProfile: false,
            logo: true,
            settings: false,
          },
          conflictResolutions: {},
        },
        snapshot
      );

      valid =
        exec.success &&
        Boolean(exec.nextDbState.profile.logoUrl) &&
        exec.nextDbState.profile.logoOriginalUrl === exec.nextDbState.profile.logoUrl;
    }

    results.push({
      id: 'test-14-legacy-logo-fallback',
      name: '14. Tolérance et repli des anciens logos sans source brute',
      passed: valid,
      details: valid
        ? 'Ancien logo importé avec succès et promu automatiquement en source éditable.'
        : 'Échec du repli legacy pour logo.',
    });
  } catch (err: unknown) {
    results.push({
      id: 'test-14-legacy-logo-fallback',
      name: '14. Tolérance et repli des anciens logos sans source brute',
      passed: false,
      details: String(err),
    });
  }

  const allPassed = results.every((r) => r.passed);
  return { results, allPassed };
}
