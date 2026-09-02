import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  HelpCircle,
  FileText,
  BookmarkCheck,
  BookmarkPlus,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Percent,
  Coins,
  ArrowRight,
  CheckCircle,
  Check,
  ArrowLeft,
  RotateCcw,
  X,
  AlertTriangle,
  Crown,
  Lock,
} from 'lucide-react';
import {
  CalculationInput,
  CalculationResult,
  LaborItem,
  MaterialItem,
  MaterialLibraryItem,
  LaborRateLibraryItem,
  OtherCostItem,
  OverheadType,
  PricingMode,
  RoundingStep,
  WorkshopTemplate,
  TemplateCategory,
  BusinessProfile,
  Quote,
  UserEntitlement,
} from '../types';
import { calculateQuote, sanitizeNumber } from '../engine/calculator';
import { formatCurrency, formatPercent, generateId } from '../utils/formatters';
import { isPremium } from '../licensing/features';
import { PremiumGateModal } from './licensing/PremiumGateModal';
import { CalculationBreakdownModal } from './CalculationBreakdownModal';
import { NumberStepper } from './NumberStepper';
import { NumericInput } from './NumericInput';
import { getDraftCalculation, saveDraftCalculation, clearDraftCalculation, clearDraftQuote, isSystemMaterial } from '../storage/db';
import { useNotification } from '../context/NotificationContext';
import { focusAndScrollToField } from '../utils/formValidation';

interface Props {
  profile: BusinessProfile;
  materialsLibrary?: MaterialLibraryItem[];
  materialLibrary?: MaterialLibraryItem[];
  laborRatesLibrary?: LaborRateLibraryItem[];
  laborLibrary?: LaborRateLibraryItem[];
  templates?: WorkshopTemplate[];
  categories?: TemplateCategory[];
  initialCalculation?: CalculationInput;
  initialTemplate?: WorkshopTemplate | null;
  templateCreationContext?: {
    name: string;
    categoryId: string;
    description?: string;
  } | null;
  onCancelTemplateCreation?: () => void;
  onFinishTemplateCreation?: () => void;
  onConsumeTemplate?: () => void;
  editingQuote?: Quote | null;
  onConvertToQuote?: (input: CalculationInput, result: CalculationResult) => void;
  onGenerateQuote?: (input: CalculationInput, result: CalculationResult) => void;
  onUpdateQuoteCalculation?: (input: CalculationInput, result: CalculationResult, quote: Quote) => void;
  onCancelEditQuote?: () => void;
  onOpenTemplates?: () => void;
  onSaveCalculation?: (title: string, input: CalculationInput, result: CalculationResult) => void;
  onResetToNew?: () => void;
  onSaveTemplate?: (template: Omit<WorkshopTemplate, 'id'> & { id?: string }) => void;
  entitlement?: UserEntitlement;
  onOpenPremiumModal?: () => void;
}

const COMMON_UNITS = [
  { value: 'm', label: 'Mètre (m)' },
  { value: 'piece', label: 'Pièce (pce)' },
  { value: 'm2', label: 'Mètre carré (m²)' },
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'l', label: 'Litre (L)' },
  { value: 'barre', label: 'Barre (6m)' },
  { value: 'feuille', label: 'Feuille / Tôle' },
  { value: 'paquet', label: 'Paquet / Boîte' },
  { value: 'heure', label: 'Heure' },
  { value: 'm3', label: 'Mètre cube (m³)' },
];

export function QuickCalculator({
  profile,
  materialsLibrary,
  materialLibrary,
  laborRatesLibrary,
  laborLibrary,
  templates = [],
  categories = [],
  initialCalculation,
  initialTemplate,
  templateCreationContext,
  onCancelTemplateCreation,
  onFinishTemplateCreation,
  onConsumeTemplate,
  editingQuote,
  onConvertToQuote,
  onGenerateQuote,
  onUpdateQuoteCalculation,
  onCancelEditQuote,
  onOpenTemplates,
  onSaveCalculation,
  onResetToNew,
  onSaveTemplate,
  entitlement,
  onOpenPremiumModal,
}: Props) {
  const rawMaterials = materialsLibrary || materialLibrary || [];
  const allLaborRates = laborRatesLibrary || laborLibrary || [];
  const handleQuoteClick = onGenerateQuote || onConvertToQuote;
  const currency = profile.currencySymbol || 'FCFA';

  const showSysTemplates =
    profile.showSystemTemplates !== false && profile.showPredefinedTemplates !== false;
  const showSysMaterials =
    profile.showSystemMaterials !== false && profile.showPredefinedMaterials !== false;

  const allMaterials = useMemo(() => {
    if (!showSysMaterials) {
      return rawMaterials.filter((m) => !isSystemMaterial(m));
    }
    return rawMaterials;
  }, [rawMaterials, showSysMaterials]);

  // Helper creators for empty editable initial rows
  const createEmptyMaterialRow = (): MaterialItem => ({
    id: generateId(),
    name: '',
    quantity: 0,
    unit: 'piece',
    unitPrice: 0,
  });

  const createEmptyLaborRow = (): LaborItem => ({
    id: generateId(),
    task: '',
    hours: 0,
    hourlyRate: 0,
  });

  const createEmptyOtherCostRow = (): OtherCostItem => ({
    id: generateId(),
    description: '',
    amount: 0,
    category: 'autre',
  });

  // Strict Restoration Priority:
  // Priority 1: initialCalculation (explicit source calculation passed as prop)
  // Priority 2: editingQuote?.calculationInput
  // Priority 3: stored calculation draft from getDraftCalculation()
  // Priority 4: if initialTemplate was explicitly loaded (draft cleared)
  const draft = useMemo(() => {
    if (initialCalculation) return initialCalculation;
    if (editingQuote?.calculationInput) return editingQuote.calculationInput;
    const stored = getDraftCalculation();
    if (stored) return stored;
    if (initialTemplate) {
      return {
        materials: initialTemplate.defaultMaterials.map((m) => ({ ...m, id: generateId() })),
        wastePercent: initialTemplate.wastePercent ?? profile.defaultWastePercent ?? 5,
        labor: initialTemplate.defaultLabor.map((l) => ({ ...l, id: generateId() })),
        otherCosts: initialTemplate.defaultOtherCosts.map((o) => ({ ...o, id: generateId() })),
        overheadType: initialTemplate.overheadType || 'percent',
        overheadValue: initialTemplate.overheadValue !== undefined ? initialTemplate.overheadValue : 0,
        pricingMode: initialTemplate.pricingMode || 'margin',
        targetProfitPercent: initialTemplate.targetMarginPercent ?? profile.defaultMarginPercent ?? 25,
        roundingStep: initialTemplate.roundingStep || profile.defaultRounding || 'none',
        templateId: initialTemplate.id,
      };
    }
    return null;
  }, [initialCalculation, editingQuote, initialTemplate, profile]);

  // State initialization from draft or pre-seeded empty editable rows for blank calculations
  const [materials, setMaterials] = useState<MaterialItem[]>(() => {
    if (draft?.materials && draft.materials.length > 0) return draft.materials;
    return [createEmptyMaterialRow()];
  });

  const [wastePercent, setWastePercent] = useState<number>(() => {
    if (draft?.wastePercent !== undefined) return draft.wastePercent;
    return profile.defaultWastePercent ?? 5;
  });

  const [labor, setLabor] = useState<LaborItem[]>(() => {
    if (draft?.labor && draft.labor.length > 0) return draft.labor;
    return [createEmptyLaborRow()];
  });

  const [otherCosts, setOtherCosts] = useState<OtherCostItem[]>(() => {
    if (draft?.otherCosts && draft.otherCosts.length > 0) return draft.otherCosts;
    return [createEmptyOtherCostRow()];
  });

  const [overheadType, setOverheadType] = useState<OverheadType>(
    draft?.overheadType || 'percent'
  );
  const [overheadValue, setOverheadValue] = useState<number>(
    draft?.overheadValue !== undefined ? draft.overheadValue : 0
  );

  const [pricingMode, setPricingMode] = useState<PricingMode>(
    draft?.pricingMode || 'margin'
  );
  const [targetProfitPercent, setTargetProfitPercent] = useState<number>(
    draft?.targetProfitPercent ?? profile.defaultMarginPercent ?? 25
  );

  const [roundingStep, setRoundingStep] = useState<RoundingStep>(
    draft?.roundingStep ?? profile.defaultRounding ?? 'none'
  );

  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showReloadTemplateModal, setShowReloadTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    () => draft?.templateId || initialTemplate?.id || ''
  );

  // Global notification system
  const { showSuccess, showInfo, showError, showWarning } = useNotification();

  // Reset to fresh blank calculation when templateCreationContext is active
  useEffect(() => {
    if (templateCreationContext) {
      setMaterials([createEmptyMaterialRow()]);
      setLabor([createEmptyLaborRow()]);
      setOtherCosts([createEmptyOtherCostRow()]);
      setWastePercent(profile.defaultWastePercent ?? 5);
      setTargetProfitPercent(profile.defaultMarginPercent ?? 25);
      setOverheadValue(0);
      setOverheadType('percent');
      setPricingMode('margin');
      setRoundingStep(profile.defaultRounding || 'none');
      setSelectedTemplateId('');
    }
  }, [templateCreationContext, profile]);

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Alphabetically sorted template groups for the quick loader dropdown
  const customTemplatesSorted = useMemo(() => {
    return templates
      .filter((t) => t.isCustom)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base', numeric: true }));
  }, [templates]);

  const premiumTemplatesSorted = useMemo(() => {
    return templates
      .filter((t) => t.isPremiumOnly)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base', numeric: true }));
  }, [templates]);

  const freeTemplatesSorted = useMemo(() => {
    return templates
      .filter((t) => !t.isPremiumOnly && !t.isCustom)
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base', numeric: true }));
  }, [templates]);

  // Save as Custom Template modal & state
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategoryId, setNewTemplateCategoryId] = useState<string>('metal');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');

  const availableTemplateCategories = useMemo(() => {
    const base = categories && categories.length > 0 ? categories : [
      { id: 'metal', name: 'Métallerie / Serrurerie / Fer forgé', isDefault: true, enabled: true },
      { id: 'bois', name: 'Menuiserie Bois', isDefault: true, enabled: true },
      { id: 'alu', name: 'Menuiserie Aluminium', isDefault: true, enabled: true },
      { id: 'autre', name: 'Autre structure / Spécialisé', isDefault: true, enabled: true },
    ];
    const showSysTemplateCategories =
      profile.showSystemTemplateCategories !== false &&
      profile.showPredefinedTemplateCategories !== false;
    if (!showSysTemplateCategories) {
      const customOnly = base.filter((c) => !c.isDefault);
      return customOnly.length > 0 ? customOnly : base;
    }
    return base;
  }, [categories, profile.showSystemTemplateCategories, profile.showPredefinedTemplateCategories]);

  // Premium gate modal state
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [selectedPremiumTemplate, setSelectedPremiumTemplate] = useState<WorkshopTemplate | null>(null);

  // Track invalid numeric input states across rows to prevent silent invalid submissions
  const [invalidNumericFields, setInvalidNumericFields] = useState<Record<string, boolean>>({});

  const handleSetFieldInvalid = (key: string, isInvalid: boolean) => {
    setInvalidNumericFields((prev) => {
      if (!isInvalid && !prev[key]) return prev;
      const next = { ...prev };
      if (isInvalid) {
        next[key] = true;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const hasInvalidNumericFields = Object.keys(invalidNumericFields).length > 0;

  // Track the timestamp of the last loaded template to prevent re-applying old props on navigation
  const lastLoadedTimestampRef = useRef<number | null>(null);

  // Load initialTemplate when explicitly provided as a new action
  useEffect(() => {
    if (initialTemplate) {
      const ts = initialTemplate._sessionTimestamp || 0;
      if (ts && ts !== lastLoadedTimestampRef.current) {
        lastLoadedTimestampRef.current = ts;
        if (initialTemplate.isPremiumOnly && !isPremium(entitlement)) {
          setSelectedPremiumTemplate(initialTemplate);
          setGateModalOpen(true);
          onConsumeTemplate?.();
          return;
        }
        setMaterials(
          initialTemplate.defaultMaterials.map((m) => ({ ...m, id: generateId() }))
        );
        setWastePercent(initialTemplate.wastePercent ?? profile.defaultWastePercent ?? 5);
        setLabor(
          initialTemplate.defaultLabor.map((l) => ({ ...l, id: generateId() }))
        );
        setOtherCosts(
          initialTemplate.defaultOtherCosts.map((o) => ({ ...o, id: generateId() }))
        );
        setTargetProfitPercent(initialTemplate.targetMarginPercent ?? profile.defaultMarginPercent ?? 25);
        if (initialTemplate.overheadType) setOverheadType(initialTemplate.overheadType);
        if (initialTemplate.overheadValue !== undefined) setOverheadValue(initialTemplate.overheadValue);
        if (initialTemplate.pricingMode) setPricingMode(initialTemplate.pricingMode);
        if (initialTemplate.roundingStep) setRoundingStep(initialTemplate.roundingStep);
        setSelectedTemplateId(initialTemplate.id);
        onConsumeTemplate?.();
      }
    }
  }, [initialTemplate, entitlement, onConsumeTemplate, profile]);

  // Load initialCalculation when it changes (e.g. editing quote source calculation)
  useEffect(() => {
    if (initialCalculation) {
      setMaterials(initialCalculation.materials);
      setWastePercent(initialCalculation.wastePercent);
      setLabor(initialCalculation.labor);
      setOtherCosts(initialCalculation.otherCosts);
      setOverheadType(initialCalculation.overheadType);
      setOverheadValue(initialCalculation.overheadValue);
      setPricingMode(initialCalculation.pricingMode);
      setTargetProfitPercent(initialCalculation.targetProfitPercent);
      setRoundingStep(initialCalculation.roundingStep);
      if (initialCalculation.templateId) {
        setSelectedTemplateId(initialCalculation.templateId);
      }
    }
  }, [initialCalculation]);

  // Prepare input for pure engine
  const calculationInput: CalculationInput = useMemo(() => {
    return {
      materials,
      wastePercent,
      labor,
      otherCosts,
      overheadType,
      overheadValue,
      pricingMode,
      targetProfitPercent,
      roundingStep,
      templateId: selectedTemplateId || undefined,
    };
  }, [
    materials,
    wastePercent,
    labor,
    otherCosts,
    overheadType,
    overheadValue,
    pricingMode,
    targetProfitPercent,
    roundingStep,
    selectedTemplateId,
  ]);

  // Save draft whenever calculationInput updates (unless editing a specific quote)
  useEffect(() => {
    if (!editingQuote) {
      saveDraftCalculation(calculationInput);
    }
  }, [calculationInput, editingQuote]);

  // Real-time calculation
  const result: CalculationResult = useMemo(() => {
    return calculateQuote(calculationInput);
  }, [calculationInput]);

  // Handlers for Materials
  const handleAddMaterial = (libraryItem?: MaterialLibraryItem) => {
    if (libraryItem) {
      setMaterials((prev) => [
        ...prev,
        {
          id: generateId(),
          name: libraryItem.name,
          quantity: 1,
          unit: libraryItem.unit,
          unitPrice: libraryItem.defaultUnitPrice,
        },
      ]);
    } else {
      setMaterials((prev) => [
        ...prev,
        {
          id: generateId(),
          name: '',
          quantity: 1,
          unit: 'piece',
          unitPrice: 0,
        },
      ]);
    }
  };

  const handleUpdateMaterial = (
    id: string,
    field: keyof MaterialItem,
    value: string | number
  ) => {
    setMaterials((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          [field]: field === 'quantity' || field === 'unitPrice' ? sanitizeNumber(value) : value,
        };
      })
    );
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials((prev) => prev.filter((item) => item.id !== id));
  };

  // Handlers for Labor
  const handleAddLabor = (rateItem?: LaborRateLibraryItem) => {
    if (rateItem) {
      setLabor((prev) => [
        ...prev,
        {
          id: generateId(),
          task: rateItem.task,
          hours: 1,
          hourlyRate: rateItem.defaultRate,
        },
      ]);
    } else {
      setLabor((prev) => [
        ...prev,
        {
          id: generateId(),
          task: '',
          hours: 1,
          hourlyRate: profile.defaultLaborRate || 2500,
        },
      ]);
    }
  };

  const handleUpdateLabor = (
    id: string,
    field: keyof LaborItem,
    value: string | number
  ) => {
    setLabor((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          [field]: field === 'hours' || field === 'hourlyRate' ? sanitizeNumber(value) : value,
        };
      })
    );
  };

  const handleRemoveLabor = (id: string) => {
    setLabor((prev) => prev.filter((item) => item.id !== id));
  };

  // Handlers for Other Costs
  const handleAddOtherCost = () => {
    setOtherCosts((prev) => [
      ...prev,
      {
        id: generateId(),
        description: '',
        amount: 0,
        category: 'autre',
      },
    ]);
  };

  const handleUpdateOtherCost = (
    id: string,
    field: keyof OtherCostItem,
    value: string | number
  ) => {
    setOtherCosts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          [field]: field === 'amount' ? sanitizeNumber(value) : value,
        };
      })
    );
  };

  const handleRemoveOtherCost = (id: string) => {
    setOtherCosts((prev) => prev.filter((item) => item.id !== id));
  };

  // Find the currently active template object if one was loaded
  const loadedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Apply template with premium gate & clean state load
  const handleApplyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;

    if (tpl.isPremiumOnly && !isPremium(entitlement)) {
      setSelectedPremiumTemplate(tpl);
      setGateModalOpen(true);
      setSelectedTemplateId('');
      return;
    }

    setMaterials(
      tpl.defaultMaterials.map((m) => ({
        ...m,
        id: generateId(),
      }))
    );

    setLabor(
      tpl.defaultLabor.map((l) => ({
        ...l,
        id: generateId(),
      }))
    );

    setOtherCosts(
      tpl.defaultOtherCosts.map((o) => ({
        ...o,
        id: generateId(),
      }))
    );

    setWastePercent(tpl.wastePercent ?? profile.defaultWastePercent ?? 5);
    setTargetProfitPercent(tpl.targetMarginPercent ?? profile.defaultMarginPercent ?? 25);
    setOverheadType(tpl.overheadType || 'percent');
    setOverheadValue(tpl.overheadValue !== undefined ? tpl.overheadValue : 0);
    setPricingMode(tpl.pricingMode || 'margin');
    setRoundingStep(tpl.roundingStep || profile.defaultRounding || 'none');
    
    setSelectedTemplateId(tplId);
    showSuccess(`✓ Modèle « ${tpl.name} » chargé pour ce calcul.`);
  };

  // Custom Template Saving Handlers: "Save as new template"
  const handleOpenSaveTemplateModal = () => {
    const firstMat = materials[0]?.name;
    const suggested = loadedTemplate
      ? `${loadedTemplate.name} (Variante)`
      : firstMat
      ? `Ouvrage (${firstMat})`
      : 'Mon Modèle sur mesure';
    setNewTemplateName(suggested);
    const initialCatId = loadedTemplate?.categoryId || (loadedTemplate?.category as string) || (categories && categories[0]?.id) || 'autre';
    setNewTemplateCategoryId(initialCatId);
    setNewTemplateDescription(loadedTemplate?.description || '');
    setShowSaveTemplateModal(true);
  };

  // Helper: check if a row is completely empty/unfilled
  const isMaterialEmpty = (m: MaterialItem | Omit<MaterialItem, 'id'>) =>
    !m.name?.trim() && (!m.unitPrice || m.unitPrice === 0) && (!m.quantity || m.quantity === 0);

  const isLaborEmpty = (l: LaborItem | Omit<LaborItem, 'id'>) =>
    !l.task?.trim() && (!l.hourlyRate || l.hourlyRate === 0) && (!l.hours || l.hours === 0);

  const isOtherCostEmpty = (o: OtherCostItem | Omit<OtherCostItem, 'id'>) =>
    !o.description?.trim() && (!o.amount || o.amount === 0);

  // Explicit action: "Update existing custom template"
  const handleUpdateCurrentTemplate = () => {
    if (!loadedTemplate || !loadedTemplate.isCustom) return;
    if (onSaveTemplate) {
      try {
        // Filter out empty rows so they don't pollute saved templates
        const validMaterials = materials
          .filter((m) => !isMaterialEmpty(m))
          .map(({ id, ...m }) => ({ ...m }));
        const validLabor = labor
          .filter((l) => !isLaborEmpty(l))
          .map(({ id, ...l }) => ({ ...l }));
        const validOtherCosts = otherCosts
          .filter((o) => !isOtherCostEmpty(o))
          .map(({ id, ...o }) => ({ ...o }));

        onSaveTemplate({
          id: loadedTemplate.id,
          name: loadedTemplate.name,
          categoryId: loadedTemplate.categoryId || (loadedTemplate.category as string) || 'autre',
          category: loadedTemplate.category,
          description: loadedTemplate.description,
          isCustom: true,
          isPremiumOnly: false,
          defaultMaterials: validMaterials,
          defaultLabor: validLabor,
          defaultOtherCosts: validOtherCosts,
          wastePercent,
          targetMarginPercent: targetProfitPercent,
          overheadType,
          overheadValue,
          pricingMode,
          roundingStep,
        });

        // Visible non-blocking confirmation toast
        const templateName = loadedTemplate.name ? ` « ${loadedTemplate.name} »` : '';
        showSuccess(`✓ Modèle${templateName} mis à jour avec succès.`);
      } catch (err) {
        console.error('Failed to update template:', err);
        showError('Impossible de mettre à jour le modèle.');
      }
    }
  };

  const handleConfirmSaveTemplate = (e: FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) {
      showError('Veuillez saisir un nom pour le modèle.');
      focusAndScrollToField('calc-save-tpl-name');
      return;
    }

    if (onSaveTemplate) {
      try {
        // Filter out empty rows so they don't pollute saved templates
        const validMaterials = materials
          .filter((m) => !isMaterialEmpty(m))
          .map(({ id, ...m }) => ({ ...m }));
        const validLabor = labor
          .filter((l) => !isLaborEmpty(l))
          .map(({ id, ...l }) => ({ ...l }));
        const validOtherCosts = otherCosts
          .filter((o) => !isOtherCostEmpty(o))
          .map(({ id, ...o }) => ({ ...o }));

        const selectedCat = categories.find((c) => c.id === newTemplateCategoryId);

        onSaveTemplate({
          name: newTemplateName.trim(),
          categoryId: newTemplateCategoryId,
          category: (selectedCat?.name || newTemplateCategoryId) as any,
          description: newTemplateDescription.trim(),
          isCustom: true,
          isPremiumOnly: false,
          defaultMaterials: validMaterials,
          defaultLabor: validLabor,
          defaultOtherCosts: validOtherCosts,
          wastePercent,
          targetMarginPercent: targetProfitPercent,
          overheadType,
          overheadValue,
          pricingMode,
          roundingStep,
        });

        setShowSaveTemplateModal(false);
        showSuccess(`✓ Modèle « ${newTemplateName.trim()} » enregistré dans votre bibliothèque !`);
      } catch (err) {
        console.error('Failed to save template:', err);
        showError('Impossible d\'enregistrer le modèle.');
      }
    }
  };

  // Reset confirmation & execution
  const handleResetClick = () => {
    // If the calculation is already clean/empty and not bound to a template, reset directly
    const isAlreadyEmpty =
      materials.every(isMaterialEmpty) &&
      labor.every(isLaborEmpty) &&
      otherCosts.every(isOtherCostEmpty) &&
      !selectedTemplateId &&
      overheadValue === 0;

    if (isAlreadyEmpty) {
      handleConfirmReset();
      return;
    }

    setShowResetModal(true);
  };

  const handleConfirmReset = () => {
    clearDraftCalculation();
    clearDraftQuote();
    setMaterials([createEmptyMaterialRow()]);
    setLabor([createEmptyLaborRow()]);
    setOtherCosts([createEmptyOtherCostRow()]);
    setWastePercent(profile.defaultWastePercent ?? 5);
    setOverheadValue(0);
    setOverheadType('percent');
    setPricingMode('margin');
    setTargetProfitPercent(profile.defaultMarginPercent ?? 25);
    setRoundingStep(profile.defaultRounding ?? 'none');
    setSelectedTemplateId('');
    setShowResetModal(false);
    onResetToNew?.();
    showInfo('Calculateur réinitialisé pour une nouvelle session vierge.');
  };

  const handleSaveTemplateFromCreationMode = () => {
    if (!templateCreationContext) return;
    if (onSaveTemplate) {
      try {
        const validMaterials = materials
          .filter((m) => !isMaterialEmpty(m))
          .map(({ id, ...m }) => ({ ...m }));
        const validLabor = labor
          .filter((l) => !isLaborEmpty(l))
          .map(({ id, ...l }) => ({ ...l }));
        const validOtherCosts = otherCosts
          .filter((o) => !isOtherCostEmpty(o))
          .map(({ id, ...o }) => ({ ...o }));

        const legacyCat = (['metal', 'bois', 'alu', 'autre'].includes(templateCreationContext.categoryId)
          ? templateCreationContext.categoryId
          : 'autre') as any;

        onSaveTemplate({
          name: templateCreationContext.name.trim(),
          categoryId: templateCreationContext.categoryId,
          category: legacyCat,
          description: templateCreationContext.description?.trim() || '',
          isCustom: true,
          isPremiumOnly: false,
          defaultMaterials: validMaterials,
          defaultLabor: validLabor,
          defaultOtherCosts: validOtherCosts,
          wastePercent,
          targetMarginPercent: targetProfitPercent,
          overheadType,
          overheadValue,
          pricingMode,
          roundingStep,
        });

        showSuccess(`✓ Modèle « ${templateCreationContext.name.trim()} » enregistré avec succès dans votre bibliothèque !`);
        onFinishTemplateCreation?.();
      } catch (err) {
        console.error('Failed to save template:', err);
        showError('Impossible d\'enregistrer le modèle.');
      }
    }
  };

  const handlePrimaryAction = () => {
    if (hasInvalidNumericFields) {
      showError('Veuillez corriger les valeurs numériques en rouge avant de continuer.');
      return;
    }
    if (templateCreationContext) {
      handleSaveTemplateFromCreationMode();
      return;
    }
    if (editingQuote && onUpdateQuoteCalculation) {
      onUpdateQuoteCalculation(calculationInput, result, editingQuote);
    } else {
      handleQuoteClick?.(calculationInput, result);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-36 md:pb-24 lg:pb-12 animate-in fade-in duration-200 space-y-5">
      {/* Context Banner: Template Creation Mode */}
      {templateCreationContext && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border border-teal-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-teal-950 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-teal-200/80 text-teal-900 rounded-md uppercase tracking-wider">
                  Nouveau modèle
                </span>
                <span className="text-xs font-bold text-teal-800">
                  Catégorie : {categoryNameMap.get(templateCreationContext.categoryId) || 'Autre'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1">
                {templateCreationContext.name}
              </h2>
              {templateCreationContext.description && (
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 max-w-2xl">
                  {templateCreationContext.description}
                </p>
              )}
              <p className="text-[11px] text-teal-700 font-medium mt-1">
                Ajustez les matières, temps et marges ci-dessous, puis validez pour enregistrer dans votre bibliothèque.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {onCancelTemplateCreation && (
              <button
                type="button"
                onClick={onCancelTemplateCreation}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                Annuler
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveTemplateFromCreationMode}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Enregistrer le modèle</span>
            </button>
          </div>
        </div>
      )}

      {/* Context Banner if editing an existing quote's calculation */}
      {editingQuote && (
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-teal-900 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-600 text-white rounded-lg">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm">
                Modification du calcul source — Devis N° {editingQuote.quoteNumber}
              </div>
              <div className="text-xs text-teal-700">
                Projet : {editingQuote.projectTitle || 'Sans titre'} • Client : {editingQuote.customer.name || 'Non spécifié'}
              </div>
            </div>
          </div>
          {onCancelEditQuote && (
            <button
              onClick={onCancelEditQuote}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-800 bg-white hover:bg-teal-100 rounded-lg border border-teal-300 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Annuler & Revenir au devis</span>
            </button>
          )}
        </div>
      )}

      {/* Top Banner & Template Quick Loader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Calculator className="w-6 h-6 text-teal-600" />
              Calculateur de Coût & Prix de Vente
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Calculez le coût réel de fabrication et appliquez votre marge pour définir le prix de vente exact.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick template dropdown */}
          <div className="relative">
            <select
              value={selectedTemplateId}
              onChange={(e) => {
                if (e.target.value) {
                  handleApplyTemplate(e.target.value);
                }
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-lg text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="">⚡ Charger un modèle d'ouvrage...</option>
              
              {/* Custom user templates (Priority 1) */}
              {customTemplatesSorted.length > 0 && (
                <optgroup label="── ✨ Mes Modèles Personnalisés ──">
                  {customTemplatesSorted.map((t) => (
                    <option key={t.id} value={t.id}>
                      ✨ {t.name}
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Premium templates (Priority 2, only if showSysTemplates is not false) */}
              {showSysTemplates && premiumTemplatesSorted.length > 0 && (
                <optgroup label="── 👑 Modèles Pro (Premium) ──">
                  {premiumTemplatesSorted.map((t) => (
                    <option key={t.id} value={t.id}>
                      👑 {t.name} (Pro)
                    </option>
                  ))}
                </optgroup>
              )}

              {/* Free built-in templates (Priority 3, only if showSysTemplates is not false) */}
              {showSysTemplates && freeTemplatesSorted.length > 0 && (
                <optgroup label="── Modèles Gratuits ──">
                  {freeTemplatesSorted.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Action buttons */}
          {loadedTemplate && loadedTemplate.isCustom ? (
            <>
              <button
                type="button"
                onClick={handleUpdateCurrentTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-950 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title={`Enregistrer vos modifications actuelles dans ce modèle personnalisé « ${loadedTemplate.name} » (écrase la version précédente en bibliothèque)`}
              >
                <Check className="w-3.5 h-3.5 text-teal-700" />
                <span>Mettre à jour ce modèle</span>
              </button>
              <button
                type="button"
                onClick={handleOpenSaveTemplateModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="Créer un nouveau modèle distinct à partir de ces valeurs. Le modèle d'origine restera inchangé."
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-teal-600" />
                <span>Enregistrer comme nouveau modèle</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleOpenSaveTemplateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
              title="Créer un nouveau modèle personnalisé réutilisable dans votre bibliothèque à partir de ce calcul"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-teal-600" />
              <span>Enregistrer comme nouveau modèle</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors shadow-2xs cursor-pointer"
            title="Effacer ce calcul et démarrer une nouvelle session vierge"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Nouveau calcul vierge</span>
          </button>
        </div>
      </div>

      {/* Session / Loaded Template Indicator Banner */}
      {loadedTemplate && (
        <div className="mb-5 p-3 sm:p-3.5 bg-slate-50 border border-slate-200/90 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className={`p-2 rounded-lg shrink-0 ${loadedTemplate.isCustom ? 'bg-teal-100 text-teal-800' : loadedTemplate.isPremiumOnly ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-700'}`}>
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-500 font-medium">Session de calcul basée sur le modèle :</span>
                <span className="font-bold text-slate-900">{loadedTemplate.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${loadedTemplate.isCustom ? 'bg-teal-100 text-teal-800 border border-teal-200' : loadedTemplate.isPremiumOnly ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-700'}`}>
                  {loadedTemplate.isCustom ? 'Modèle Personnalisé' : loadedTemplate.isPremiumOnly ? '👑 Modèle Pro' : 'Modèle Standard'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Les modifications apportées à ce calcul sont propres à ce devis. Le modèle d'origine en bibliothèque reste intact.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setShowReloadTemplateModal(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
              title="Annuler vos modifications sur ce calcul et recharger les valeurs d'origine du modèle"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Recharger les valeurs initiales du modèle</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedTemplateId('');
                showInfo('Calcul détaché de la référence du modèle.');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
              title="Détacher ce calcul du modèle pour continuer en calcul libre"
            >
              <X className="w-3.5 h-3.5" />
              <span>Détacher</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Inputs (Left 7 cols) + Sticky Live Result Card (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: INPUTS ================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Errors banner if any */}
          {!result.isValid && result.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-red-900">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Attention requise sur le calcul :
              </div>
              {result.errors.map((err, i) => (
                <div key={i} className="pl-5">• {err}</div>
              ))}
            </div>
          )}

          {/* SECTION A: MATÉRIAUX */}
          <div id="tour-calculator-materials" className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-teal-100 text-teal-800 text-xs font-black flex items-center justify-center">
                    A
                  </span>
                  Matériaux & Matières Premières
                </h2>
                <p className="text-xs text-slate-500">Tubes, tôles, fers, consommables, bois, quincaillerie...</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Matériaux bruts</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {formatCurrency(result.rawMaterialCost, currency)}
                </span>
              </div>
            </div>

            {/* Material Lines */}
            <div className="space-y-2.5">
              {materials.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                  Aucun matériau ajouté. Cliquez sur "Ajouter une ligne libre" ci-dessous.
                </div>
              ) : (
                materials.map((mat, index) => {
                  const subtotal = (mat.quantity || 0) * (mat.unitPrice || 0);
                  return (
                    <div
                      key={mat.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500 text-[11px] shrink-0">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={mat.name}
                          onChange={(e) => handleUpdateMaterial(mat.id, 'name', e.target.value)}
                          placeholder="Désignation (ex: Tube carré 40×40, Tôle 2mm...)"
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                        />
                        <button
                          onClick={() => handleRemoveMaterial(mat.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end">
                        {/* Quantity with Stepper */}
                        <div className="col-span-1 sm:col-span-4">
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            Quantité
                          </label>
                          <NumberStepper
                            value={mat.quantity}
                            onChange={(val) => handleUpdateMaterial(mat.id, 'quantity', val)}
                            onInvalidChange={(isInv) => handleSetFieldInvalid(`mat-${mat.id}-qty`, isInv)}
                            min={0}
                            step={1}
                            placeholder="1"
                            className="w-full"
                            ariaLabel={`Quantité pour ${mat.name || 'matériau'}`}
                          />
                        </div>

                        {/* Unit */}
                        <div className="col-span-1 sm:col-span-3">
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            Unité
                          </label>
                          <select
                            value={mat.unit}
                            onChange={(e) => handleUpdateMaterial(mat.id, 'unit', e.target.value)}
                            className="w-full h-8 sm:h-7 px-2 py-0 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-xs font-medium"
                          >
                            {COMMON_UNITS.map((u) => (
                              <option key={u.value} value={u.value}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Unit Price */}
                        <div className="col-span-1 sm:col-span-3">
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            Prix Unit. ({currency})
                          </label>
                          <NumericInput
                            value={mat.unitPrice}
                            onChange={(val) => handleUpdateMaterial(mat.id, 'unitPrice', val)}
                            onInvalidChange={(isInv) => handleSetFieldInvalid(`mat-${mat.id}-price`, isInv)}
                            min={0}
                            placeholder="0"
                            inputClassName="h-8 sm:h-7 text-xs"
                            ariaLabel="Prix unitaire du matériau"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="col-span-1 sm:col-span-2 text-right">
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                            Sous-total
                          </label>
                          <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm h-8 sm:h-7 flex items-center justify-end">
                            {formatCurrency(subtotal, currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add material actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => handleAddMaterial()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une ligne libre</span>
              </button>

              {/* Quick picker from library */}
              <div className="relative">
                <select
                  onChange={(e) => {
                    const item = allMaterials.find((m) => m.id === e.target.value);
                    if (item) {
                      handleAddMaterial(item);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                >
                  <option value="" disabled>
                    + Choisir dans ma bibliothèque ({allMaterials.length})...
                  </option>
                  {allMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({formatCurrency(m.defaultUnitPrice, currency)}/{m.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Waste / Loss Section - Clear, distinct breakdown */}
            <div className="pt-3 border-t border-slate-100 bg-slate-50/80 p-3 rounded-lg border border-slate-200 text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-amber-600" />
                    Chutes & Pertes de matière (%) :
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Compense les découpes, chutes métalliques et pertes inévitables.
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <NumberStepper
                    value={wastePercent}
                    onChange={(val) => setWastePercent(Math.max(0, Math.min(50, val)))}
                    min={0}
                    max={50}
                    step={1}
                    unit="%"
                    placeholder="0"
                    className="w-32"
                    ariaLabel="Pourcentage de chutes et pertes"
                  />
                </div>
              </div>

              {/* Clear mathematical summary */}
              <div className="pt-2 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="text-slate-600">
                  <span className="text-slate-400 font-sans block text-[10px]">Matériaux bruts</span>
                  <span className="font-bold">{formatCurrency(result.rawMaterialCost, currency)}</span>
                </div>
                <div className="text-amber-800">
                  <span className="text-amber-600 font-sans block text-[10px]">Coût des pertes ({wastePercent} %)</span>
                  <span className="font-bold">+{formatCurrency(result.wasteAmount, currency)}</span>
                </div>
                <div className="text-slate-900 font-bold">
                  <span className="text-teal-700 font-sans block text-[10px]">Matériaux après pertes</span>
                  <span>{formatCurrency(result.adjustedMaterialCost, currency)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B: MAIN D'ŒUVRE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-teal-100 text-teal-800 text-xs font-black flex items-center justify-center">
                    B
                  </span>
                  Main d'Œuvre & Temps de Travail
                </h2>
                <p className="text-xs text-slate-500">Heures de travail atelier, façonnage, assemblage et pose...</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Main-d'œuvre</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {formatCurrency(result.laborCost, currency)}
                </span>
              </div>
            </div>

            {/* Labor Lines */}
            <div className="space-y-2.5">
              {labor.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                  Aucune tâche de main-d'œuvre. Ajoutez au moins une étape de travail.
                </div>
              ) : (
                labor.map((l, index) => {
                  const subtotal = (l.hours || 0) * (l.hourlyRate || 0);
                  return (
                    <div
                      key={l.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500 text-[11px] shrink-0">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={l.task}
                          onChange={(e) => handleUpdateLabor(l.id, 'task', e.target.value)}
                          placeholder="Intitulé de la tâche (ex: Découpe & Soudure, Pose...)"
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                        />
                        <button
                          onClick={() => handleRemoveLabor(l.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end">
                        {/* Hours with Stepper */}
                        <div className="col-span-1 sm:col-span-4">
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            Temps (Heures)
                          </label>
                          <NumberStepper
                            value={l.hours}
                            onChange={(val) => handleUpdateLabor(l.id, 'hours', val)}
                            onInvalidChange={(isInv) => handleSetFieldInvalid(`labor-${l.id}-hours`, isInv)}
                            min={0}
                            step={0.5}
                            unit="h"
                            placeholder="0"
                            className="w-full"
                            ariaLabel={`Temps pour ${l.task || 'tâche'}`}
                          />
                        </div>

                        {/* Hourly Rate */}
                        <div className="col-span-1 sm:col-span-4">
                          <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                            Taux Horaire ({currency}/h)
                          </label>
                          <NumericInput
                            value={l.hourlyRate}
                            onChange={(val) => handleUpdateLabor(l.id, 'hourlyRate', val)}
                            onInvalidChange={(isInv) => handleSetFieldInvalid(`labor-${l.id}-rate`, isInv)}
                            min={0}
                            placeholder="0"
                            inputClassName="h-8 sm:h-7 text-xs"
                            ariaLabel="Taux horaire"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="col-span-2 sm:col-span-4 text-right">
                          <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                            Coût Main-d'œuvre
                          </label>
                          <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm h-8 sm:h-7 flex items-center justify-end">
                            {formatCurrency(subtotal, currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add labor actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => handleAddLabor()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une tâche</span>
              </button>

              {/* Quick picker from labor rates library */}
              <div className="relative">
                <select
                  onChange={(e) => {
                    const item = allLaborRates.find((r) => r.id === e.target.value);
                    if (item) {
                      handleAddLabor(item);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                >
                  <option value="" disabled>
                    + Choisir un taux prédéfini ({allLaborRates.length})...
                  </option>
                  {allLaborRates.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.task} ({formatCurrency(r.defaultRate, currency)}/h)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION C: AUTRES COÛTS & FRAIS GÉNÉRAUX */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-teal-100 text-teal-800 text-xs font-black flex items-center justify-center">
                    C
                  </span>
                  Autres Coûts & Frais d'Atelier
                </h2>
                <p className="text-xs text-slate-500">Transport, carburant, quincaillerie externe, fonctionnement...</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Frais</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {formatCurrency(result.otherCostsTotal + result.overheadCost, currency)}
                </span>
              </div>
            </div>

            {/* Other Cost items */}
            <div className="space-y-2">
              {otherCosts.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                >
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleUpdateOtherCost(item.id, 'description', e.target.value)}
                    placeholder="Description (ex: Transport, location machine...)"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1 sm:w-40 flex items-center">
                      <NumericInput
                        value={item.amount}
                        onChange={(val) => handleUpdateOtherCost(item.id, 'amount', val)}
                        onInvalidChange={(isInv) => handleSetFieldInvalid(`other-${item.id}-amount`, isInv)}
                        min={0}
                        placeholder="0"
                        suffix={currency}
                        inputClassName="py-1 text-xs"
                        ariaLabel="Montant du coût additionnel"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveOtherCost(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddOtherCost}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un coût additionnel</span>
              </button>
            </div>

            {/* Overhead / Fonctionnement */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <div className="font-bold text-slate-800">Frais supplémentaires / fonctionnement de l'atelier</div>
                <div className="text-[11px] text-slate-500">
                  Loyer, usure machines, électricité générale de l'atelier
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <select
                  value={overheadType}
                  onChange={(e) => setOverheadType(e.target.value as OverheadType)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                >
                  <option value="percent">% Coûts directs</option>
                  <option value="fixed">Montant fixe ({currency})</option>
                </select>

                {overheadType === 'percent' ? (
                  <NumberStepper
                    value={overheadValue}
                    onChange={(val) => setOverheadValue(Math.max(0, val))}
                    onInvalidChange={(isInv) => handleSetFieldInvalid('calc-overhead-val', isInv)}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    placeholder="0"
                    className="w-32"
                    ariaLabel="Pourcentage de frais généraux"
                  />
                ) : (
                  <div className="w-36 flex items-center">
                    <NumericInput
                      value={overheadValue}
                      onChange={(val) => setOverheadValue(Math.max(0, val))}
                      onInvalidChange={(isInv) => handleSetFieldInvalid('calc-overhead-val', isInv)}
                      min={0}
                      placeholder="0"
                      suffix={currency}
                      inputClassName="py-1 text-xs"
                      ariaLabel="Frais généraux fixes"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: LIVE PRICING & MARGIN CARD ================= */}
        <div id="tour-calculator-summary" className="lg:col-span-5 space-y-6 lg:sticky lg:top-[72px] lg:self-start">
          {/* Target Margin / Markup Control Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-teal-600" />
                Objectif de Marge & Rentabilité
              </h3>

              <button
                onClick={() => setShowFormulaModal(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-800 hover:underline"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Voir le calcul</span>
              </button>
            </div>

            {/* Pricing Mode Toggle (Marge vs Marque) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 block">
                Mode de calcul du bénéfice :
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setPricingMode('margin')}
                  className={`py-2 px-3 text-xs font-bold rounded-md transition-all ${
                    pricingMode === 'margin'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Marge Réelle (Recommandé)
                </button>
                <button
                  onClick={() => setPricingMode('markup')}
                  className={`py-2 px-3 text-xs font-bold rounded-md transition-all ${
                    pricingMode === 'markup'
                      ? 'bg-white text-teal-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Taux de marque (Coeff.)
                </button>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
                {pricingMode === 'margin' ? (
                  <span>
                    <strong>Marge réelle ({targetProfitPercent}%) :</strong> Le bénéfice représente {targetProfitPercent}% du prix total facturé au client.
                  </span>
                ) : (
                  <span>
                    <strong>Taux de marque ({targetProfitPercent}%) :</strong> On ajoute {targetProfitPercent}% en plus au-dessus du coût de revient.
                  </span>
                )}
              </div>
            </div>

            {/* Target Percentage Stepper, Slider & Quick Presets */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {pricingMode === 'margin' ? 'Taux de Marge Cible :' : 'Pourcentage de Marque :'}
                </span>
                <NumberStepper
                  value={targetProfitPercent}
                  onChange={(val) => setTargetProfitPercent(Math.max(1, Math.min(pricingMode === 'margin' ? 95 : 200, val)))}
                  min={1}
                  max={pricingMode === 'margin' ? 95 : 200}
                  step={1}
                  unit="%"
                  placeholder="25"
                  className="w-32"
                  ariaLabel="Pourcentage de marge"
                />
              </div>

              <input
                type="range"
                min="5"
                max={pricingMode === 'margin' ? 80 : 120}
                step="1"
                value={targetProfitPercent}
                onChange={(e) => setTargetProfitPercent(sanitizeNumber(e.target.value))}
                className="w-full accent-teal-600 cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <button onClick={() => setTargetProfitPercent(15)} className={`hover:text-teal-700 cursor-pointer ${targetProfitPercent === 15 ? 'text-teal-800 font-bold' : ''}`}>15%</button>
                <button onClick={() => setTargetProfitPercent(20)} className={`hover:text-teal-700 cursor-pointer ${targetProfitPercent === 20 ? 'text-teal-800 font-bold' : ''}`}>20%</button>
                <button onClick={() => setTargetProfitPercent(25)} className={`hover:text-teal-700 cursor-pointer ${targetProfitPercent === 25 ? 'text-teal-800 font-bold' : ''}`}>25%</button>
                <button onClick={() => setTargetProfitPercent(30)} className={`hover:text-teal-700 cursor-pointer ${targetProfitPercent === 30 ? 'text-teal-800 font-bold' : ''}`}>30%</button>
                <button onClick={() => setTargetProfitPercent(40)} className={`hover:text-teal-700 cursor-pointer ${targetProfitPercent === 40 ? 'text-teal-800 font-bold' : ''}`}>40%</button>
                <button onClick={() => setTargetProfitPercent(50)} className={`hover:text-teal-700 cursor-pointer ${targetProfitPercent === 50 ? 'text-teal-800 font-bold' : ''}`}>50%</button>
              </div>
            </div>

            {/* Rounding Step */}
            <div className="space-y-1.5 pt-3 border-t border-slate-100">
              <label className="text-xs font-semibold text-slate-700 block">
                Arrondi commercial du prix :
              </label>
              <div className="grid grid-cols-4 gap-1.5 text-xs">
                {[
                  { value: 'none', label: 'Exact' },
                  { value: '100', label: '100' },
                  { value: '500', label: '500' },
                  { value: '1000', label: '1 000' },
                ].map((step) => (
                  <button
                    key={step.value}
                    onClick={() => setRoundingStep(step.value as RoundingStep)}
                    className={`py-1.5 px-2 rounded-lg font-medium border text-center transition-colors ${
                      roundingStep === step.value
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {step.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* MAIN PROMINENT RESULTS CARD */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
            {/* Top Recommended Price */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                PRIX DE VENTE CONSEILLÉ
              </span>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {formatCurrency(result.roundedSellingPrice, currency)}
              </div>
              {roundingStep !== 'none' && result.rawSellingPrice !== result.roundedSellingPrice && (
                <div className="text-xs text-slate-400">
                  Calcul exact avant arrondi : {formatCurrency(result.rawSellingPrice, currency, true)}
                </div>
              )}
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                <div className="text-[10px] uppercase font-bold text-slate-400">Coût Total (Revient)</div>
                <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                  {formatCurrency(result.totalCost, currency)}
                </div>
              </div>

              <div className="p-3 bg-emerald-950/60 rounded-xl border border-emerald-800/50">
                <div className="text-[10px] uppercase font-bold text-emerald-400">Bénéfice Net</div>
                <div className="text-base font-bold font-mono text-emerald-300 mt-0.5">
                  +{formatCurrency(result.profitAmount, currency)}
                </div>
                <div className="text-[10px] text-emerald-400/80 font-medium">
                  {formatPercent(result.effectiveMarginPercent)} marge
                </div>
              </div>
            </div>

            {/* Detailed Breakdown List */}
            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Matériaux bruts :</span>
                <span className="font-mono text-slate-300">{formatCurrency(result.rawMaterialCost, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Pertes / Chutes ({wastePercent} %) :</span>
                <span className="font-mono text-amber-400">+{formatCurrency(result.wasteAmount, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Matériaux après pertes :</span>
                <span className="font-mono text-teal-300">{formatCurrency(result.adjustedMaterialCost, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Main-d'œuvre :</span>
                <span className="font-mono text-slate-300">{formatCurrency(result.laborCost, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Autres coûts & frais :</span>
                <span className="font-mono text-slate-300">{formatCurrency(result.otherCostsTotal + result.overheadCost, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-200 pt-2 border-t border-slate-800">
                <span>Coût de revient total :</span>
                <span className="font-mono">{formatCurrency(result.totalCost, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-400">
                <span>Bénéfice atelier :</span>
                <span className="font-mono">+{formatCurrency(result.profitAmount, currency)}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              {hasInvalidNumericFields && (
                <div className="p-2.5 bg-red-950/60 border border-red-800/80 rounded-lg text-red-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>Corrigez les valeurs numériques en rouge</span>
                </div>
              )}

              <button
                onClick={handlePrimaryAction}
                disabled={!result.isValid || result.roundedSellingPrice === 0 || hasInvalidNumericFields}
                className={`w-full py-3.5 px-4 font-black rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                  !result.isValid || result.roundedSellingPrice === 0 || hasInvalidNumericFields
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-teal-500 hover:bg-teal-400 text-slate-950 hover:scale-[1.01] cursor-pointer'
                }`}
              >
                {templateCreationContext ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-slate-950" />
                    <span>Enregistrer le modèle d'ouvrage</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>
                      {editingQuote
                        ? `Mettre à jour le Devis N° ${editingQuote.quoteNumber}`
                        : 'Créer le Devis à partir de ce calcul'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                onClick={() => setShowFormulaModal(true)}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors text-center cursor-pointer"
              >
                🔍 Afficher le détail des formules mathématiques
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Sticky Mobile / Tablet Summary Bar */}
      <div className="lg:hidden fixed bottom-14 md:bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md text-white p-3 border-t border-slate-800 shadow-2xl flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-teal-400 font-bold uppercase">
            {templateCreationContext ? 'Prix Conseillé du Modèle' : 'Prix Conseillé'}
          </div>
          <div className="text-base font-black font-mono">
            {formatCurrency(result.roundedSellingPrice, currency)}
          </div>
          <div className="text-[10px] text-slate-400">
            Coût : {formatCurrency(result.totalCost, '')} • Marge {formatPercent(result.effectiveMarginPercent)}
          </div>
        </div>

        <button
          onClick={handlePrimaryAction}
          disabled={!result.isValid || result.roundedSellingPrice === 0 || hasInvalidNumericFields}
          className={`py-2 px-3.5 font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all ${
            !result.isValid || result.roundedSellingPrice === 0 || hasInvalidNumericFields
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-teal-500 hover:bg-teal-400 text-slate-950 cursor-pointer'
          }`}
        >
          {templateCreationContext ? (
            <>
              <BookmarkCheck className="w-3.5 h-3.5" />
              <span>Enregistrer modèle</span>
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5" />
              <span>{editingQuote ? 'Mettre à jour' : 'Faire Devis'}</span>
            </>
          )}
        </button>
      </div>

      {/* Transparent Calculation Breakdown Modal */}
      <CalculationBreakdownModal
        isOpen={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        input={calculationInput}
        result={result}
        currencySymbol={currency}
      />

      {/* Confirmation Modal: Reload Initial Template Values */}
      {showReloadTemplateModal && loadedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <RotateCcw className="w-5 h-5 text-teal-300" />
                <span>Recharger les valeurs d'origine du modèle ?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowReloadTemplateModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">
                Souhaitez-vous réinitialiser ce calcul avec les valeurs par défaut du modèle « {loadedTemplate.name} » ?
              </p>
              <p className="text-slate-500">
                Vos modifications actuelles sur ce calcul de travail seront annulées. Le modèle enregistré dans votre bibliothèque restera intact.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowReloadTemplateModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={() => {
                  handleApplyTemplate(loadedTemplate.id);
                  setShowReloadTemplateModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Recharger les valeurs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal for New Blank Calculation */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <RotateCcw className="w-5 h-5 text-teal-300" />
                <span>Démarrer un nouveau calcul ?</span>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-700">
              <p className="font-semibold text-slate-900 text-sm">
                Votre calcul de travail en cours non enregistré sera effacé.
              </p>
              <p className="text-slate-500 leading-relaxed">
                Cette action réinitialisera les lignes de matériaux, main-d'œuvre et frais pour démarrer un nouveau calcul vierge. Vos devis enregistrés dans l'historique et vos modèles de bibliothèque restent conservés.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors shadow-2xs cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Démarrer un nouveau calcul</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Save Calculation as New Custom Template */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookmarkPlus className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900">
                    Enregistrer comme nouveau modèle
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Crée un modèle réutilisable distinct dans votre bibliothèque.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSaveTemplate} className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 text-teal-900 space-y-1">
                <p className="font-bold">Configuration du nouveau modèle :</p>
                <p className="text-[11px] text-teal-700">
                  • {materials.length} matière(s) première(s) • {labor.length} tâche(s) MO • Marge {targetProfitPercent}% • Chutes {wastePercent}%
                </p>
              </div>

              <div className="space-y-1">
                <label htmlFor="calc-save-tpl-name" className="font-bold text-slate-700 block">Nom du nouveau modèle *</label>
                <input
                  id="calc-save-tpl-name"
                  type="text"
                  required
                  placeholder="Ex: Porte d'entrée blindée, Grille antivol standard..."
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="calc-save-tpl-category" className="font-bold text-slate-700 block">Catégorie d'ouvrage</label>
                <select
                  id="calc-save-tpl-category"
                  value={newTemplateCategoryId}
                  onChange={(e) => setNewTemplateCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium bg-white"
                >
                  {availableTemplateCategories
                    .filter((cat) => cat.enabled !== false || cat.id === newTemplateCategoryId)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="calc-save-tpl-desc" className="font-bold text-slate-700 block">Description / Notes d'atelier</label>
                <textarea
                  id="calc-save-tpl-desc"
                  rows={3}
                  placeholder="Spécifications (sections des tubes, types de fers, accessoires inclus)..."
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSaveTemplateModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Enregistrer comme nouveau modèle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature Gate Modal */}
      <PremiumGateModal
        isOpen={gateModalOpen}
        onClose={() => setGateModalOpen(false)}
        featureKey="advanced_templates"
        customTitle={`Modèle Professionnel : ${selectedPremiumTemplate?.name || 'Ouvrage Pro'}`}
        customDescription={`Ce modèle avancé (${selectedPremiumTemplate?.name}) intègre des nomenclatures complètes réservées à l'abonnement AtelierDevis Premium. Les modèles de base restent 100% gratuits.`}
        onOpenPremiumInfo={() => {
          if (onOpenPremiumModal) {
            onOpenPremiumModal();
          }
        }}
      />
    </div>
  );
}
