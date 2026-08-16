import {
  AppBackupData,
  BusinessProfile,
  CalculationInput,
  CalculationResult,
  LaborRateLibraryItem,
  MaterialLibraryItem,
  Quote,
  RecentCalculation,
  UserEntitlement,
  WorkshopTemplate,
} from '../types';
import { generateId, formatQuoteNumber } from '../utils/formatters';
import { createDefaultFreeEntitlement } from '../licensing/licenseVerifier';

const STORAGE_KEYS = {
  PROFILE: 'atelier_devis_profile',
  MATERIALS: 'atelier_devis_materials',
  LABOR_RATES: 'atelier_devis_labor_rates',
  TEMPLATES: 'atelier_devis_templates',
  QUOTES: 'atelier_devis_quotes',
  QUOTE_COUNTER: 'atelier_devis_quote_seq',
  RECENT_CALCULATIONS: 'atelier_devis_recent_calcs',
  ENTITLEMENT: 'atelier_devis_entitlement',
};

export const DEFAULT_ENTITLEMENT: UserEntitlement = createDefaultFreeEntitlement();

export const DEFAULT_PROFILE: BusinessProfile = {
  name: 'Atelier Métal & Forge',
  tagline: 'Fabrication métallique & Ouvrages sur mesure',
  phone: '+221 77 000 00 00',
  whatsapp: '+221 77 000 00 00',
  email: 'contact@ateliermetal.com',
  address: 'Zone Industrielle / Rue des Artisans',
  city: 'Dakar',
  country: 'Sénégal',
  taxId: 'RC/SN-2024-B-0000',
  defaultCurrency: 'XOF',
  currencySymbol: 'FCFA',
  defaultMarginPercent: 25,
  defaultWastePercent: 5,
  defaultLaborRate: 2500,
  defaultRounding: 'none',
  defaultValidityDays: 30,
  defaultPaymentTerms: 'Acompte de 40% à la commande, solde à la livraison ou fin de pose.',
  footerNotes: 'Garantie de 1 an sur soudures et structures. Devis valable 30 jours.',
};

export const INITIAL_MATERIALS: MaterialLibraryItem[] = [
  {
    id: 'mat-1',
    name: 'Tube carré 40×40 (ép. 1.5mm)',
    category: 'Tubes & Profilés',
    unit: 'm',
    defaultUnitPrice: 2000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-2',
    name: 'Tube carré 30×30 (ép. 1.5mm)',
    category: 'Tubes & Profilés',
    unit: 'm',
    defaultUnitPrice: 1500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-3',
    name: 'Tube rectangulaire 60×40',
    category: 'Tubes & Profilés',
    unit: 'm',
    defaultUnitPrice: 2800,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-4',
    name: 'Tôle plane noire 2mm',
    category: 'Tôles & Fers',
    unit: 'm2',
    defaultUnitPrice: 5000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-5',
    name: 'Tôle striée 3mm antidérapante',
    category: 'Tôles & Fers',
    unit: 'm2',
    defaultUnitPrice: 8500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-6',
    name: 'Fer cornière 30×30 (ép. 3mm)',
    category: 'Tôles & Fers',
    unit: 'm',
    defaultUnitPrice: 1100,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-7',
    name: 'Fer plat 30×4',
    category: 'Tôles & Fers',
    unit: 'm',
    defaultUnitPrice: 800,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-8',
    name: 'Fer rond plein Ø12',
    category: 'Tôles & Fers',
    unit: 'm',
    defaultUnitPrice: 1200,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-9',
    name: 'Électrodes de soudure (Boîte 2.5kg)',
    category: 'Soudure & Consommables',
    unit: 'paquet',
    defaultUnitPrice: 4500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-10',
    name: 'Disque à ébarber/tronçonner Ø115',
    category: 'Soudure & Consommables',
    unit: 'piece',
    defaultUnitPrice: 1000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-11',
    name: 'Peinture antirouille & Finition (1L)',
    category: 'Peinture & Finition',
    unit: 'l',
    defaultUnitPrice: 4500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-12',
    name: 'Diluant cellulosique (1L)',
    category: 'Peinture & Finition',
    unit: 'l',
    defaultUnitPrice: 2000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-13',
    name: 'Paumelles soudables 100mm (paire)',
    category: 'Quincaillerie & Accessoires',
    unit: 'piece',
    defaultUnitPrice: 1500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-14',
    name: 'Serrure à canon pour tube métallique',
    category: 'Quincaillerie & Accessoires',
    unit: 'piece',
    defaultUnitPrice: 8500,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-15',
    name: 'Planche bois massif Iroko / Teck',
    category: 'Bois & Menuiserie',
    unit: 'm',
    defaultUnitPrice: 6000,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mat-16',
    name: 'Profilé aluminium tubulaire',
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
    category: 'metal',
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
  },
  {
    id: 'tpl-2',
    name: 'Grille de défense fenêtre (1.2m × 1.2m)',
    category: 'metal',
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
  },
  {
    id: 'tpl-3',
    name: 'Portail coulissant motorisable (3.5m × 2m)',
    category: 'metal',
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
  },
  {
    id: 'tpl-4',
    name: 'Table basse design industriel (1.2m × 0.6m)',
    category: 'bois',
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
  },
  {
    id: 'tpl-5',
    name: 'Garde-corps Inox 304 & Câbles tendus (4m linéaire)',
    category: 'metal',
    isPremiumOnly: true,
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
  },
  {
    id: 'tpl-6',
    name: 'Pergola bioclimatique acier & Lames brise-soleil (4m × 3m)',
    category: 'metal',
    isPremiumOnly: true,
    description: 'Poteaux 100×100, poutres périphériques 120×60 et tablier de lames inclinées sur mesure.',
    defaultMaterials: [
      { name: 'Tube carré 100×100 (ép. 3mm)', quantity: 12, unit: 'm', unitPrice: 8500 },
      { name: 'Tube rectangulaire 120×60', quantity: 14, unit: 'm', unitPrice: 6500 },
      { name: 'Fer plat ou profil ailettes brise-soleil', quantity: 48, unit: 'm', unitPrice: 2200 },
      { name: 'Platines d\'ancrage 250×250 (ép. 8mm)', quantity: 4, unit: 'piece', unitPrice: 9000 },
      { name: 'Peinture époxy thermolaquée ou polyuréthane', quantity: 4, unit: 'l', unitPrice: 7500 },
    ],
    defaultLabor: [
      { task: 'Découpe & Soudure métallique', hours: 20, hourlyRate: 3000 },
      { task: 'Assemblage & Ajustage', hours: 8, hourlyRate: 2500 },
      { task: 'Pose & Installation sur chantier', hours: 10, hourlyRate: 3500 },
    ],
    defaultOtherCosts: [
      { description: 'Transport et levage chantier', amount: 25000, category: 'transport' },
      { description: 'Scellement chimique & Visserie inox', amount: 15000, category: 'consommable' },
    ],
    wastePercent: 6,
    targetMarginPercent: 30,
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
    return readStorage<BusinessProfile>(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
  },

  saveProfile(profile: BusinessProfile): void {
    writeStorage(STORAGE_KEYS.PROFILE, profile);
  },

  // Materials library
  getMaterials(): MaterialLibraryItem[] {
    const stored = readStorage<MaterialLibraryItem[]>(STORAGE_KEYS.MATERIALS, []);
    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
      return INITIAL_MATERIALS;
    }
    return stored;
  },

  saveMaterial(item: Omit<MaterialLibraryItem, 'id' | 'updatedAt'> & { id?: string }): MaterialLibraryItem {
    const materials = this.getMaterials();
    const existingIndex = item.id ? materials.findIndex((m) => m.id === item.id) : -1;
    const now = new Date().toISOString();

    if (existingIndex >= 0 && item.id) {
      const updated: MaterialLibraryItem = {
        ...materials[existingIndex],
        ...item,
        id: item.id,
        updatedAt: now,
      };
      materials[existingIndex] = updated;
      writeStorage(STORAGE_KEYS.MATERIALS, materials);
      return updated;
    } else {
      const newItem: MaterialLibraryItem = {
        id: generateId(),
        name: item.name,
        category: item.category || 'Général',
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

  // Templates
  getTemplates(): WorkshopTemplate[] {
    const stored = readStorage<WorkshopTemplate[]>(STORAGE_KEYS.TEMPLATES, []);
    if (!stored || stored.length === 0) {
      writeStorage(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
      return INITIAL_TEMPLATES;
    }
    return stored;
  },

  saveTemplate(tpl: Omit<WorkshopTemplate, 'id'> & { id?: string }): WorkshopTemplate {
    const list = this.getTemplates();
    const existingIndex = tpl.id ? list.findIndex((t) => t.id === tpl.id) : -1;

    if (existingIndex >= 0 && tpl.id) {
      const updated: WorkshopTemplate = {
        ...list[existingIndex],
        ...tpl,
        id: tpl.id,
      };
      list[existingIndex] = updated;
      writeStorage(STORAGE_KEYS.TEMPLATES, list);
      return updated;
    } else {
      const newTpl: WorkshopTemplate = {
        ...tpl,
        id: generateId(),
      };
      list.unshift(newTpl);
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

    let savedQuote: Quote;
    if (existingIndex >= 0) {
      savedQuote = {
        ...quote,
        updatedAt: now,
      };
      quotes[existingIndex] = savedQuote;
    } else {
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

  // Backup and Restore
  exportAllData(): string {
    const backup: AppBackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      businessProfile: this.getProfile(),
      materialsLibrary: this.getMaterials(),
      laborRatesLibrary: this.getLaborRates(),
      quotes: this.getQuotes(),
      templates: this.getTemplates(),
      entitlement: this.getEntitlement(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importAllData(jsonString: string): { success: boolean; message: string; quotesCount?: number } {
    try {
      const data = JSON.parse(jsonString) as Partial<AppBackupData>;
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Format de fichier JSON invalide.' };
      }

      if (data.businessProfile) {
        writeStorage(STORAGE_KEYS.PROFILE, data.businessProfile);
      }
      if (Array.isArray(data.materialsLibrary)) {
        writeStorage(STORAGE_KEYS.MATERIALS, data.materialsLibrary);
      }
      if (Array.isArray(data.laborRatesLibrary)) {
        writeStorage(STORAGE_KEYS.LABOR_RATES, data.laborRatesLibrary);
      }
      if (Array.isArray(data.templates)) {
        writeStorage(STORAGE_KEYS.TEMPLATES, data.templates);
      }
      if (Array.isArray(data.quotes)) {
        writeStorage(STORAGE_KEYS.QUOTES, data.quotes);
      }
      if (data.entitlement) {
        writeStorage(STORAGE_KEYS.ENTITLEMENT, data.entitlement);
      }

      return {
        success: true,
        message: 'Sauvegarde restaurée avec succès !',
        quotesCount: data.quotes?.length || 0,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      return { success: false, message: `Échec de l'importation : ${errMsg}` };
    }
  },

  resetToFactoryDefaults(): void {
    writeStorage(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE);
    writeStorage(STORAGE_KEYS.MATERIALS, INITIAL_MATERIALS);
    writeStorage(STORAGE_KEYS.LABOR_RATES, INITIAL_LABOR_RATES);
    writeStorage(STORAGE_KEYS.TEMPLATES, INITIAL_TEMPLATES);
    writeStorage(STORAGE_KEYS.QUOTES, []);
    writeStorage(STORAGE_KEYS.QUOTE_COUNTER, 1);
    writeStorage(STORAGE_KEYS.RECENT_CALCULATIONS, []);
    writeStorage(STORAGE_KEYS.ENTITLEMENT, DEFAULT_ENTITLEMENT);
  },
};

// Standalone function exports for direct usage
export const getProfile = () => db.getProfile();
export const saveProfile = (profile: BusinessProfile) => db.saveProfile(profile);
export const getMaterials = () => db.getMaterials();
export const saveMaterial = (item: Omit<MaterialLibraryItem, 'id' | 'updatedAt'> & { id?: string }) => db.saveMaterial(item);
export const deleteMaterial = (id: string) => db.deleteMaterial(id);
export const getLaborRates = () => db.getLaborRates();
export const saveLaborRate = (item: Omit<LaborRateLibraryItem, 'id'> & { id?: string }) => db.saveLaborRate(item);
export const deleteLaborRate = (id: string) => db.deleteLaborRate(id);
export const getTemplates = () => db.getTemplates();
export const saveTemplate = (tpl: Omit<WorkshopTemplate, 'id'> & { id?: string }) => db.saveTemplate(tpl);
export const deleteTemplate = (id: string) => db.deleteTemplate(id);
export const getQuotes = () => db.getQuotes();
export const getQuoteById = (id: string) => db.getQuoteById(id);
export const getNextQuoteNumber = () => db.getNextQuoteNumber();
export const saveQuote = (quote: Quote) => db.saveQuote(quote);
export const duplicateQuote = (id: string) => db.duplicateQuote(id);
export const deleteQuote = (id: string) => db.deleteQuote(id);
export const getRecentCalculations = () => db.getRecentCalculations();
export const saveRecentCalculation = (title: string, input: CalculationInput, result: CalculationResult) => db.saveRecentCalculation(title, input, result);
export const getEntitlement = () => db.getEntitlement();
export const saveEntitlement = (entitlement: UserEntitlement) => db.saveEntitlement(entitlement);
export const resetEntitlement = () => db.resetEntitlement();
export const exportDatabaseJSON = () => db.exportAllData();
export const importDatabaseJSON = (jsonString: string) => db.importAllData(jsonString);
export const resetToFactoryDefaults = () => db.resetToFactoryDefaults();


