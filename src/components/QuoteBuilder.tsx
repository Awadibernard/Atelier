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

      // If user wants grouped summary (standard for workshops)
      if (input.materials.length > 0 || result.laborCost > 0) {
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
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Convert calculation items into detailed breakdown with proportional markup on all components
  const handlePopulateDetailedFromCalculation = () => {
    const calc = fromCalculation || (editingQuote?.calculationInput && editingQuote?.calculationResult ? {
      input: editingQuote.calculationInput,
      result: editingQuote.calculationResult,
    } : null);

    if (!calc) return;
    const { input, result } = calc;

    const items: QuoteLineItem[] = [];
    const markupFactor = result.totalCost > 0 ? result.roundedSellingPrice / result.totalCost : 1.25;

    // 1. Materials
    input.materials.forEach((m) => {
      // Direct raw unit cost with waste factored in
      const effectiveUnitCost = m.unitPrice * (1 + (input.wastePercent || 0) / 100);
      const clientPrice = Math.round(effectiveUnitCost * markupFactor);
      items.push({
        id: generateId(),
        description: `Fourniture : ${m.name || 'Matériau'}`,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: clientPrice,
        total: Math.round(m.quantity * clientPrice),
        itemType: 'material',
      });
    });

    // 2. Labor / Fabrication
    if (result.laborCost > 0) {
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
    // 1. Validate Project Title
    if (!projectTitle.trim()) {
      setErrorMessage('Veuillez saisir un intitulé pour le projet.');
      showError('Veuillez renseigner un intitulé pour le projet.');
      focusAndScrollToField('quote-project-title');
      return;
    }

    // 2. Validate Customer Name
    if (!customer.name.trim()) {
      setErrorMessage('Veuillez renseigner le nom ou l\'entreprise du client.');
      showError('Veuillez renseigner le nom ou l\'entreprise du client.');
      focusAndScrollToField('quote-customer-name');
      return;
    }

    // 3. Validate Line Items
    if (lineItems.length === 0) {
      setErrorMessage('Veuillez ajouter au moins une ligne de prestation.');
      showError('Veuillez ajouter au moins une ligne de prestation.');
      return;
    }

    for (const item of lineItems) {
      if (!item.description.trim()) {
        setErrorMessage('Veuillez renseigner la désignation de la prestation.');
        showError('Veuillez renseigner la désignation de la prestation.');
        focusAndScrollToField(`quote-line-desc-${item.id}`);
        return;
      }
      if (item.quantity <= 0) {
        setErrorMessage('La quantité de la prestation doit être supérieure à 0.');
        showError('La quantité de la prestation doit être supérieure à 0.');
        focusAndScrollToField(`quote-line-qty-${item.id}`);
        return;
      }
      if (item.unitPrice < 0) {
        setErrorMessage('Le prix unitaire d\'une prestation ne peut pas être négatif.');
        showError('Le prix unitaire d\'une prestation ne peut pas être négatif.');
        focusAndScrollToField(`quote-line-price-${item.id}`);
        return;
      }
    }

    // 4. Validate Discount
    if (discountPercent < 0 || discountPercent > 100) {
      setErrorMessage('Le pourcentage de remise doit être compris entre 0% et 100%.');
      showError('Le pourcentage de remise doit être compris entre 0% et 100%.');
      focusAndScrollToField('quote-discount-percent');
      return;
    }

    // 5. Validate Deposit
    if (depositConfig.type === 'percent' && (depositConfig.value < 0 || depositConfig.value > 100)) {
      setErrorMessage('Le pourcentage d\'acompte doit être compris entre 0% et 100%.');
      showError('Le pourcentage d\'acompte doit être compris entre 0% et 100%.');
      focusAndScrollToField('quote-deposit-value');
      return;
    }

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
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 md:pb-12 animate-in fade-in duration-200">
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
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Ex: M. Ousmane Diop / Villa Almadies"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
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
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Ex: Fabrication et pose de 2 portes métalliques avec serrures"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500 text-sm"
                />
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

              {(fromCalculation || editingQuote?.calculationInput) && (
                <button
                  onClick={handlePopulateDetailedFromCalculation}
                  className="inline-flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-semibold underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Détailler selon le calcul</span>
                </button>
              )}
            </div>

            {/* Line items table */}
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-400 text-[11px]">
                      #{index + 1}
                    </span>
                    <input
                      id={`quote-line-desc-${item.id}`}
                      type="text"
                      value={item.description}
                      onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Désignation des travaux ou fournitures"
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-900 focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                      title="Supprimer la ligne"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 items-center">
                    <div>
                      <label htmlFor={`quote-line-qty-${item.id}`} className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Qté
                      </label>
                      <input
                        id={`quote-line-qty-${item.id}`}
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => handleUpdateLineItem(item.id, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label htmlFor={`quote-line-unit-${item.id}`} className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Unité
                      </label>
                      <input
                        id={`quote-line-unit-${item.id}`}
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleUpdateLineItem(item.id, 'unit', e.target.value)}
                        placeholder="ensemble, m, pce..."
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label htmlFor={`quote-line-price-${item.id}`} className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Prix Unit. ({currency})
                      </label>
                      <input
                        id={`quote-line-price-${item.id}`}
                        type="number"
                        min="0"
                        step="100"
                        value={item.unitPrice === 0 ? '' : item.unitPrice}
                        onChange={(e) => handleUpdateLineItem(item.id, 'unitPrice', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div className="text-right">
                      <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                        Total ligne
                      </label>
                      <div className="font-mono font-bold text-slate-900 text-xs py-1">
                        {formatCurrency(item.total, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

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
        <div className="lg:col-span-4 space-y-6">
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

            <div className="grid grid-cols-2 gap-2">
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
              <div className="flex items-center gap-1 w-20">
                <input
                  id="quote-discount-percent"
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent === 0 ? '' : discountPercent}
                  onChange={(e) => setDiscountPercent(sanitizeNumber(e.target.value))}
                  placeholder="0"
                  className="w-full px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-right font-mono text-xs text-white"
                />
                <span className="text-slate-400">%</span>
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
                  <input
                    id="quote-deposit-value"
                    type="number"
                    min="0"
                    value={depositConfig.value}
                    onChange={(e) =>
                      setDepositConfig({
                        ...depositConfig,
                        value: sanitizeNumber(e.target.value),
                      })
                    }
                    className="w-16 px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-right font-mono text-xs text-white"
                  />
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
                className="w-full py-3 px-4 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer le Devis</span>
              </button>

              <button
                onClick={() => setShowPreviewModal(true)}
                className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors border border-slate-700 flex items-center justify-center gap-2"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Générer / Visualiser le PDF</span>
              </button>
            </div>
          </div>
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
