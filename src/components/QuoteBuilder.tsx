import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Save,
  Download,
  Share2,
  Eye,
  Plus,
  Trash2,
  User,
  Building2,
  Coins,
  CheckCircle2,
  ArrowLeft,
  Layers,
  Sparkles,
  Calculator,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import {
  BusinessProfile,
  CalculationInput,
  CalculationResult,
  ClientDetailLevel,
  CustomerInfo,
  DepositConfig,
  Quote,
  QuoteLineItem,
  QuoteStatus,
} from '../types';
import { calculateDeposit, sanitizeNumber } from '../engine/calculator';
import {
  formatCurrency,
  getTodayDateString,
  addDaysToDateString,
  generateId,
} from '../utils/formatters';
import { QuotePreviewModal } from './QuotePreviewModal';
import { NumericInput } from './NumericInput';
import { downloadQuotePDF } from '../utils/pdfGenerator';
import { shareOnWhatsApp } from '../utils/whatsappShare';
import { getDraftQuote, saveDraftQuote, clearDraftQuote, clearDraftCalculation } from '../storage/db';
import { useNotification } from '../context/NotificationContext';
import { focusAndScrollToField } from '../utils/formValidation';

interface Props {
  profile: BusinessProfile;
  editingQuote?: Quote | null;
  fromCalculation?: {
    input: CalculationInput;
    result: CalculationResult;
  } | null;
  onSaveQuote: (quote: Quote) => void;
  onCancel: () => void;
  onBackToCalculation?: (currentQuote: Quote) => void;
  nextQuoteNumber: string;
}

export function QuoteBuilder({
  profile,
  editingQuote,
  fromCalculation,
  onSaveQuote,
  onCancel,
  onBackToCalculation,
  nextQuoteNumber,
}: Props) {
  const currency = profile.currencySymbol || 'FCFA';
  const { showSuccess, showError, showInfo } = useNotification();

  // Check if saved draft exists and applies to this context
  const activeDraft = useMemo(() => {
    const stored = getDraftQuote();
    if (!stored) return null;
    if (editingQuote) {
      return stored.editingQuoteId === editingQuote.id ? stored : null;
    }
    if (!fromCalculation && !stored.editingQuoteId) {
      return stored;
    }
    return null;
  }, [editingQuote, fromCalculation]);

  // Initial Customer state
  const [customer, setCustomer] = useState<CustomerInfo>(
    activeDraft?.customer || editingQuote?.customer || {
      name: '',
      phone: '',
      email: '',
      address: '',
      city: profile.city || '',
    }
  );

  // Quote Meta
  const [quoteNumber, setQuoteNumber] = useState<string>(
    activeDraft?.quoteNumber || editingQuote?.quoteNumber || nextQuoteNumber
  );
  const [createdAt, setCreatedAt] = useState<string>(
    activeDraft?.createdAt
      ? activeDraft.createdAt.substring(0, 10)
      : editingQuote?.createdAt
      ? editingQuote.createdAt.substring(0, 10)
      : getTodayDateString()
  );
  const [validUntil, setValidUntil] = useState<string>(
    activeDraft?.validUntil
      ? activeDraft.validUntil.substring(0, 10)
      : editingQuote?.validUntil
      ? editingQuote.validUntil.substring(0, 10)
      : addDaysToDateString(getTodayDateString(), profile.defaultValidityDays || 30)
  );
  const [status, setStatus] = useState<QuoteStatus>(
    activeDraft?.status || editingQuote?.status || 'Brouillon'
  );
  const [projectTitle, setProjectTitle] = useState<string>(
    activeDraft?.projectTitle || editingQuote?.projectTitle || ''
  );
  const [projectDescription, setProjectDescription] = useState<string>(
    activeDraft?.projectDescription || editingQuote?.projectDescription || ''
  );

  // Detail level for customer
  const [detailLevel, setDetailLevel] = useState<ClientDetailLevel>(
    activeDraft?.detailLevel || editingQuote?.detailLevel || 'grouped'
  );

  // Source calculation resolution (from props or editingQuote)
  const sourceCalculation = useMemo(() => {
    if (fromCalculation) return fromCalculation;
    if (editingQuote?.calculationInput && editingQuote?.calculationResult) {
      return {
        input: editingQuote.calculationInput,
        result: editingQuote.calculationResult,
      };
    }
    return null;
  }, [fromCalculation, editingQuote]);

  // Line items
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>(() => {
    if (activeDraft?.lineItems && activeDraft.lineItems.length > 0) {
      return activeDraft.lineItems;
    }

    if (editingQuote?.lineItems && editingQuote.lineItems.length > 0) {
      return editingQuote.lineItems;
    }

    if (fromCalculation) {
      const { input, result } = fromCalculation;

      // Check if calculation has a valid selling price or direct costs
      if (result.roundedSellingPrice > 0 || input.materials.length > 0 || result.laborCost > 0) {
        return [
          {
            id: generateId(),
            description: `Fabrication de l'ouvrage selon spécifications (Fourniture & Main d'œuvre)`,
            quantity: 1,
            unit: 'ensemble',
            unitPrice: result.roundedSellingPrice,
            total: result.roundedSellingPrice,
            itemType: 'service',
          },
        ];
      }
    }

    return [
      {
        id: generateId(),
        description: '',
        quantity: 1,
        unit: 'forfait',
        unitPrice: 0,
        total: 0,
      },
    ];
  });

  // Discount
  const [discountPercent, setDiscountPercent] = useState<number>(
    activeDraft?.discountPercent ?? editingQuote?.discountPercent ?? 0
  );

  // Deposit Config
  const [depositConfig, setDepositConfig] = useState<DepositConfig>(
    activeDraft?.depositConfig || editingQuote?.depositConfig || {
      type: 'percent',
      value: 40,
    }
  );

  // Notes and payment terms
  const [paymentTerms, setPaymentTerms] = useState<string>(
    activeDraft?.paymentTerms ?? editingQuote?.paymentTerms ?? profile.defaultPaymentTerms ?? 'Acompte de 40% à la commande, solde à la livraison.'
  );
  const [notes, setNotes] = useState<string>(
    activeDraft?.notes ?? editingQuote?.notes ?? profile.footerNotes ?? 'Devis valable 30 jours. Délais de fabrication convenus à la commande.'
  );

  // Validation & UI State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-save draft
  useEffect(() => {
    saveDraftQuote({
      editingQuoteId: editingQuote?.id,
      quoteNumber,
      createdAt,
      validUntil,
      status,
      customer,
      projectTitle,
      projectDescription,
      detailLevel,
      lineItems,
      discountPercent,
      depositConfig,
      paymentTerms,
      notes,
      calculationInput: editingQuote?.calculationInput || fromCalculation?.input,
      calculationResult: editingQuote?.calculationResult || fromCalculation?.result,
      updatedAt: new Date().toISOString(),
    });
  }, [
    editingQuote,
    quoteNumber,
    createdAt,
    validUntil,
    status,
    customer,
    projectTitle,
    projectDescription,
    detailLevel,
    lineItems,
    discountPercent,
    depositConfig,
    paymentTerms,
    notes,
    fromCalculation,
  ]);

  // Subtotal & Financials
  const subtotal = lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const discountAmount = discountPercent > 0 ? subtotal * (discountPercent / 100) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  // Deposit Calculation
  const { depositAmount, balanceAmount } = calculateDeposit(finalTotal, depositConfig);

  // Handlers for Line Items
  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: generateId(),
        description: '',
        quantity: 1,
        unit: 'piece',
        unitPrice: 0,
        total: 0,
      },
    ]);
  };

  const handleUpdateLineItem = (
    id: string,
    field: keyof QuoteLineItem,
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = {
          ...item,
          [field]: field === 'quantity' || field === 'unitPrice' ? sanitizeNumber(value) : value,
        };
        // Auto compute total
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? sanitizeNumber(value) : item.quantity;
          const price = field === 'unitPrice' ? sanitizeNumber(value) : item.unitPrice;
          updated.total = Math.round(qty * price);
        }
        return updated;
      })
    );

    // Clear validation error if corrected
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (field === 'description' && String(value).trim()) {
        delete next[`quote-line-desc-${id}`];
      } else if (field === 'quantity' && Number(value) > 0) {
        delete next[`quote-line-qty-${id}`];
      } else if (field === 'unitPrice' && Number(value) >= 0) {
        delete next[`quote-line-price-${id}`];
      }
      return next;
    });
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[`quote-line-desc-${id}`];
      delete next[`quote-line-qty-${id}`];
      delete next[`quote-line-price-${id}`];
      return next;
    });
  };

  // Restore the single consolidated calculated service line with 1 click
  const handleRestoreCalculatedLine = () => {
    if (!sourceCalculation || !sourceCalculation.result?.roundedSellingPrice) return;
    const unitPrice = sourceCalculation.result.roundedSellingPrice;
    const newLine: QuoteLineItem = {
      id: generateId(),
      description: projectTitle
        ? `Fabrication et fourniture : ${projectTitle} (Selon calcul atelier)`
        : `Fabrication de l'ouvrage selon spécifications (Fourniture & Main d'œuvre)`,
      quantity: 1,
      unit: 'ensemble',
      unitPrice,
      total: unitPrice,
      itemType: 'service',
    };
    setLineItems((prev) => [...prev, newLine]);
    showSuccess('✓ Prestation issue du calcul atelier réinsérée dans le devis.');
  };

  // Convert calculation items into detailed breakdown with proportional markup on all components
  const handlePopulateDetailedFromCalculation = () => {
    const calc = sourceCalculation;
    if (!calc) return;
    const { input, result } = calc;

    const items: QuoteLineItem[] = [];
    const markupFactor = result.totalCost > 0 ? result.roundedSellingPrice / result.totalCost : 1.25;

    // 1. Materials (filter out unfilled empty rows)
    const validMaterials = input.materials.filter(
      (m) => (m.name && m.name.trim() !== '') || (m.unitPrice && m.unitPrice > 0) || (m.quantity && m.quantity > 0)
    );
    validMaterials.forEach((m) => {
      const qty = m.quantity || 1;
      const uPrice = m.unitPrice || 0;
      // Direct raw unit cost with waste factored in
      const effectiveUnitCost = uPrice * (1 + (input.wastePercent || 0) / 100);
      const clientPrice = Math.round(effectiveUnitCost * markupFactor);
      items.push({
        id: generateId(),
        description: `Fourniture : ${m.name || 'Matériau'}`,
        quantity: qty,
        unit: m.unit || 'piece',
        unitPrice: clientPrice,
        total: Math.round(qty * clientPrice),
        itemType: 'material',
      });
    });

    // 2. Labor / Fabrication (filter out unfilled empty tasks)
    const validLabor = input.labor.filter(
      (l) => (l.task && l.task.trim() !== '') || (l.hours && l.hours > 0) || (l.hourlyRate && l.hourlyRate > 0)
    );
    if (result.laborCost > 0 || validLabor.length > 0) {
      const laborClientPrice = Math.round(result.laborCost * markupFactor);
      items.push({
        id: generateId(),
        description: 'Façonnage, assemblage et fabrication en atelier',
        quantity: 1,
        unit: 'forfait',
        unitPrice: laborClientPrice,
        total: laborClientPrice,
        itemType: 'labor',
      });
    }

    // 3. Other costs / Installation & Atelier overhead
    const extraCostsTotal = (result.otherCostsTotal || 0) + (result.overheadCost || 0);
    if (extraCostsTotal > 0) {
      const extraClientPrice = Math.round(extraCostsTotal * markupFactor);
      items.push({
        id: generateId(),
        description: 'Transport, quincaillerie annexe et installation sur site',
        quantity: 1,
        unit: 'forfait',
        unitPrice: extraClientPrice,
        total: extraClientPrice,
        itemType: 'other',
      });
    }

    if (items.length > 0) {
      setLineItems(items);
      showSuccess('✓ Lignes détaillées générées d\'après votre calcul.');
    }
  };

  // Build current quote object
  const buildCurrentQuote = (): Quote => {
    const defaultCalculation: CalculationInput = {
      materials: [],
      wastePercent: profile.defaultWastePercent || 5,
      labor: [],
      otherCosts: [],
      overheadType: 'percent',
      overheadValue: 0,
      pricingMode: 'margin',
      targetProfitPercent: profile.defaultMarginPercent || 25,
      roundingStep: profile.defaultRounding || 'none',
    };

    return {
      id: editingQuote?.id || generateId(),
      quoteNumber,
      createdAt,
      updatedAt: new Date().toISOString(),
      validUntil,
      status,
      customer,
      projectTitle,
      projectDescription,
      calculationInput: editingQuote?.calculationInput || fromCalculation?.input || defaultCalculation,
      calculationResult: editingQuote?.calculationResult || fromCalculation?.result || {
        rawMaterialCost: subtotal,
        wasteAmount: 0,
        adjustedMaterialCost: subtotal,
        laborCost: 0,
        otherCostsTotal: 0,
        directCost: subtotal,
        overheadCost: 0,
        totalCost: subtotal * 0.75,
        rawSellingPrice: finalTotal,
        roundedSellingPrice: finalTotal,
        profitAmount: finalTotal * 0.25,
        effectiveMarginPercent: 25,
        effectiveMarkupPercent: 33.3,
        isValid: true,
        errors: [],
      },
      detailLevel,
      lineItems,
      subtotal,
      discountPercent,
      discountAmount,
      finalTotal,
      depositConfig,
      depositAmount,
      balanceAmount,
      notes,
      paymentTerms,
    };
  };

  const handleSave = () => {
    const errors: Record<string, string> = {};

    // 1. Validate Project Title
    if (!projectTitle.trim()) {
      errors['quote-project-title'] = 'Veuillez renseigner un intitulé pour le projet.';
    }

    // 2. Validate Customer Name
    if (!customer.name.trim()) {
      errors['quote-customer-name'] = "Veuillez renseigner le nom ou l'entreprise du client.";
    }

    // 3. Validate Line Items
    if (lineItems.length === 0) {
      errors['quote-line-items'] = 'Veuillez ajouter au moins une ligne de prestation.';
    }

    for (const item of lineItems) {
      if (!item.description.trim()) {
        errors[`quote-line-desc-${item.id}`] = 'Veuillez renseigner la désignation de la prestation.';
      }
      if (item.quantity <= 0) {
        errors[`quote-line-qty-${item.id}`] = 'La quantité de la prestation doit être supérieure à 0.';
      }
      if (item.unitPrice < 0) {
        errors[`quote-line-price-${item.id}`] = "Le prix unitaire d'une prestation ne peut pas être négatif.";
      }
    }

    // 4. Validate Discount
    if (discountPercent < 0 || discountPercent > 100) {
      errors['quote-discount-percent'] = 'Le pourcentage de remise doit être compris entre 0% et 100%.';
    }

    // 5. Validate Deposit
    if (depositConfig.type === 'percent' && (depositConfig.value < 0 || depositConfig.value > 100)) {
      errors['quote-deposit-value'] = "Le pourcentage d'acompte doit être compris entre 0% et 100%.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstKey = Object.keys(errors)[0];
      setErrorMessage(errors[firstKey]);
      showError(errors[firstKey]);
      focusAndScrollToField(firstKey);
      return;
    }

    setValidationErrors({});
    setErrorMessage(null);
    const quote = buildCurrentQuote();
    onSaveQuote(quote);
    clearDraftQuote();
    clearDraftCalculation();
    setSaveSuccess(true);
    showSuccess(`✓ Devis N° ${quote.quoteNumber} enregistré avec succès.`);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleResetDraft = () => {
    if (window.confirm('Voulez-vous effacer ce brouillon et réinitialiser les champs ?')) {
      clearDraftQuote();
      if (editingQuote) {
        setCustomer(editingQuote.customer);
        setProjectTitle(editingQuote.projectTitle);
        setProjectDescription(editingQuote.projectDescription || '');
        setLineItems(editingQuote.lineItems);
        setDiscountPercent(editingQuote.discountPercent || 0);
        setDepositConfig(editingQuote.depositConfig);
        setPaymentTerms(editingQuote.paymentTerms || profile.defaultPaymentTerms || '');
        setNotes(editingQuote.notes || profile.footerNotes || '');
        setStatus(editingQuote.status);
      } else {
        setCustomer({ name: '', phone: '', email: '', address: '', city: profile.city || '' });
        setProjectTitle('Fabrication et pose sur mesure');
        setProjectDescription('');
        setLineItems([
          {
            id: generateId(),
            description: 'Fabrication métallique sur mesure',
            quantity: 1,
            unit: 'forfait',
            unitPrice: 50000,
            total: 50000,
          },
        ]);
        setDiscountPercent(0);
        setDepositConfig({ type: 'percent', value: 40 });
        setPaymentTerms(profile.defaultPaymentTerms || 'Acompte de 40% à la commande, solde à la livraison.');
        setNotes(profile.footerNotes || 'Devis valable 30 jours. Délais de fabrication convenus à la commande.');
        setStatus('Brouillon');
      }
      showInfo('Brouillon de devis réinitialisé.');
    }
  };

  const currentQuote = buildCurrentQuote();

  const handleReturnToCalculation = () => {
    if (onBackToCalculation) {
      onBackToCalculation(currentQuote);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-36 md:pb-24 lg:pb-12 animate-in fade-in duration-200">
      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-red-900 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="font-bold">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-red-700 hover:text-red-950 underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Retour à l'historique"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-teal-600" />
              {editingQuote ? `Édition Devis ${editingQuote.quoteNumber}` : 'Nouveau Devis'}
            </h1>
            <p className="text-xs text-slate-500">
              Renseignez les coordonnées client et les lignes de prestations à faire figurer sur le document.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Persistent Link Back to Calculator */}
          {(fromCalculation || editingQuote?.calculationInput || onBackToCalculation) && (
            <button
              onClick={handleReturnToCalculation}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-900 bg-teal-50 border border-teal-300 rounded-lg hover:bg-teal-100 transition-colors shadow-2xs"
              title="Ouvrir les coûts et la marge de ce devis dans le calculateur"
            >
              <Calculator className="w-3.5 h-3.5 text-teal-700" />
              <span>Retour au calcul</span>
            </button>
          )}

          <button
            onClick={handleResetDraft}
            className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-transparent"
            title="Effacer le brouillon en cours et réinitialiser"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Réinitialiser</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-teal-600" />
            <span>Aperçu Document</span>
          </button>

          <button
            onClick={() => downloadQuotePDF(currentQuote, profile)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            onClick={() => shareOnWhatsApp(currentQuote, profile)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300 shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-700" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-all shadow-xs"
          >
            {saveSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'Enregistré !' : 'Enregistrer le devis'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Client & Project Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-teal-600" />
              1. Informations Client
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="quote-customer-name" className="font-semibold text-slate-700 block mb-1">
                  Nom ou Entreprise du client *
                </label>
                <input
                  id="quote-customer-name"
                  type="text"
                  value={customer.name}
                  onChange={(e) => {
                    setCustomer({ ...customer, name: e.target.value });
                    if (validationErrors['quote-customer-name'] && e.target.value.trim()) {
                      setValidationErrors((prev) => {
                        const next = { ...prev };
                        delete next['quote-customer-name'];
                        return next;
                      });
                    }
                  }}
                  placeholder="Ex: M. Ousmane Diop / Villa Almadies"
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg font-medium text-slate-900 focus:bg-white transition-colors ${
                    validationErrors['quote-customer-name']
                      ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
                {validationErrors['quote-customer-name'] && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{validationErrors['quote-customer-name']}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="quote-customer-phone" className="font-semibold text-slate-700 block mb-1">
                  Numéro de Téléphone / WhatsApp
                </label>
                <input
                  id="quote-customer-phone"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="Ex: +221 77 123 45 67"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label htmlFor="quote-customer-email" className="font-semibold text-slate-700 block mb-1">
                  Email (Optionnel)
                </label>
                <input
                  id="quote-customer-email"
                  type="email"
                  value={customer.email || ''}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="client@domaine.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label htmlFor="quote-customer-address" className="font-semibold text-slate-700 block mb-1">
                  Adresse / Ville du chantier
                </label>
                <input
                  id="quote-customer-address"
                  type="text"
                  value={customer.address || ''}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  placeholder="Ex: Yoff, Cité Biagui"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* 2. Project Details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              2. Projet & Intitulé de l'Ouvrage
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="quote-project-title" className="font-semibold text-slate-700 block mb-1">
                  Intitulé du devis / Objet *
                </label>
                <input
                  id="quote-project-title"
                  type="text"
                  value={projectTitle}
                  onChange={(e) => {
                    setProjectTitle(e.target.value);
                    if (validationErrors['quote-project-title'] && e.target.value.trim()) {
                      setValidationErrors((prev) => {
                        const next = { ...prev };
                        delete next['quote-project-title'];
                        return next;
                      });
                    }
                  }}
                  placeholder="Ex: Fabrication et pose de 2 portes métalliques avec serrures"
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold text-slate-900 focus:bg-white transition-colors text-sm ${
                    validationErrors['quote-project-title']
                      ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-300 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
                {validationErrors['quote-project-title'] && (
                  <p className="mt-1 text-[11px] text-red-600 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{validationErrors['quote-project-title']}</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="quote-project-description" className="font-semibold text-slate-700 block mb-1">
                  Description détaillée des travaux
                </label>
                <textarea
                  id="quote-project-description"
                  rows={2}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Dimensions, spécifications techniques, traitement antirouille et finition..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Line Items */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  3. Lignes de Prestations (Visibles par le client)
                </h2>
                <p className="text-xs text-slate-500">
                  Désignation claire sans exposer vos marges internes.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {sourceCalculation && (sourceCalculation.result?.roundedSellingPrice || 0) > 0 && !lineItems.some((i) => i.itemType === 'service') && (
                  <button
                    type="button"
                    onClick={handleRestoreCalculatedLine}
                    className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Réinsérer prestation calculée</span>
                  </button>
                )}

                {sourceCalculation && (
                  <button
                    type="button"
                    onClick={handlePopulateDetailedFromCalculation}
                    className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-semibold underline cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Détailler selon le calcul</span>
                  </button>
                )}
              </div>
            </div>

            {/* Notice Banner: Source Calculation is preserved */}
            {sourceCalculation && (sourceCalculation.result?.roundedSellingPrice || 0) > 0 && !lineItems.some((i) => i.itemType === 'service') && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-teal-950 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span>Calcul d'atelier source préservé ({formatCurrency(sourceCalculation.result.roundedSellingPrice, currency)})</span>
                  </div>
                  <div className="text-[11px] text-teal-800">
                    La suppression d'une ligne du devis n'efface jamais votre calcul atelier sous-jacent. Vous pouvez la réinsérer à tout moment.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRestoreCalculatedLine}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinsérer la prestation ({formatCurrency(sourceCalculation.result.roundedSellingPrice, currency)})</span>
                </button>
              </div>
            )}

            {/* Line items table */}
            <div className="space-y-3">
              {lineItems.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400 space-y-2">
                  <p>Aucune prestation dans le devis.</p>
                  {sourceCalculation && (sourceCalculation.result?.roundedSellingPrice || 0) > 0 && (
                    <button
                      type="button"
                      onClick={handleRestoreCalculatedLine}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Réinsérer la prestation issue du calcul</span>
                    </button>
                  )}
                </div>
              ) : (
                lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bold text-slate-400 text-[11px]">
                          #{index + 1}
                        </span>
                        {item.itemType === 'service' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                            Prestation calculée
                          </span>
                        )}
                      </div>
                      <input
                        id={`quote-line-desc-${item.id}`}
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Désignation des travaux ou fournitures"
                        className={`flex-1 px-3 py-1.5 bg-white border rounded font-medium text-slate-900 transition-colors ${
                          validationErrors[`quote-line-desc-${item.id}`]
                            ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-slate-300 focus:ring-1 focus:ring-teal-500'
                        }`}
                      />
                      <button
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="col-span-1 sm:col-span-3">
                        <label htmlFor={`quote-line-qty-${item.id}`} className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          Qté *
                        </label>
                        <NumericInput
                          id={`quote-line-qty-${item.id}`}
                          value={item.quantity}
                          onChange={(val) => {
                            handleUpdateLineItem(item.id, 'quantity', val);
                            if (validationErrors[`quote-line-qty-${item.id}`]) {
                              setValidationErrors((prev) => {
                                const next = { ...prev };
                                delete next[`quote-line-qty-${item.id}`];
                                return next;
                              });
                            }
                          }}
                          onInvalidChange={(isInvalid, err) => {
                            setValidationErrors((prev) => {
                              const next = { ...prev };
                              if (isInvalid) next[`quote-line-qty-${item.id}`] = err || 'Quantité invalide';
                              else delete next[`quote-line-qty-${item.id}`];
                              return next;
                            });
                          }}
                          min={0.01}
                          allowZero={false}
                          placeholder="1"
                          inputClassName={`py-1 text-xs ${
                            validationErrors[`quote-line-qty-${item.id}`]
                              ? 'border-red-500 ring-1 ring-red-500'
                              : ''
                          }`}
                          ariaLabel={`Quantité ligne ${index + 1}`}
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-3">
                        <label htmlFor={`quote-line-unit-${item.id}`} className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          Unité
                        </label>
                        <input
                          id={`quote-line-unit-${item.id}`}
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleUpdateLineItem(item.id, 'unit', e.target.value)}
                          placeholder="ensemble, m, pce..."
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-teal-500 text-xs"
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-3">
                        <label htmlFor={`quote-line-price-${item.id}`} className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                          Prix Unit. ({currency}) *
                        </label>
                        <NumericInput
                          id={`quote-line-price-${item.id}`}
                          value={item.unitPrice}
                          onChange={(val) => {
                            handleUpdateLineItem(item.id, 'unitPrice', val);
                            if (validationErrors[`quote-line-price-${item.id}`]) {
                              setValidationErrors((prev) => {
                                const next = { ...prev };
                                delete next[`quote-line-price-${item.id}`];
                                return next;
                              });
                            }
                          }}
                          onInvalidChange={(isInvalid, err) => {
                            setValidationErrors((prev) => {
                              const next = { ...prev };
                              if (isInvalid) next[`quote-line-price-${item.id}`] = err || 'Prix invalide';
                              else delete next[`quote-line-price-${item.id}`];
                              return next;
                            });
                          }}
                          min={0}
                          placeholder="0"
                          inputClassName={`py-1 text-xs ${
                            validationErrors[`quote-line-price-${item.id}`]
                              ? 'border-red-500 ring-1 ring-red-500'
                              : ''
                          }`}
                          ariaLabel={`Prix unitaire ligne ${index + 1}`}
                        />
                      </div>

                      <div className="col-span-1 sm:col-span-3 text-right">
                        <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                          Total ligne
                        </label>
                        <div className="font-mono font-bold text-slate-900 text-xs sm:text-sm py-1 flex items-center justify-end">
                          {formatCurrency(item.total, currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <button
                onClick={handleAddLineItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une prestation</span>
              </button>
            </div>
          </div>

          {/* 4. Payment Terms & Notes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
              4. Modalités & Notes de bas de page
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="quote-payment-terms" className="font-semibold text-slate-700 block mb-1">
                  Conditions de règlement
                </label>
                <input
                  id="quote-payment-terms"
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Acompte à la commande, solde à la pose..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="quote-notes" className="font-semibold text-slate-700 block mb-1">
                  Notes & Garanties
                </label>
                <input
                  id="quote-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Garantie 1 an, délais de livraison..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Financials & Meta (4 cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[72px] lg:self-start">
          {/* Meta Card (Quote #, Dates, Status) */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
              Détails du document
            </h3>

            <div>
              <label htmlFor="quote-number" className="font-semibold text-slate-600 block mb-1">Numéro de Devis</label>
              <input
                id="quote-number"
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
              <div>
                <label htmlFor="quote-date-created" className="font-semibold text-slate-600 block mb-1">Date d'émission</label>
                <input
                  id="quote-date-created"
                  type="date"
                  value={createdAt}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-800"
                />
              </div>

              <div>
                <label htmlFor="quote-date-valid" className="font-semibold text-slate-600 block mb-1">Validité jusqu'au</label>
                <input
                  id="quote-date-valid"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-800"
                />
              </div>
            </div>

            <div>
              <label htmlFor="quote-status" className="font-semibold text-slate-600 block mb-1">Statut du Devis</label>
              <select
                id="quote-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-800"
              >
                <option value="Brouillon">📝 Brouillon</option>
                <option value="Envoyé">📤 Envoyé au client</option>
                <option value="Accepté">✅ Accepté (Validé)</option>
                <option value="Refusé">❌ Refusé</option>
                <option value="Terminé">🏁 Terminé & Livré</option>
              </select>
            </div>
          </div>

          {/* Totals & Deposit Summary Card */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg border border-slate-800 space-y-5">
            <h3 className="font-bold text-sm text-teal-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Coins className="w-4 h-4" />
              Récapitulatif Financier
            </h3>

            {/* Subtotal */}
            <div className="flex justify-between text-xs text-slate-300">
              <span>Sous-total prestations :</span>
              <span className="font-mono">{formatCurrency(subtotal, currency)}</span>
            </div>

            {/* Discount Option */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <label htmlFor="quote-discount-percent" className="text-slate-400">Remise commerciale :</label>
              <div className="w-24">
                <NumericInput
                  id="quote-discount-percent"
                  value={discountPercent}
                  onChange={(val) => setDiscountPercent(Math.min(100, Math.max(0, val)))}
                  min={0}
                  max={100}
                  suffix="%"
                  placeholder="0"
                  inputClassName="py-0.5 text-xs bg-slate-800 border-slate-700 text-white"
                  ariaLabel="Remise commerciale en pourcentage"
                />
              </div>
            </div>

            {/* Grand Total */}
            <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-center space-y-1">
              <div className="text-[10px] uppercase font-bold text-teal-400">Total Net à Payer</div>
              <div className="text-2xl font-black font-mono text-white">
                {formatCurrency(finalTotal, currency)}
              </div>
            </div>

            {/* Deposit & Balance */}
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Acompte à la commande :</span>
                <div className="flex items-center gap-1">
                  <select
                    id="quote-deposit-type"
                    value={depositConfig.type}
                    onChange={(e) =>
                      setDepositConfig({
                        ...depositConfig,
                        type: e.target.value as 'percent' | 'fixed',
                      })
                    }
                    className="bg-slate-800 border border-slate-700 text-[11px] rounded px-1.5 py-0.5 text-slate-300"
                  >
                    <option value="percent">%</option>
                    <option value="fixed">{currency}</option>
                  </select>
                  <div className="w-20">
                    <NumericInput
                      id="quote-deposit-value"
                      value={depositConfig.value}
                      onChange={(val) =>
                        setDepositConfig({
                          ...depositConfig,
                          value: Math.max(0, val),
                        })
                      }
                      min={0}
                      max={depositConfig.type === 'percent' ? 100 : undefined}
                      placeholder="0"
                      inputClassName="py-0.5 text-xs bg-slate-800 border-slate-700 text-white"
                      ariaLabel="Valeur de l'acompte"
                    />
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-950/60 rounded-lg border border-emerald-800/50 space-y-1.5">
                <div className="flex justify-between font-bold text-emerald-300">
                  <span>Montant Acompte :</span>
                  <span className="font-mono">{formatCurrency(depositAmount, currency)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Solde restant (livraison) :</span>
                  <span className="font-mono font-medium">{formatCurrency(balanceAmount, currency)}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleSave}
                className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer le Devis</span>
              </button>

              <button
                onClick={() => setShowPreviewModal(true)}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Générer / Visualiser le PDF</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Sticky Mobile / Tablet Action Bar */}
      <div className="lg:hidden fixed bottom-14 md:bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md text-white p-3 border-t border-slate-800 shadow-2xl flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-teal-400 font-bold uppercase">Total Net à Payer</div>
          <div className="text-base font-black font-mono">
            {formatCurrency(finalTotal, currency)}
          </div>
          {depositAmount > 0 && (
            <div className="text-[10px] text-emerald-400">
              Acompte : {formatCurrency(depositAmount, currency)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreviewModal(true)}
            className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs border border-slate-700 flex items-center gap-1 cursor-pointer"
            title="Visualiser le PDF"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Aperçu</span>
          </button>
          <button
            onClick={handleSave}
            className="py-2 px-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer</span>
          </button>
        </div>
      </div>

      {/* Quote Preview Modal */}
      <QuotePreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        quote={currentQuote}
        profile={profile}
      />
    </div>
  );
}
