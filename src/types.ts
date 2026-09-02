export * from './licensing/types';
import { UserEntitlement } from './licensing/types';

export type AppTab =
  | 'home'
  | 'calculator'
  | 'quotes'
  | 'quote-builder'
  | 'materials'
  | 'templates'
  | 'settings';


export type ActiveTab = AppTab;

export interface RecentCalculation {
  id: string;
  title: string;
  createdAt: string;
  input: CalculationInput;
  result: CalculationResult;
}

export type Currency = 'XOF' | 'EUR' | 'USD' | 'CAD';

export type MaterialUnit =
  | 'piece'
  | 'm'
  | 'm2'
  | 'm3'
  | 'kg'
  | 'l'
  | 'barre'
  | 'feuille'
  | 'paquet'
  | 'heure'
  | 'custom';

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unit: MaterialUnit | string;
  unitPrice: number;
  category?: string;
  notes?: string;
}

export interface LaborItem {
  id: string;
  task: string;
  hours: number;
  hourlyRate: number;
}

export interface OtherCostItem {
  id: string;
  description: string;
  amount: number;
  category?: 'transport' | 'electricite' | 'sous_traitance' | 'consommable' | 'autre';
}

export type PricingMode = 'margin' | 'markup';

export type RoundingStep = 'none' | '100' | '500' | '1000' | '5000';

export type OverheadType = 'percent' | 'fixed';

export interface CalculationInput {
  materials: MaterialItem[];
  wastePercent: number; // e.g. 5 for 5%
  labor: LaborItem[];
  otherCosts: OtherCostItem[];
  overheadType: OverheadType;
  overheadValue: number; // percent or fixed FCFA
  pricingMode: PricingMode;
  targetProfitPercent: number; // e.g. 25 for 25% margin or markup
  roundingStep: RoundingStep;
  templateId?: string;
}

export interface CalculationResult {
  rawMaterialCost: number;
  wasteAmount: number;
  adjustedMaterialCost: number;
  laborCost: number;
  otherCostsTotal: number;
  directCost: number;
  overheadCost: number;
  totalCost: number; // Coût de revient total
  rawSellingPrice: number;
  roundedSellingPrice: number;
  profitAmount: number;
  effectiveMarginPercent: number; // (Profit / Selling Price) * 100
  effectiveMarkupPercent: number; // (Profit / Total Cost) * 100
  isValid: boolean;
  errors: string[];
}

export type QuoteStatus = 'Brouillon' | 'Envoyé' | 'Accepté' | 'Refusé' | 'Terminé';

export type ClientDetailLevel = 'detailed' | 'grouped' | 'total_only';

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  itemType?: 'material' | 'labor' | 'service' | 'other';
}

export interface DepositConfig {
  type: 'percent' | 'fixed';
  value: number; // e.g. 40 for 40% or 50000 for 50 000 FCFA
}

export interface DraftQuoteState {
  editingQuoteId?: string;
  quoteNumber: string;
  createdAt: string;
  validUntil: string;
  status: QuoteStatus;
  customer: CustomerInfo;
  projectTitle: string;
  projectDescription?: string;
  detailLevel: ClientDetailLevel;
  lineItems: QuoteLineItem[];
  discountPercent: number;
  depositConfig: DepositConfig;
  paymentTerms: string;
  notes: string;
  calculationInput?: CalculationInput;
  calculationResult?: CalculationResult;
  updatedAt?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
}

export type LogoMaskShape = 'original' | 'square' | 'circle' | 'rounded';
export type LogoBgColor = 'transparent' | 'white' | 'dark';

export interface LogoEditSettings {
  maskShape: LogoMaskShape;
  zoom: number;
  offsetX: number;
  offsetY: number;
  bgColor?: LogoBgColor;
}

export const DEFAULT_LOGO_EDIT_SETTINGS: LogoEditSettings = {
  maskShape: 'original',
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  bgColor: 'transparent',
};

export interface BusinessProfile {
  name: string;
  tagline?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  taxId?: string; // NIF / RCCM / SIRET
  logoUrl?: string; // Rendered / Processed Data URL (for PDF, print, display)
  logoOriginalUrl?: string; // Original uploaded raw image Data URL (non-destructive master source)
  logoEditSettings?: LogoEditSettings; // Applied crop / mask / zoom / pan parameters
  defaultCurrency: Currency;
  currencySymbol: string; // 'FCFA'
  defaultMarginPercent: number;
  defaultWastePercent: number;
  defaultLaborRate: number;
  defaultRounding: RoundingStep;
  defaultPaymentTerms?: string;
  defaultValidityDays: number;
  footerNotes?: string;
  // Four independent system data visibility settings
  showSystemTemplates?: boolean;
  showPredefinedTemplates?: boolean; // Backward compatibility alias
  showSystemTemplateCategories?: boolean;
  showPredefinedTemplateCategories?: boolean; // Backward compatibility alias
  showSystemMaterials?: boolean;
  showPredefinedMaterials?: boolean; // Backward compatibility alias
  showSystemMaterialCategories?: boolean;
  showPredefinedMaterialCategories?: boolean; // Backward compatibility alias
}

export interface Quote {
  id: string;
  quoteNumber: string;
  createdAt: string;
  updatedAt: string;
  validUntil: string;
  status: QuoteStatus;
  
  // Client
  customer: CustomerInfo;
  
  // Project
  projectTitle: string;
  projectDescription?: string;
  
  // Calculation details backing this quote
  calculationInput: CalculationInput;
  calculationResult: CalculationResult;
  
  // Customer-facing items
  detailLevel: ClientDetailLevel;
  lineItems: QuoteLineItem[];
  
  // Financials
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  finalTotal: number;
  depositConfig: DepositConfig;
  depositAmount: number;
  balanceAmount: number;
  
  notes?: string;
  paymentTerms?: string;
}

export interface TemplateCategory {
  id: string;
  name: string;
  isDefault: boolean;
  enabled?: boolean;
}

export interface MaterialCategory {
  id: string;
  name: string;
  isDefault: boolean;
  enabled?: boolean;
}

export interface MaterialLibraryItem {
  id: string;
  name: string;
  categoryId?: string; // Stable category identifier
  category: string; // Category display name (backward compatible)
  unit: MaterialUnit | string;
  defaultUnitPrice: number;
  isCustom?: boolean;
  updatedAt: string;
}

export interface LaborRateLibraryItem {
  id: string;
  task: string;
  defaultRate: number;
  description?: string;
}

export interface WorkshopTemplate {
  id: string;
  name: string;
  categoryId: string; // Stable category identifier
  category?: string; // Legacy compatibility alias
  description: string;
  icon?: string;
  isPremiumOnly?: boolean;
  isCustom?: boolean;
  defaultMaterials: Array<Omit<MaterialItem, 'id'>>;
  defaultLabor: Array<Omit<LaborItem, 'id'>>;
  defaultOtherCosts: Array<Omit<OtherCostItem, 'id'>>;
  wastePercent: number;
  targetMarginPercent: number;
  overheadType?: OverheadType;
  overheadValue?: number;
  pricingMode?: PricingMode;
  roundingStep?: RoundingStep;
  createdAt?: string;
  updatedAt?: string;
  _sessionTimestamp?: number;
}

export interface BackupSectionsConfig {
  quotes: boolean;
  materials: boolean;
  customTemplates: boolean;
  companyProfile: boolean;
  logo: boolean;
  settings: boolean;
}

export interface AppSettingsPayload {
  defaultCurrency: Currency;
  currencySymbol: string;
  defaultMarginPercent: number;
  defaultWastePercent: number;
  defaultLaborRate: number;
  defaultRounding: RoundingStep;
  defaultPaymentTerms?: string;
  defaultValidityDays: number;
  footerNotes?: string;
  showSystemTemplates?: boolean;
  showPredefinedTemplates?: boolean;
  showSystemTemplateCategories?: boolean;
  showPredefinedTemplateCategories?: boolean;
  showSystemMaterials?: boolean;
  showPredefinedMaterials?: boolean;
  showSystemMaterialCategories?: boolean;
  showPredefinedMaterialCategories?: boolean;
  laborRatesLibrary?: LaborRateLibraryItem[];
}

export interface AppBackupDataV2 {
  version: 2;
  app: 'AtelierDevis';
  exportedAt: string;
  sections: BackupSectionsConfig;
  data: {
    quotes?: Quote[];
    materialsLibrary?: MaterialLibraryItem[];
    materialCategories?: MaterialCategory[];
    laborRatesLibrary?: LaborRateLibraryItem[];
    customTemplates?: WorkshopTemplate[];
    templateCategories?: TemplateCategory[];
    companyProfile?: Partial<Omit<BusinessProfile, 'logoUrl' | 'logoOriginalUrl' | 'logoEditSettings'>>;
    logo?: string;
    logoOriginal?: string;
    logoEditSettings?: LogoEditSettings;
    settings?: Partial<AppSettingsPayload>;
    entitlement?: UserEntitlement;
  };
}

export type BackupFormatType = 'v2_structured' | 'v1_legacy' | 'partial_unversioned';

export interface BackupParsedContent {
  format: BackupFormatType;
  version: number;
  exportedAt?: string;
  quotes: Quote[];
  materials: MaterialLibraryItem[];
  materialCategories: MaterialCategory[];
  laborRates: LaborRateLibraryItem[];
  customTemplates: WorkshopTemplate[];
  allTemplates: WorkshopTemplate[];
  templateCategories: TemplateCategory[];
  companyProfile?: Partial<BusinessProfile>;
  logo?: string;
  logoOriginal?: string;
  logoEditSettings?: LogoEditSettings;
  settings?: Partial<AppSettingsPayload>;
  availableSections: {
    quotes: number;
    materials: number;
    customTemplates: number;
    companyProfile: boolean;
    logo: boolean;
    settings: boolean;
  };
}

export type ParseBackupResult =
  | { success: true; parsed: BackupParsedContent; error?: never }
  | { success: false; error: string; parsed?: never };

export type ConflictType = 'material' | 'template' | 'quote' | 'laborRate';

export type ImportConflictResolution = 'keep_current' | 'use_imported' | 'import_as_new' | 'skip';

export interface ImportConflictItem {
  id: string;
  type: ConflictType;
  title: string;
  description: string;
  currentDisplay: string;
  importedDisplay: string;
  currentItem: unknown;
  importedItem: unknown;
  resolution: ImportConflictResolution;
}

export type ImportMode = 'replace' | 'merge';

export interface ImportExecutionOptions {
  mode: ImportMode;
  selectedSections: BackupSectionsConfig;
  conflictResolutions: Record<string, ImportConflictResolution>;
}

export interface ImportExecutionResult {
  success: boolean;
  message: string;
  stats: {
    quotesImported: number;
    materialsImported: number;
    templatesImported: number;
    profileUpdated: boolean;
    logoUpdated: boolean;
    settingsUpdated: boolean;
    conflictsResolved: number;
  };
}

export interface AppBackupData {
  version: number;
  exportedAt: string;
  businessProfile: BusinessProfile;
  materialsLibrary: MaterialLibraryItem[];
  laborRatesLibrary: LaborRateLibraryItem[];
  quotes: Quote[];
  templates: WorkshopTemplate[];
  templateCategories?: TemplateCategory[];
  materialCategories?: MaterialCategory[];
  entitlement?: UserEntitlement;
}

// Re-export licensing types for convenience
export * from './licensing/types';

