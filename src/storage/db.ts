import {
  AppBackupData,
  BackupSectionsConfig,
  BusinessProfile,
  CalculationInput,
  CalculationResult,
  DraftQuoteState,
  ImportMode,
  LaborRateLibraryItem,
  MaterialCategory,
  MaterialLibraryItem,
  Quote,
  RecentCalculation,
  TemplateCategory,
  UserEntitlement,
  WorkshopTemplate,
} from '../types';
import { generateId, formatQuoteNumber } from '../utils/formatters';
import { createDefaultFreeEntitlement } from '../licensing/licenseVerifier';
import { isPremium, FREE_QUOTES_LIMIT } from '../licensing/features';
import {
  buildExportJSON,
  parseAndValidateBackupJSON,
  detectConflicts,
  executeImport,
  DEFAULT_BACKUP_SECTIONS,
  CurrentDbSnapshot,
} from './backupEngine';

const STORAGE_KEYS = {
  PROFILE: 'atelier_devis_profile',
  MATERIALS: 'atelier_devis_materials',
  MATERIAL_CATEGORIES: 'atelier_devis_material_categories',
  LABOR_RATES: 'atelier_devis_labor_rates',
  TEMPLATES: 'atelier_devis_templates',
  TEMPLATE_CATEGORIES: 'atelier_devis_template_categories',
  QUOTES: 'atelier_devis_quotes',
  QUOTE_COUNTER: 'atelier_devis_quote_seq',
  RECENT_CALCULATIONS: 'atelier_devis_recent_calcs',
  DRAFT_CALCULATION: 'atelier_devis_draft_calc',
  DRAFT_QUOTE: 'atelier_devis_draft_quote',
  ENTITLEMENT: 'atelier_devis_entitlement',
  ONBOARDING: 'atelier_devis_has_completed_onboarding',
};

export const DEFAULT_ENTITLEMENT: UserEntitlement = createDefaultFreeEntitlement();

export const DEFAULT_TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'metal', name: 'Métallerie / Serrurerie / Inox', isDefault: true, enabled: true },
  { id: 'bois', name: 'Menuiserie Bois', isDefault: true, enabled: true },
  { id: 'alu', name: 'Menuiserie Aluminium', isDefault: true, enabled: true },
  { id: 'autre', name: 'Autre ouvrage', isDefault: true, enabled: true },
];

export const DEFAULT_MATERIAL_CATEGORIES: MaterialCategory[] = [
  { id: 'matcat-tubes', name: 'Tubes & Profilés', isDefault: true, enabled: true },
  { id: 'matcat-toles', name: 'Tôles & Fers', isDefault: true, enabled: true },
  { id: 'matcat-soudure', name: 'Soudure & Consommables', isDefault: true, enabled: true },
  { id: 'matcat-peinture', name: 'Peinture & Finition', isDefault: true, enabled: true },
  { id: 'matcat-quincaillerie', name: 'Quincaillerie & Accessoires', isDefault: true, enabled: true },
  { id: 'matcat-bois', name: 'Bois & Menuiserie', isDefault: true, enabled: true },
  { id: 'matcat-alu', name: 'Aluminium', isDefault: true, enabled: true },
  { id: 'matcat-autre', name: 'Autre matériel', isDefault: true, enabled: true },
];

export const DEFAULT_PROFILE: BusinessProfile = {
  name: '',
  tagline: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  country: '',
  taxId: '',
  defaultCurrency: 'XOF',
  currencySymbol: 'FCFA',
  defaultMarginPercent: 25,
  defaultWastePercent: 5,
  defaultLaborRate: 2500,
  defaultRounding: 'none',
  defaultValidityDays: 30,
  defaultPaymentTerms: 'Acompte de 40% à la commande, solde à la livraison ou fin de pose.',
  footerNotes: 'Garantie sur soudures et structures. Devis valable 30 jours.',
  showSystemTemplates: true,
  showPredefinedTemplates: true,
  showSystemTemplateCategories: true,
  showPredefinedTemplateCategories: true,
  showSystemMaterials: true,
  showPredefinedMaterials: true,
  showSystemMaterialCategories: true,
  showPredefinedMaterialCategories: true,
};

export const INITIAL_MATERIALS: MaterialLibraryItem[] = [
  {
    id: 'mat-1',
    name: 'Tube carré 40×40 (ép. 1.5mm)',
    categoryId: 'matcat-tubes',
    category: 'Tubes & Profilés',
    unit: 'm',
    defaultUnitPrice: 2000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-2',
    name: 'Tube carré 30×30 (ép. 1.5mm)',
    categoryId: 'matcat-tubes',
    category: 'Tubes & Profilés',
    unit: 'm',
    defaultUnitPrice: 1500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-3',
    name: 'Tube rectangulaire 60×40',
    categoryId: 'matcat-tubes',
    category: 'Tubes & Profilés',
    unit: 'm',
    defaultUnitPrice: 2800,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-4',
    name: 'Tôle plane noire 2mm',
    categoryId: 'matcat-toles',
    category: 'Tôles & Fers',
    unit: 'm2',
    defaultUnitPrice: 5000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-5',
    name: 'Tôle striée 3mm antidérapante',
    categoryId: 'matcat-toles',
    category: 'Tôles & Fers',
    unit: 'm2',
    defaultUnitPrice: 8500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-6',
    name: 'Fer cornière 30×30 (ép. 3mm)',
    categoryId: 'matcat-toles',
    category: 'Tôles & Fers',
    unit: 'm',
    defaultUnitPrice: 1100,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-7',
    name: 'Fer plat 30×4',
    categoryId: 'matcat-toles',
    category: 'Tôles & Fers',
    unit: 'm',
    defaultUnitPrice: 800,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-8',
    name: 'Fer rond plein Ø12',
    categoryId: 'matcat-toles',
    category: 'Tôles & Fers',
    unit: 'm',
    defaultUnitPrice: 1200,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-9',
    name: 'Électrodes de soudure (Boîte 2.5kg)',
    categoryId: 'matcat-soudure',
    category: 'Soudure & Consommables',
    unit: 'paquet',
    defaultUnitPrice: 4500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-10',
    name: 'Disque à ébarber/tronçonner Ø115',
    categoryId: 'matcat-soudure',
    category: 'Soudure & Consommables',
    unit: 'piece',
    defaultUnitPrice: 1000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-11',
    name: 'Peinture antirouille & Finition (1L)',
    categoryId: 'matcat-peinture',
    category: 'Peinture & Finition',
    unit: 'l',
    defaultUnitPrice: 4500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-12',
    name: 'Diluant cellulosique (1L)',
    categoryId: 'matcat-peinture',
    category: 'Peinture & Finition',
    unit: 'l',
    defaultUnitPrice: 2000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-13',
    name: 'Paumelles soudables 100mm (paire)',
    categoryId: 'matcat-quincaillerie',
    category: 'Quincaillerie & Accessoires',
    unit: 'piece',
    defaultUnitPrice: 1500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-14',
    name: 'Serrure à canon pour tube métallique',
    categoryId: 'matcat-quincaillerie',
    category: 'Quincaillerie & Accessoires',
    unit: 'piece',
    defaultUnitPrice: 8500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-15',
    name: 'Planche bois massif Iroko / Teck',
    categoryId: 'matcat-bois',
    category: 'Bois & Menuiserie',
    unit: 'm',
    defaultUnitPrice: 6000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-16',
    name: 'Profilé aluminium tubulaire',
    categoryId: 'matcat-alu',
    category: 'Aluminium',
    unit: 'm',
    defaultUnitPrice: 3500,
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_LABOR_RATES: LaborRateLibraryItem[] = [
  {
    id: 'rate-1',
    task: 'Découpe & Soudure métallique',
    defaultRate: 2500,
    description: 'Travaux de tronçonnage, meulage et soudure à l’arc',
  },
  {
    id: 'rate-2',
    task: 'Assemblage & Ajustage',
    defaultRate: 2000,
    description: 'Montage en atelier, ponçage et préparation des surfaces',
  },
  {
    id: 'rate-3',
    task: 'Peinture & Traitement de surface',
    defaultRate: 2000,
    description: 'Application primaire antirouille et couches de finition',
  },
  {
    id: 'rate-4',
    task: 'Pose & Installation sur chantier',
    defaultRate: 3000,
    description: 'Fixation, scellement et réglage chez le client',
  },
  {
    id: 'rate-5',
    task: 'Menuiserie bois & Finition',
    defaultRate: 2500,
    description: 'Découpe, rabotage, ponçage et vernissage',
  },
];

export const INITIAL_TEMPLATES: WorkshopTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Porte métallique battante (2m × 0.9m)',
    categoryId: 'metal',
    category: 'metal',
    isPremiumOnly: false,
    isCustom: false,
    description: 'Cadre tube 40×40, remplissage tôle 2mm, serrure, paumelles et peinture.',
    defaultMaterials: [
      { name: 'Tube carré 40×40', quantity: 12, unit: 'm', unitPrice: 2000 },
      { name: 'Tôle plane noire 2mm', quantity: 2, unit: 'm2', unitPrice: 5000 },
      { name: 'Paumelles soudables 100mm (paire)', quantity: 2, unit: 'piece', unitPrice: 1500 },
      { name: 'Serrure à canon pour tube métallique', quantity: 1, unit: 'piece', unitPrice: 8500 },
      { name: 'Peinture antirouille & Finition (1L)', quantity: 1, unit: 'l', unitPrice: 4500 },
      { name: 'Électrodes de soudure', quantity: 0.5, unit: 'paquet', unitPrice: 4500 },
    ],
    defaultLabor: [
      { task: 'Découpe & Soudure métallique', hours: 7, hourlyRate: 2500 },
      { task: 'Peinture & Traitement de surface', hours: 2, hourlyRate: 2000 },
      { task: 'Pose & Installation sur chantier', hours: 3, hourlyRate: 3000 },
    ],
    defaultOtherCosts: [
      { description: 'Transport et livraison sur chantier', amount: 5000, category: 'transport' },
      { description: 'Consommables (disques, diluant)', amount: 3000, category: 'consommable' },
    ],
    wastePercent: 5,
    targetMarginPercent: 25,
    overheadType: 'percent',
    overheadValue: 0,
    pricingMode: 'margin',
    roundingStep: 'none',
  },
  {
    id: 'tpl-2',
    name: 'Grille de défense fenêtre (1.2m × 1.2m)',
    categoryId: 'metal',
    category: 'metal',
    isPremiumOnly: false,
    isCustom: false,
    description: 'Cadre cornière 30×30, barreaux en fer rond plein Ø12 espacés de 12cm.',
    defaultMaterials: [
      { name: 'Fer cornière 30×30', quantity: 5, unit: 'm', unitPrice: 1100 },
      { name: 'Fer rond plein Ø12', quantity: 12, unit: 'm', unitPrice: 1200 },
      { name: 'Électrodes de soudure', quantity: 0.5, unit: 'paquet', unitPrice: 4500 },
      { name: 'Peinture antirouille & Finition (1L)', quantity: 1, unit: 'l', unitPrice: 4500 },
    ],
    defaultLabor: [
      { task: 'Découpe & Soudure métallique', hours: 4, hourlyRate: 2500 },
      { task: 'Peinture & Traitement de surface', hours: 1.5, hourlyRate: 2000 },
      { task: 'Pose & Installation sur chantier', hours: 2, hourlyRate: 3000 },
    ],
    defaultOtherCosts: [
      { description: 'Transport', amount: 3000, category: 'transport' },
    ],
    wastePercent: 5,
    targetMarginPercent: 25,
    overheadType: 'percent',
    overheadValue: 0,
    pricingMode: 'margin',
    roundingStep: 'none',
  },
  {
    id: 'tpl-3',
    name: 'Portail coulissant motorisable (3.5m × 2m)',
    categoryId: 'metal',
    category: 'metal',
    isPremiumOnly: false,
    isCustom: false,
    description: 'Cadre lourd tube 60×40, barreaudage tube 30×30, roulettes en U et rail au sol.',
    defaultMaterials: [
      { name: 'Tube rectangulaire 60×40', quantity: 18, unit: 'm', unitPrice: 2800 },
      { name: 'Tube carré 30×30', quantity: 36, unit: 'm', unitPrice: 1500 },
      { name: 'Tôle striée 3mm antidérapante', quantity: 2, unit: 'm2', unitPrice: 8500 },
      { name: 'Électrodes de soudure', quantity: 2, unit: 'paquet', unitPrice: 4500 },
      { name: 'Disque à ébarber/tronçonner Ø115', quantity: 4, unit: 'piece', unitPrice: 1000 },
      { name: 'Peinture antirouille & Finition (1L)', quantity: 3, unit: 'l', unitPrice: 4500 },
    ],
    defaultLabor: [
      { task: 'Découpe & Soudure métallique', hours: 16, hourlyRate: 2500 },
      { task: 'Assemblage & Ajustage', hours: 6, hourlyRate: 2000 },
      { task: 'Peinture & Traitement de surface', hours: 4, hourlyRate: 2000 },
      { task: 'Pose & Installation sur chantier', hours: 6, hourlyRate: 3000 },
    ],
    defaultOtherCosts: [
      { description: 'Roulettes gorges U & Rail acier', amount: 25000, category: 'autre' },
      { description: 'Transport camionnette', amount: 10000, category: 'transport' },
    ],
    wastePercent: 6,
    targetMarginPercent: 30,
    overheadType: 'percent',
    overheadValue: 0,
    pricingMode: 'margin',
    roundingStep: '100',
  },
  {
    id: 'tpl-4',
    name: 'Table basse design industriel (1.2m × 0.6m)',
    categoryId: 'bois',
    category: 'bois',
    isPremiumOnly: false,
    isCustom: false,
    description: 'Piétement en tube carré 30×30 noir mat avec plateau en bois massif huilé.',
    defaultMaterials: [
      { name: 'Tube carré 30×30', quantity: 8, unit: 'm', unitPrice: 1500 },
      { name: 'Planche bois massif Iroko / Teck', quantity: 3, unit: 'm', unitPrice: 6000 },
      { name: 'Peinture antirouille & Finition (1L)', quantity: 0.5, unit: 'l', unitPrice: 4500 },
    ],
    defaultLabor: [
      { task: 'Découpe & Soudure métallique', hours: 3, hourlyRate: 2500 },
      { task: 'Menuiserie bois & Finition', hours: 3, hourlyRate: 2500 },
    ],
    defaultOtherCosts: [
      { description: 'Visserie & Patins de protection', amount: 2000, category: 'consommable' },
    ],
    wastePercent: 5,
    targetMarginPercent: 30,
    overheadType: 'percent',
    overheadValue: 0,
    pricingMode: 'margin',
    roundingStep: 'none',
  },
  {
    id: 'tpl-5',
    name: 'Pergola métallique sur mesure & Lames brise-soleil (4m × 3m)',
    categoryId: 'metal',
    category: 'metal',
    isPremiumOnly: true,
    isCustom: false,
    description: 'Poteaux porteurs 100×100, poutres périphériques 120×60 et tablier de lames d\'ombrage inclinées.',
    defaultMaterials: [
      { name: 'Tube carré 100×100 (ép. 3mm)', quantity: 12, unit: 'm', unitPrice: 8500 },
      { name: 'Tube rectangulaire 120×60', quantity: 14, unit: 'm', unitPrice: 6500 },
      { name: 'Fer plat ou profil ailettes brise-soleil', quantity: 48, unit: 'm', unitPrice: 2200 },
      { name: 'Platines d\'ancrage 250×250 (ép. 8mm)', quantity: 4, unit: 'piece', unitPrice: 9000 },
      { name: 'Peinture époxy thermolaquée ou polyuréthane', quantity: 4, unit: 'l', unitPrice: 7500 },
      { name: 'Électrodes de soudure (Boîte 2.5kg)', quantity: 3, unit: 'paquet', unitPrice: 4500 },
    ],
    defaultLabor: [
      { task: 'Découpe & Soudure métallique', hours: 20, hourlyRate: 3000 },
      { task: 'Assemblage & Ajustage', hours: 8, hourlyRate: 2500 },
      { task: 'Peinture & Traitement de surface', hours: 6, hourlyRate: 2500 },
      { task: 'Pose & Installation sur chantier', hours: 10, hourlyRate: 3500 },
    ],
    defaultOtherCosts: [
      { description: 'Transport et grutage / levage chantier', amount: 25000, category: 'transport' },
      { description: 'Scellement chimique & Visserie inox haute résistance', amount: 15000, category: 'consommable' },
    ],
    wastePercent: 6,
    targetMarginPercent: 30,
    overheadType: 'percent',
    overheadValue: 5,
    pricingMode: 'margin',
    roundingStep: '500',
  },
  {
    id: 'tpl-6',
    name: 'Escalier métallique industriel avec limon central (H 2.8m, 14 marches)',
    categoryId: 'metal',
    category: 'metal',
    isPremiumOnly: true,
    isCustom: false,
    description: 'Limon central lourd 150×100, corbeaux découpés au laser, marches bois massif et garde-corps rampant.',
    defaultMaterials: [
      { name: 'Tube rectangulaire 150×100 (ép. 4mm)', quantity: 6, unit: 'm', unitPrice: 12500 },
      { name: 'Tôle plane noire 4mm (supports de marche)', quantity: 3, unit: 'm2', unitPrice: 8500 },
      { name: 'Platines d\'ancrage 300×300 (ép. 10mm)', quantity: 2, unit: 'piece', unitPrice: 15000 },
      { name: 'Planche bois massif Iroko usinée vernie', quantity: 14, unit: 'piece', unitPrice: 7500 },
      { name: 'Tube rond Ø40 (main courante & lisses)', quantity: 8, unit: 'm', unitPrice: 3200 },
      { name: 'Peinture antirouille & Finition noire satinée', quantity: 4, unit: 'l', unitPrice: 5500 },
      { name: 'Électrodes de soudure (Boîte 2.5kg)', quantity: 2, unit: 'paquet', unitPrice: 4500 },
    ],
    defaultLabor: [
      { task: 'Découpe, traçage & Débit structure', hours: 10, hourlyRate: 3000 },
      { task: 'Soudure & Assemblage limon + corbeaux', hours: 16, hourlyRate: 3000 },
      { task: 'Menuiserie bois & Finition marches', hours: 6, hourlyRate: 2500 },
      { task: 'Pose sur chantier & Calage d\'ancrage', hours: 12, hourlyRate: 3500 },
    ],
    defaultOtherCosts: [
      { description: 'Transport lourd par camion grue', amount: 30000, category: 'transport' },
      { description: 'Goujons d\'ancrage sol/palier & Visserie', amount: 12000, category: 'consommable' },
    ],
    wastePercent: 5,
    targetMarginPercent: 30,
    overheadType: 'percent',
    overheadValue: 5,
    pricingMode: 'margin',
    roundingStep: '500',
  },
  {
    id: 'tpl-7',
    name: 'Garde-corps Inox 304 & Câbles tendus (4m linéaire)',
    categoryId: 'metal',
    category: 'metal',
    isPremiumOnly: true,
    isCustom: false,
    description: 'Structure poteaux inox brossé Ø42.4mm, main courante et 5 rangées de câbles inox 4mm avec tendeurs.',
    defaultMaterials: [
      { name: 'Tube rond Inox 304 Ø42.4mm (ép. 2mm)', quantity: 12, unit: 'm', unitPrice: 9500 },
      { name: 'Câble Inox souple Ø4mm', quantity: 20, unit: 'm', unitPrice: 2200 },
      { name: 'Kit tendeurs et embouts à sertir inox', quantity: 10, unit: 'piece', unitPrice: 4500 },
      { name: 'Platines de fixation au sol inox avec rosaces', quantity: 5, unit: 'piece', unitPrice: 6500 },
      { name: 'Produits de polissage & Décapage inox', quantity: 1, unit: 'l', unitPrice: 8000 },
    ],
    defaultLabor: [
      { task: 'Découpe & Soudure métallique', hours: 8, hourlyRate: 3500 },
      { task: 'Assemblage & Ajustage', hours: 4, hourlyRate: 3000 },
      { task: 'Pose & Installation sur chantier', hours: 6, hourlyRate: 4000 },
    ],
    defaultOtherCosts: [
      { description: 'Transport sécurisé inox', amount: 10000, category: 'transport' },
      { description: 'Consommables spéciaux inox (disques zircon)', amount: 6000, category: 'consommable' },
    ],
    wastePercent: 4,
    targetMarginPercent: 35,
    overheadType: 'percent',
    overheadValue: 5,
    pricingMode: 'margin',
    roundingStep: '500',
  },
];

// Helper to safely read from localStorage
function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return fallback;
  }
}

// Helper to safely write to localStorage
function writeStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

export const db = {
  // Business profile
  getProfile(): BusinessProfile {
    const profile = readStorage<BusinessProfile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    const showSysTemplates =
      profile.showSystemTemplates !== undefined
        ? profile.showSystemTemplates !== false
        : profile.showPredefinedTemplates !== false;
    const showSysTplCats =
      profile.showSystemTemplateCategories !== undefined
        ? profile.showSystemTemplateCategories !== false
        : profile.showPredefinedTemplateCategories !== false;
    const showSysMaterials =
      profile.showSystemMaterials !== undefined
        ? profile.showSystemMaterials !== false
        : profile.showPredefinedMaterials !== false;
    const showSysMatCats =
      profile.showSystemMaterialCategories !== undefined
        ? profile.showSystemMaterialCategories !== false
        : profile.showPredefinedMaterialCategories !== false;

    return {
      ...DEFAULT_PROFILE,
      ...profile,
      showSystemTemplates: showSysTemplates,
      showPredefinedTemplates: showSysTemplates,
      showSystemTemplateCategories: showSysTplCats,
      showPredefinedTemplateCategories: showSysTplCats,
      showSystemMaterials: showSysMaterials,
      showPredefinedMaterials: showSysMaterials,
      showSystemMaterialCategories: showSysMatCats,
      showPredefinedMaterialCategories: showSysMatCats,
    };
  },

  saveProfile(profile: BusinessProfile): void {
    writeStorage(STORAGE_KEYS.PROFILE, profile);
  },

  // Materials library
  getMaterials(): MaterialLibraryItem[] {
    const stored = readStorage<MaterialLibraryItem[]>(STORAGE_KEYS.MATERIALS, []);
    const categories = this.getMaterialCategories();
    const catMap = new Map<string, string>(categories.map((c) => [c.id, c.name]));
    const nameToIdMap = new Map<string, string>(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));

    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
      return INITIAL_MATERIALS;
    }

    return stored.map((item) => {
      let catId = item.categoryId;
      let catName = item.category;

      if (!catId) {
        const matchedId = catName ? nameToIdMap.get(catName.trim().toLowerCase()) : undefined;
        catId = matchedId || 'matcat-autre';
      }

      if (!catName || catName === 'Général') {
        catName = catMap.get(catId) || 'Autre matériel';
      }

      return {
        ...item,
        categoryId: catId,
        category: catName,
      };
    });
  },

  saveMaterial(item: Omit<MaterialLibraryItem, 'id' | 'updatedAt'> & { id?: string }): MaterialLibraryItem {
    const materials = this.getMaterials();
    const existingIndex = item.id ? materials.findIndex((m) => m.id === item.id) : -1;
    const now = new Date().toISOString();
    const categories = this.getMaterialCategories();

    let categoryId = item.categoryId;
    let categoryName = item.category;
    if (categoryId) {
      const found = categories.find((c) => c.id === categoryId);
      if (found) {
        categoryName = found.name;
      }
    } else if (categoryName) {
      const found = categories.find((c) => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase());
      if (found) {
        categoryId = found.id;
      } else {
        categoryId = 'matcat-autre';
      }
    } else {
      categoryId = 'matcat-autre';
      categoryName = 'Autre matériel';
    }

    if (existingIndex >= 0 && item.id) {
      const updated: MaterialLibraryItem = {
        ...materials[existingIndex],
        ...item,
        id: item.id,
        categoryId,
        category: categoryName || 'Autre matériel',
        updatedAt: now,
      };
      materials[existingIndex] = updated;
      writeStorage(STORAGE_KEYS.MATERIALS, materials);
      return updated;
    } else {
      const newItem: MaterialLibraryItem = {
        id: generateId(),
        name: item.name,
        categoryId,
        category: categoryName || 'Autre matériel',
        unit: item.unit || 'piece',
        defaultUnitPrice: item.defaultUnitPrice || 0,
        updatedAt: now,
      };
      materials.unshift(newItem);
      writeStorage(STORAGE_KEYS.MATERIALS, materials);
      return newItem;
    }
  },

  deleteMaterial(id: string): void {
    const materials = this.getMaterials().filter((m) => m.id !== id);
    writeStorage(STORAGE_KEYS.MATERIALS, materials);
  },

  // Material Categories
  getMaterialCategories(): MaterialCategory[] {
    const stored = readStorage<MaterialCategory[]>(STORAGE_KEYS.MATERIAL_CATEGORIES, []);
    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEYS.MATERIAL_CATEGORIES, DEFAULT_MATERIAL_CATEGORIES);
      return DEFAULT_MATERIAL_CATEGORIES;
    }

    // Ensure all default system categories exist
    const defaultIds = new Set(DEFAULT_MATERIAL_CATEGORIES.map((c) => c.id));
    const result: MaterialCategory[] = DEFAULT_MATERIAL_CATEGORIES.map((def) => {
      const existing = stored.find((s) => s.id === def.id);
      return existing
        ? { ...def, name: existing.name || def.name, isDefault: true, enabled: existing.enabled !== false }
        : def;
    });

    // Append custom categories
    for (const cat of stored) {
      if (!defaultIds.has(cat.id)) {
        result.push({
          ...cat,
          isDefault: false,
          enabled: cat.enabled !== false,
        });
      }
    }
    return result;
  },

  saveMaterialCategory(cat: { id?: string; name: string; enabled?: boolean }): MaterialCategory {
    const trimmedName = cat.name.trim();
    if (!trimmedName) {
      throw new Error('Le nom de la catégorie de matériau ne peut pas être vide.');
    }
    const categories = this.getMaterialCategories();
    const defaultIds = new Set(DEFAULT_MATERIAL_CATEGORIES.map((c) => c.id));

    // Check for duplicate name (case insensitive) among other categories
    const duplicate = categories.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase() && c.id !== cat.id
    );
    if (duplicate) {
      throw new Error(`Une catégorie de matériau portant le nom « ${trimmedName} » existe déjà.`);
    }

    if (cat.id) {
      const index = categories.findIndex((c) => c.id === cat.id);
      if (index >= 0) {
        const isDef = defaultIds.has(cat.id) || categories[index].isDefault;
        categories[index] = {
          ...categories[index],
          name: trimmedName,
          enabled: cat.enabled !== undefined ? cat.enabled : categories[index].enabled !== false,
          isDefault: isDef,
        };
        writeStorage(STORAGE_KEYS.MATERIAL_CATEGORIES, categories);
        return categories[index];
      }
    }

    // New category
    const newId = `matcat-${generateId()}`;
    if (defaultIds.has(newId)) {
      throw new Error('Identifiant de catégorie réservé.');
    }
    const newCat: MaterialCategory = {
      id: newId,
      name: trimmedName,
      isDefault: false,
      enabled: cat.enabled !== undefined ? cat.enabled : true,
    };
    categories.push(newCat);
    writeStorage(STORAGE_KEYS.MATERIAL_CATEGORIES, categories);
    return newCat;
  },

  renameMaterialCategory(id: string, newName: string): MaterialCategory {
    return this.saveMaterialCategory({ id, name: newName });
  },

  toggleMaterialCategoryEnabled(id: string, enabled?: boolean): MaterialCategory {
    const categories = this.getMaterialCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index < 0) {
      throw new Error('Catégorie introuvable.');
    }

    const currentEnabled = categories[index].enabled !== false;
    const nextEnabled = enabled !== undefined ? enabled : !currentEnabled;
    categories[index] = {
      ...categories[index],
      enabled: nextEnabled,
    };
    writeStorage(STORAGE_KEYS.MATERIAL_CATEGORIES, categories);
    return categories[index];
  },

  deleteMaterialCategory(id: string, reassignToCategoryId: string): { reallocatedCount: number } {
    const defaultIds = new Set(DEFAULT_MATERIAL_CATEGORIES.map((c) => c.id));
    if (defaultIds.has(id)) {
      throw new Error('Les catégories système par défaut ne peuvent pas être supprimées.');
    }
    const categories = this.getMaterialCategories();
    const targetCat = categories.find((c) => c.id === reassignToCategoryId);
    if (!targetCat) {
      throw new Error('La catégorie de réassignation sélectionnée est introuvable.');
    }
    const deletedCat = categories.find((c) => c.id === id);

    // Reassign all materials referencing `id` or deleted category name
    const materials = this.getMaterials();
    let reallocatedCount = 0;
    const updatedMaterials = materials.map((mat) => {
      if (mat.categoryId === id || (deletedCat && mat.category === deletedCat.name)) {
        reallocatedCount++;
        return {
          ...mat,
          categoryId: reassignToCategoryId,
          category: targetCat.name,
          updatedAt: new Date().toISOString(),
        };
      }
      return mat;
    });

    if (reallocatedCount > 0) {
      writeStorage(STORAGE_KEYS.MATERIALS, updatedMaterials);
    }

    // Filter out the deleted category
    const remainingCategories = categories.filter((c) => c.id !== id);
    writeStorage(STORAGE_KEYS.MATERIAL_CATEGORIES, remainingCategories);

    return { reallocatedCount };
  },

  // Labor rates library
  getLaborRates(): LaborRateLibraryItem[] {
    const stored = readStorage<LaborRateLibraryItem[]>(STORAGE_KEYS.LABOR_RATES, []);
    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEYS.LABOR_RATES, INITIAL_LABOR_RATES);
      return INITIAL_LABOR_RATES;
    }
    return stored;
  },

  saveLaborRate(item: Omit<LaborRateLibraryItem, 'id'> & { id?: string }): LaborRateLibraryItem {
    const rates = this.getLaborRates();
    const existingIndex = item.id ? rates.findIndex((r) => r.id === item.id) : -1;

    if (existingIndex >= 0 && item.id) {
      const updated: LaborRateLibraryItem = {
        ...rates[existingIndex],
        ...item,
        id: item.id,
      };
      rates[existingIndex] = updated;
      writeStorage(STORAGE_KEYS.LABOR_RATES, rates);
      return updated;
    } else {
      const newRate: LaborRateLibraryItem = {
        id: generateId(),
        task: item.task,
        defaultRate: item.defaultRate,
        description: item.description,
      };
      rates.push(newRate);
      writeStorage(STORAGE_KEYS.LABOR_RATES, rates);
      return newRate;
    }
  },

  deleteLaborRate(id: string): void {
    const rates = this.getLaborRates().filter((r) => r.id !== id);
    writeStorage(STORAGE_KEYS.LABOR_RATES, rates);
  },

  // Template Categories
  getTemplateCategories(): TemplateCategory[] {
    const stored = readStorage<TemplateCategory[]>(STORAGE_KEYS.TEMPLATE_CATEGORIES, []);
    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEYS.TEMPLATE_CATEGORIES, DEFAULT_TEMPLATE_CATEGORIES);
      return DEFAULT_TEMPLATE_CATEGORIES;
    }

    // Ensure all 4 default system categories exist
    const defaultIds = new Set(DEFAULT_TEMPLATE_CATEGORIES.map((c) => c.id));
    const result: TemplateCategory[] = DEFAULT_TEMPLATE_CATEGORIES.map((def) => {
      const existing = stored.find((s) => s.id === def.id);
      return existing
        ? { ...def, name: existing.name || def.name, isDefault: true, enabled: existing.enabled !== false }
        : def;
    });

    // Append custom categories
    for (const cat of stored) {
      if (!defaultIds.has(cat.id)) {
        result.push({
          ...cat,
          isDefault: false,
          enabled: cat.enabled !== false,
        });
      }
    }
    return result;
  },

  saveTemplateCategory(cat: { id?: string; name: string; enabled?: boolean }): TemplateCategory {
    const trimmedName = cat.name.trim();
    if (!trimmedName) {
      throw new Error('Le nom de la catégorie de modèle ne peut pas être vide.');
    }
    const categories = this.getTemplateCategories();
    const defaultIds = new Set(DEFAULT_TEMPLATE_CATEGORIES.map((c) => c.id));

    // Check for duplicate name (case insensitive) among other categories
    const duplicate = categories.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase() && c.id !== cat.id
    );
    if (duplicate) {
      throw new Error(`Une catégorie de modèle portant le nom « ${trimmedName} » existe déjà.`);
    }

    if (cat.id) {
      const index = categories.findIndex((c) => c.id === cat.id);
      if (index >= 0) {
        const isDef = defaultIds.has(cat.id) || categories[index].isDefault;
        categories[index] = {
          ...categories[index],
          name: trimmedName,
          enabled: cat.enabled !== undefined ? cat.enabled : categories[index].enabled !== false,
          isDefault: isDef,
        };
        writeStorage(STORAGE_KEYS.TEMPLATE_CATEGORIES, categories);
        return categories[index];
      }
    }

    // New category
    const newId = `cat-${generateId()}`;
    if (defaultIds.has(newId)) {
      throw new Error('Identifiant de catégorie réservé.');
    }
    const newCat: TemplateCategory = {
      id: newId,
      name: trimmedName,
      isDefault: false,
      enabled: cat.enabled !== undefined ? cat.enabled : true,
    };
    categories.push(newCat);
    writeStorage(STORAGE_KEYS.TEMPLATE_CATEGORIES, categories);
    return newCat;
  },

  renameTemplateCategory(id: string, newName: string): TemplateCategory {
    return this.saveTemplateCategory({ id, name: newName });
  },

  toggleTemplateCategoryEnabled(id: string, enabled?: boolean): TemplateCategory {
    const categories = this.getTemplateCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index < 0) {
      throw new Error('Catégorie introuvable.');
    }

    const currentEnabled = categories[index].enabled !== false;
    const nextEnabled = enabled !== undefined ? enabled : !currentEnabled;
    categories[index] = {
      ...categories[index],
      enabled: nextEnabled,
    };
    writeStorage(STORAGE_KEYS.TEMPLATE_CATEGORIES, categories);
    return categories[index];
  },

  deleteTemplateCategory(id: string, reassignToCategoryId: string): { reallocatedCount: number } {
    const defaultIds = new Set(DEFAULT_TEMPLATE_CATEGORIES.map((c) => c.id));
    if (defaultIds.has(id)) {
      throw new Error('Les catégories système par défaut ne peuvent pas être supprimées.');
    }
    const categories = this.getTemplateCategories();
    const targetCat = categories.find((c) => c.id === reassignToCategoryId);
    if (!targetCat) {
      throw new Error('La catégorie de réassignation sélectionnée est introuvable.');
    }

    // Reassign all templates referencing `id`
    const templates = this.getTemplates();
    let reallocatedCount = 0;
    const updatedTemplates = templates.map((tpl) => {
      if (tpl.categoryId === id || tpl.category === id) {
        reallocatedCount++;
        return {
          ...tpl,
          categoryId: reassignToCategoryId,
          category: reassignToCategoryId,
        };
      }
      return tpl;
    });

    if (reallocatedCount > 0) {
      writeStorage(STORAGE_KEYS.TEMPLATES, updatedTemplates);
    }

    // Filter out the deleted category
    const remainingCategories = categories.filter((c) => c.id !== id);
    writeStorage(STORAGE_KEYS.TEMPLATE_CATEGORIES, remainingCategories);

    return { reallocatedCount };
  },

  // Templates
  getTemplates(): WorkshopTemplate[] {
    const stored = readStorage<WorkshopTemplate[]>(STORAGE_KEYS.TEMPLATES, []);
    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
      return INITIAL_TEMPLATES;
    }

    // Ensure all built-in templates are present (updated if needed) and merge with custom templates
    const builtInIds = new Set(INITIAL_TEMPLATES.map((t) => t.id));
    const userCustomTemplates = stored.filter((t) => !builtInIds.has(t.id) || t.isCustom);

    const result: WorkshopTemplate[] = INITIAL_TEMPLATES.map((t) => ({
      ...t,
      categoryId: t.categoryId || t.category || 'autre',
      category: t.categoryId || t.category || 'autre',
    }));

    for (const custom of userCustomTemplates) {
      if (!result.some((r) => r.id === custom.id)) {
        const catId = custom.categoryId || custom.category || 'autre';
        result.push({
          ...custom,
          categoryId: catId,
          category: catId,
          isCustom: true,
        });
      }
    }
    return result;
  },

  saveTemplate(tpl: Omit<WorkshopTemplate, 'id'> & { id?: string }): WorkshopTemplate {
    const list = this.getTemplates();
    const existingIndex = tpl.id ? list.findIndex((t) => t.id === tpl.id) : -1;
    const now = new Date().toISOString();
    const categoryId = tpl.categoryId || tpl.category || 'autre';

    if (existingIndex >= 0 && tpl.id) {
      const updated: WorkshopTemplate = {
        ...list[existingIndex],
        ...tpl,
        id: tpl.id,
        categoryId,
        category: categoryId,
        isCustom: list[existingIndex].isCustom ?? true,
        updatedAt: now,
      };
      list[existingIndex] = updated;
      writeStorage(STORAGE_KEYS.TEMPLATES, list);
      return updated;
    } else {
      const newTpl: WorkshopTemplate = {
        ...tpl,
        id: tpl.id || generateId(),
        categoryId,
        category: categoryId,
        isCustom: tpl.isCustom !== undefined ? tpl.isCustom : true,
        isPremiumOnly: tpl.isPremiumOnly ?? false,
        createdAt: now,
        updatedAt: now,
      };
      list.push(newTpl);
      writeStorage(STORAGE_KEYS.TEMPLATES, list);
      return newTpl;
    }
  },

  deleteTemplate(id: string): void {
    const list = this.getTemplates().filter((t) => t.id !== id);
    writeStorage(STORAGE_KEYS.TEMPLATES, list);
  },

  // Quotes
  getQuotes(): Quote[] {
    return readStorage<Quote[]>(STORAGE_KEYS.QUOTES, []);
  },

  getQuoteById(id: string): Quote | undefined {
    return this.getQuotes().find((q) => q.id === id);
  },

  getNextQuoteNumber(): string {
    const seq = readStorage<number>(STORAGE_KEYS.QUOTE_COUNTER, 1);
    return formatQuoteNumber(seq);
  },

  saveQuote(quote: Quote): Quote {
    const quotes = this.getQuotes();
    const existingIndex = quotes.findIndex((q) => q.id === quote.id);
    const now = new Date().toISOString();
    const entitlement = this.getEntitlement();
    const userIsPremium = isPremium(entitlement);

    let savedQuote: Quote;
    if (existingIndex >= 0) {
      savedQuote = {
        ...quote,
        updatedAt: now,
      };
      quotes[existingIndex] = savedQuote;
    } else {
      // Hard check for free tier limit (maximum 15 quotes)
      if (!userIsPremium && quotes.length >= FREE_QUOTES_LIMIT) {
        throw new Error(`Limite de ${FREE_QUOTES_LIMIT} devis atteinte dans la version Gratuite.`);
      }

      // Increment counter if it is a new quote
      const currentSeq = readStorage<number>(STORAGE_KEYS.QUOTE_COUNTER, 1);
      writeStorage(STORAGE_KEYS.QUOTE_COUNTER, currentSeq + 1);

      savedQuote = {
        ...quote,
        createdAt: quote.createdAt || now,
        updatedAt: now,
      };
      quotes.unshift(savedQuote);
    }

    writeStorage(STORAGE_KEYS.QUOTES, quotes);
    return savedQuote;
  },

  duplicateQuote(id: string): Quote | null {
    const original = this.getQuoteById(id);
    if (!original) return null;

    const entitlement = this.getEntitlement();
    const userIsPremium = isPremium(entitlement);
    const currentQuotes = this.getQuotes();

    if (!userIsPremium && currentQuotes.length >= FREE_QUOTES_LIMIT) {
      throw new Error(`Limite de ${FREE_QUOTES_LIMIT} devis atteinte dans la version Gratuite.`);
    }

    const newQuoteNum = this.getNextQuoteNumber();
    const now = new Date().toISOString();

    const duplicated: Quote = {
      ...original,
      id: generateId(),
      quoteNumber: newQuoteNum,
      createdAt: now,
      updatedAt: now,
      status: 'Brouillon',
      customer: {
        ...original.customer,
      },
      projectTitle: `${original.projectTitle} (Copie)`,
    };

    return this.saveQuote(duplicated);
  },

  deleteQuote(id: string): void {
    const quotes = this.getQuotes().filter((q) => q.id !== id);
    writeStorage(STORAGE_KEYS.QUOTES, quotes);
    const draftQuote = this.getDraftQuote();
    if (draftQuote && draftQuote.editingQuoteId === id) {
      this.clearDraftQuote();
    }
  },

  // Draft Quote (Persistence of quote being edited or composed)
  getDraftQuote(): DraftQuoteState | null {
    return readStorage<DraftQuoteState | null>(STORAGE_KEYS.DRAFT_QUOTE, null);
  },

  saveDraftQuote(draft: DraftQuoteState): void {
    writeStorage(STORAGE_KEYS.DRAFT_QUOTE, draft);
  },

  clearDraftQuote(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.DRAFT_QUOTE);
    }
  },

  // Draft Calculation (Persistence of ongoing work)
  getDraftCalculation(): CalculationInput | null {
    return readStorage<CalculationInput | null>(STORAGE_KEYS.DRAFT_CALCULATION, null);
  },

  saveDraftCalculation(input: CalculationInput): void {
    writeStorage(STORAGE_KEYS.DRAFT_CALCULATION, input);
  },

  clearDraftCalculation(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.DRAFT_CALCULATION);
    }
  },

  // Recent calculations
  getRecentCalculations(): RecentCalculation[] {
    return readStorage<RecentCalculation[]>(STORAGE_KEYS.RECENT_CALCULATIONS, []);
  },

  saveRecentCalculation(title: string, input: CalculationInput, result: CalculationResult): RecentCalculation {
    const list = this.getRecentCalculations();
    const item: RecentCalculation = {
      id: generateId(),
      title: title || 'Calcul sans titre',
      createdAt: new Date().toISOString(),
      input,
      result,
    };
    const updated = [item, ...list].slice(0, 10);
    writeStorage(STORAGE_KEYS.RECENT_CALCULATIONS, updated);
    return item;
  },

  // Entitlements & Licensing
  getEntitlement(): UserEntitlement {
    return readStorage<UserEntitlement>(STORAGE_KEYS.ENTITLEMENT, DEFAULT_ENTITLEMENT);
  },

  saveEntitlement(entitlement: UserEntitlement): void {
    writeStorage(STORAGE_KEYS.ENTITLEMENT, entitlement);
  },

  resetEntitlement(): void {
    writeStorage(STORAGE_KEYS.ENTITLEMENT, DEFAULT_ENTITLEMENT);
  },

  getDbSnapshot(): CurrentDbSnapshot {
    return {
      profile: this.getProfile(),
      quotes: this.getQuotes(),
      materials: this.getMaterials(),
      materialCategories: this.getMaterialCategories(),
      laborRates: this.getLaborRates(),
      templates: this.getTemplates(),
      templateCategories: this.getTemplateCategories(),
    };
  },

  applyDbSnapshot(snapshot: CurrentDbSnapshot): void {
    writeStorage(STORAGE_KEYS.PROFILE, snapshot.profile);
    writeStorage(STORAGE_KEYS.QUOTES, snapshot.quotes);
    writeStorage(STORAGE_KEYS.MATERIALS, snapshot.materials);
    writeStorage(STORAGE_KEYS.MATERIAL_CATEGORIES, snapshot.materialCategories);
    writeStorage(STORAGE_KEYS.LABOR_RATES, snapshot.laborRates);
    writeStorage(STORAGE_KEYS.TEMPLATES, snapshot.templates);
    writeStorage(STORAGE_KEYS.TEMPLATE_CATEGORIES, snapshot.templateCategories);
  },

  // Backup and Restore
  exportAllData(sections: BackupSectionsConfig = DEFAULT_BACKUP_SECTIONS): string {
    return buildExportJSON(sections, this.getDbSnapshot());
  },

  importAllData(
    jsonString: string,
    mode: 'restore' | 'merge' = 'restore'
  ): { success: boolean; message: string; quotesCount?: number; materialsCount?: number } {
    const parseRes = parseAndValidateBackupJSON(jsonString);
    if (parseRes.success === false) {
      return {
        success: false,
        message: parseRes.error,
      };
    }

    const currentSnapshot = this.getDbSnapshot();
    const importMode: ImportMode = mode === 'restore' ? 'replace' : 'merge';
    const selectedSections: BackupSectionsConfig = {
      quotes: parseRes.parsed.availableSections.quotes > 0,
      materials: parseRes.parsed.availableSections.materials > 0,
      customTemplates: parseRes.parsed.availableSections.customTemplates > 0,
      companyProfile: parseRes.parsed.availableSections.companyProfile,
      logo: parseRes.parsed.availableSections.logo,
      settings: parseRes.parsed.availableSections.settings,
    };

    const conflicts = detectConflicts(parseRes.parsed, selectedSections, currentSnapshot);
    const conflictResolutions: Record<string, 'keep_current' | 'use_imported' | 'import_as_new' | 'skip'> = {};
    conflicts.forEach((c) => {
      conflictResolutions[c.id] = c.resolution;
    });

    const execution = executeImport(
      parseRes.parsed,
      {
        mode: importMode,
        selectedSections,
        conflictResolutions,
      },
      currentSnapshot
    );

    if (execution.success) {
      this.applyDbSnapshot(execution.nextDbState);
      return {
        success: true,
        message: execution.message,
        quotesCount: execution.result.stats.quotesImported,
        materialsCount: execution.result.stats.materialsImported,
      };
    }

    return {
      success: false,
      message: execution.message,
    };
  },

  resetToFactoryDefaults(): void {
    writeStorage(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    writeStorage(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
    writeStorage(STORAGE_KEYS.MATERIAL_CATEGORIES, DEFAULT_MATERIAL_CATEGORIES);
    writeStorage(STORAGE_KEYS.LABOR_RATES, INITIAL_LABOR_RATES);
    writeStorage(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
    writeStorage(STORAGE_KEYS.TEMPLATE_CATEGORIES, DEFAULT_TEMPLATE_CATEGORIES);
    writeStorage(STORAGE_KEYS.QUOTES, []);
    writeStorage(STORAGE_KEYS.QUOTE_COUNTER, 1);
    writeStorage(STORAGE_KEYS.RECENT_CALCULATIONS, []);
    writeStorage(STORAGE_KEYS.ENTITLEMENT, DEFAULT_ENTITLEMENT);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.DRAFT_CALCULATION);
      localStorage.removeItem(STORAGE_KEYS.DRAFT_QUOTE);
    }
  },
};

// Standalone function exports for direct usage
export const getProfile = () => db.getProfile();
export const saveProfile = (profile: BusinessProfile) => db.saveProfile(profile);
export const getMaterials = () => db.getMaterials();
export const saveMaterial = (item: Omit<MaterialLibraryItem, 'id' | 'updatedAt'> & { id?: string }) => db.saveMaterial(item);
export const deleteMaterial = (id: string) => db.deleteMaterial(id);
export const getMaterialCategories = () => db.getMaterialCategories();
export const saveMaterialCategory = (cat: { id?: string; name: string; enabled?: boolean }) => db.saveMaterialCategory(cat);
export const renameMaterialCategory = (id: string, newName: string) => db.renameMaterialCategory(id, newName);
export const toggleMaterialCategoryEnabled = (id: string, enabled?: boolean) => db.toggleMaterialCategoryEnabled(id, enabled);
export const deleteMaterialCategory = (id: string, reassignToCategoryId: string) => db.deleteMaterialCategory(id, reassignToCategoryId);
export const getLaborRates = () => db.getLaborRates();
export const saveLaborRate = (item: Omit<LaborRateLibraryItem, 'id'> & { id?: string }) => db.saveLaborRate(item);
export const deleteLaborRate = (id: string) => db.deleteLaborRate(id);
export const getTemplates = () => db.getTemplates();
export const saveTemplate = (tpl: Omit<WorkshopTemplate, 'id'> & { id?: string }) => db.saveTemplate(tpl);
export const deleteTemplate = (id: string) => db.deleteTemplate(id);
export const getTemplateCategories = () => db.getTemplateCategories();
export const saveTemplateCategory = (cat: { id?: string; name: string; enabled?: boolean }) => db.saveTemplateCategory(cat);
export const renameTemplateCategory = (id: string, newName: string) => db.renameTemplateCategory(id, newName);
export const toggleTemplateCategoryEnabled = (id: string, enabled?: boolean) => db.toggleTemplateCategoryEnabled(id, enabled);
export const deleteTemplateCategory = (id: string, reassignToCategoryId: string) => db.deleteTemplateCategory(id, reassignToCategoryId);
export const getQuotes = () => db.getQuotes();
export const getQuoteById = (id: string) => db.getQuoteById(id);
export const getNextQuoteNumber = () => db.getNextQuoteNumber();
export const saveQuote = (quote: Quote) => db.saveQuote(quote);
export const duplicateQuote = (id: string) => db.duplicateQuote(id);
export const deleteQuote = (id: string) => db.deleteQuote(id);
export const getDraftCalculation = () => db.getDraftCalculation();
export const saveDraftCalculation = (input: CalculationInput) => db.saveDraftCalculation(input);
export const clearDraftCalculation = () => db.clearDraftCalculation();
export const getDraftQuote = () => db.getDraftQuote();
export const saveDraftQuote = (draft: DraftQuoteState) => db.saveDraftQuote(draft);
export const clearDraftQuote = () => db.clearDraftQuote();
export const getRecentCalculations = () => db.getRecentCalculations();
export const saveRecentCalculation = (title: string, input: CalculationInput, result: CalculationResult) => db.saveRecentCalculation(title, input, result);
export const getEntitlement = () => db.getEntitlement();
export const saveEntitlement = (entitlement: UserEntitlement) => db.saveEntitlement(entitlement);
export const resetEntitlement = () => db.resetEntitlement();
export const getDbSnapshot = (): CurrentDbSnapshot => db.getDbSnapshot();
export const applyDbSnapshot = (snapshot: CurrentDbSnapshot) => db.applyDbSnapshot(snapshot);
export const exportDatabaseJSON = (sections?: BackupSectionsConfig) => db.exportAllData(sections);
export const importDatabaseJSON = (jsonString: string, mode: 'restore' | 'merge' = 'restore') => db.importAllData(jsonString, mode);
export const resetToFactoryDefaults = () => db.resetToFactoryDefaults();

export const hasCompletedOnboarding = (): boolean => {
  try {
    return localStorage.getItem('atelier_devis_has_completed_onboarding') === 'true';
  } catch {
    return false;
  }
};

export const setOnboardingCompleted = (completed: boolean = true): void => {
  try {
    if (completed) {
      localStorage.setItem('atelier_devis_has_completed_onboarding', 'true');
    } else {
      localStorage.removeItem('atelier_devis_has_completed_onboarding');
    }
  } catch {
    // Graceful storage fallback
  }
};

export * from './backupEngine';

// Helper to determine whether a material is a predefined system material
const INITIAL_MATERIAL_IDS = new Set(INITIAL_MATERIALS.map((m) => m.id));
export const isSystemMaterial = (item: MaterialLibraryItem): boolean => {
  if (item.isCustom === true) return false;
  if (item.isCustom === false) return true;
  return INITIAL_MATERIAL_IDS.has(item.id) || /^mat-[0-9]+$/.test(item.id);
};


