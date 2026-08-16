import { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Download,
  Share2,
  Printer,
  Eye,
  Plus,
  Trash2,
  Calendar,
  User,
  Building2,
  Coins,
  CheckCircle2,
  ArrowLeft,
  Layers,
  Sparkles,
  Percent,
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
import { calculateDeposit, roundPrice, sanitizeNumber } from '../engine/calculator';
import {
  formatCurrency,
  formatDateShort,
  getTodayDateString,
  addDaysToDateString,
  generateId,
} from '../utils/formatters';
import { QuotePreviewModal } from './QuotePreviewModal';
import { downloadQuotePDF } from '../utils/pdfGenerator';
import { shareOnWhatsApp } from '../utils/whatsappShare';

interface Props {
  profile: BusinessProfile;
  editingQuote?: Quote | null;
  fromCalculation?: {
    input: CalculationInput;
    result: CalculationResult;
  } | null;
  onSaveQuote: (quote: Quote) => void;
  onCancel: () => void;
  nextQuoteNumber: string;
}

export function QuoteBuilder({
  profile,
  editingQuote,
  fromCalculation,
  onSaveQuote,
  onCancel,
  nextQuoteNumber,
}: Props) {
  const currency = profile.currencySymbol || 'FCFA';

  // Initial Customer state
  const [customer, setCustomer] = useState<CustomerInfo>(
    editingQuote?.customer || {
      name: '',
      phone: '',
      email: '',
      address: '',
      city: profile.city || '',
    }
  );

  // Quote Meta
  const [quoteNumber, setQuoteNumber] = useState<string>(
    editingQuote?.quoteNumber || nextQuoteNumber
  );
  const [createdAt, setCreatedAt] = useState<string>(
    editingQuote?.createdAt ? editingQuote.createdAt.substring(0, 10) : getTodayDateString()
  );
  const [validUntil, setValidUntil] = useState<string>(
    editingQuote?.validUntil
      ? editingQuote.validUntil.substring(0, 10)
      : addDaysToDateString(getTodayDateString(), profile.defaultValidityDays || 30)
  );
  const [status, setStatus] = useState<QuoteStatus>(editingQuote?.status || 'Brouillon');
  const [projectTitle, setProjectTitle] = useState<string>(
    editingQuote?.projectTitle || 'Fabrication et pose sur mesure'
  );
  const [projectDescription, setProjectDescription] = useState<string>(
    editingQuote?.projectDescription || ''
  );

  // Detail level for customer
  const [detailLevel, setDetailLevel] = useState<ClientDetailLevel>(
    editingQuote?.detailLevel || 'grouped'
  );

  // Line items
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>(() => {
    if (editingQuote?.lineItems && editingQuote.lineItems.length > 0) {
      return editingQuote.lineItems;
    }

    if (fromCalculation) {
      const { input, result } = fromCalculation;

      // If user wants grouped summary (standard for workshops)
      if (input.materials.length > 0) {
        return [
          {
            id: generateId(),
            description: `Fabrication de l'ouvrage selon spécifications (Matières & Réalisation)`,
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
        description: 'Fabrication métallique sur mesure',
        quantity: 1,
        unit: 'forfait',
        unitPrice: 50000,
        total: 50000,
      },
    ];
  });

  // Discount
  const [discountPercent, setDiscountPercent] = useState<number>(
    editingQuote?.discountPercent || 0
  );

  // Deposit Config
  const [depositConfig, setDepositConfig] = useState<DepositConfig>(
    editingQuote?.depositConfig || {
      type: 'percent',
      value: 40,
    }
  );

  // Notes and payment terms
  const [paymentTerms, setPaymentTerms] = useState<string>(
    editingQuote?.paymentTerms ?? profile.defaultPaymentTerms ?? 'Acompte de 40% à la commande, solde à la livraison.'
  );
  const [notes, setNotes] = useState<string>(
    editingQuote?.notes ?? profile.footerNotes ?? 'Devis valable 30 jours. Délais de fabrication convenus à la commande.'
  );

  // Preview Modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // Convert calculation items into detailed breakdown
  const handlePopulateDetailedFromCalculation = () => {
    if (!fromCalculation) return;
    const { input, result } = fromCalculation;

    const items: QuoteLineItem[] = [];

    // Materials
    input.materials.forEach((m) => {
      // Calculate unit price reflecting margin
      const markupFactor = result.totalCost > 0 ? result.roundedSellingPrice / result.totalCost : 1.25;
      const clientPrice = Math.round(m.unitPrice * markupFactor);
      items.push({
        id: generateId(),
        description: `Fourniture : ${m.name}`,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: clientPrice,
        total: Math.round(m.quantity * clientPrice),
        itemType: 'material',
      });
    });

    // Labor / Fabrication
    if (result.laborCost > 0) {
      const laborClientPrice = Math.round(
        result.laborCost * (result.totalCost > 0 ? result.roundedSellingPrice / result.totalCost : 1.25)
      );
      items.push({
        id: generateId(),
        description: 'Façonnage, soudure et montage en atelier',
        quantity: 1,
        unit: 'forfait',
        unitPrice: laborClientPrice,
        total: laborClientPrice,
        itemType: 'labor',
      });
    }

    // Other costs / Installation
    if (result.otherCostsTotal > 0) {
      items.push({
        id: generateId(),
        description: 'Transport, quincaillerie et pose sur site',
        quantity: 1,
        unit: 'forfait',
        unitPrice: result.otherCostsTotal,
        total: result.otherCostsTotal,
        itemType: 'other',
      });
    }

    setLineItems(items);
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
    if (!projectTitle.trim()) {
      alert('Veuillez saisir un intitulé pour le projet.');
      return;
    }
    const quote = buildCurrentQuote();
    onSaveQuote(quote);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const currentQuote = buildCurrentQuote();

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 md:pb-12 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title="Retour"
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
                <label className="font-semibold text-slate-700 block mb-1">
                  Nom ou Entreprise du client *
                </label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  placeholder="Ex: M. Ousmane Diop / Villa Almadies"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Numéro de Téléphone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  placeholder="Ex: +221 77 123 45 67"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email (Optionnel)
                </label>
                <input
                  type="email"
                  value={customer.email || ''}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  placeholder="client@domaine.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Adresse / Ville du chantier
                </label>
                <input
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
                <label className="font-semibold text-slate-700 block mb-1">
                  Intitulé du devis / Objet *
                </label>
                <input
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="Ex: Fabrication et pose de 2 portes métalliques avec serrures"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-teal-500 text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Description détaillée des travaux
                </label>
                <textarea
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

              {fromCalculation && (
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
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Qté
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.quantity === 0 ? '' : item.quantity}
                        onChange={(e) => handleUpdateLineItem(item.id, 'quantity', e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Unité
                      </label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleUpdateLineItem(item.id, 'unit', e.target.value)}
                        placeholder="ensemble, m, pce..."
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Prix Unit. ({currency})
                      </label>
                      <input
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
                <label className="font-semibold text-slate-700 block mb-1">
                  Conditions de règlement
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Acompte à la commande, solde à la pose..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Notes & Garanties
                </label>
                <input
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
              <label className="font-semibold text-slate-600 block mb-1">Numéro de Devis</label>
              <input
                type="text"
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Date d'émission</label>
                <input
                  type="date"
                  value={createdAt}
                  onChange={(e) => setCreatedAt(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Validité jusqu'au</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-600 block mb-1">Statut du Devis</label>
              <select
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
              <span className="text-slate-400">Remise commerciale :</span>
              <div className="flex items-center gap-1 w-20">
                <input
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
