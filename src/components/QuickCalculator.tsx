import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Calculator,
  HelpCircle,
  FileText,
  BookmarkCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Layers,
  Percent,
  Coins,
  ArrowRight,
  CheckCircle,
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
  BusinessProfile,
} from '../types';
import { calculateQuote, sanitizeNumber } from '../engine/calculator';
import { formatCurrency, formatPercent, generateId } from '../utils/formatters';
import { CalculationBreakdownModal } from './CalculationBreakdownModal';

interface Props {
  profile: BusinessProfile;
  materialsLibrary?: MaterialLibraryItem[];
  materialLibrary?: MaterialLibraryItem[];
  laborRatesLibrary?: LaborRateLibraryItem[];
  laborLibrary?: LaborRateLibraryItem[];
  templates?: WorkshopTemplate[];
  initialCalculation?: CalculationInput;
  initialTemplate?: WorkshopTemplate | null;
  onConvertToQuote?: (input: CalculationInput, result: CalculationResult) => void;
  onGenerateQuote?: (input: CalculationInput, result: CalculationResult) => void;
  onOpenTemplates?: () => void;
  onSaveCalculation?: (title: string, input: CalculationInput, result: CalculationResult) => void;
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
  initialCalculation,
  initialTemplate,
  onConvertToQuote,
  onGenerateQuote,
  onOpenTemplates,
  onSaveCalculation,
}: Props) {
  const allMaterials = materialsLibrary || materialLibrary || [];
  const allLaborRates = laborRatesLibrary || laborLibrary || [];
  const handleQuoteClick = onGenerateQuote || onConvertToQuote;
  const currency = profile.currencySymbol || 'FCFA';

  // State
  const [materials, setMaterials] = useState<MaterialItem[]>(
    initialCalculation?.materials || [
      { id: generateId(), name: 'Tube carré 40×40', quantity: 12, unit: 'm', unitPrice: 2000 },
      { id: generateId(), name: 'Tôle plane 2mm', quantity: 2, unit: 'm2', unitPrice: 5000 },
    ]
  );

  const [wastePercent, setWastePercent] = useState<number>(
    initialCalculation?.wastePercent ?? profile.defaultWastePercent ?? 5
  );

  const [labor, setLabor] = useState<LaborItem[]>(
    initialCalculation?.labor || [
      { id: generateId(), task: 'Découpe & Soudure métallique', hours: 8, hourlyRate: profile.defaultLaborRate || 2500 },
    ]
  );

  const [otherCosts, setOtherCosts] = useState<OtherCostItem[]>(
    initialCalculation?.otherCosts || [
      { id: generateId(), description: 'Transport et livraison', amount: 5000, category: 'transport' },
    ]
  );

  const [overheadType, setOverheadType] = useState<OverheadType>(
    initialCalculation?.overheadType || 'percent'
  );
  const [overheadValue, setOverheadValue] = useState<number>(
    initialCalculation?.overheadValue || 0
  );

  const [pricingMode, setPricingMode] = useState<PricingMode>(
    initialCalculation?.pricingMode || 'margin'
  );
  const [targetProfitPercent, setTargetProfitPercent] = useState<number>(
    initialCalculation?.targetProfitPercent ?? profile.defaultMarginPercent ?? 25
  );

  const [roundingStep, setRoundingStep] = useState<RoundingStep>(
    initialCalculation?.roundingStep ?? profile.defaultRounding ?? 'none'
  );

  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showQuickAddMaterial, setShowQuickAddMaterial] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Load initialTemplate when provided
  useEffect(() => {
    if (initialTemplate) {
      setMaterials(
        initialTemplate.defaultMaterials.map((m) => ({ ...m, id: generateId() }))
      );
      setWastePercent(initialTemplate.wastePercent ?? 5);
      setLabor(
        initialTemplate.defaultLabor.map((l) => ({ ...l, id: generateId() }))
      );
      setOtherCosts(
        initialTemplate.defaultOtherCosts.map((o) => ({ ...o, id: generateId() }))
      );
      setTargetProfitPercent(initialTemplate.targetMarginPercent ?? 25);
    }
  }, [initialTemplate]);

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
  ]);

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

  // Load Template
  const handleApplyTemplate = (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl) return;

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

    setWastePercent(tpl.wastePercent || 5);
    setTargetProfitPercent(tpl.targetMarginPercent || 25);
    setSelectedTemplateId(tplId);
  };

  // Reset
  const handleReset = () => {
    if (window.confirm('Réinitialiser tous les champs du calculateur ?')) {
      setMaterials([]);
      setLabor([]);
      setOtherCosts([]);
      setWastePercent(profile.defaultWastePercent || 5);
      setOverheadValue(0);
      setTargetProfitPercent(profile.defaultMarginPercent || 25);
      setRoundingStep(profile.defaultRounding || 'none');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 md:pb-12 animate-in fade-in duration-200">
      {/* Top Banner & Template Quick Loader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
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
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            title="Effacer et réinitialiser"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

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
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
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
                <span className="text-xs text-slate-400 block">Total Matériaux</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {formatCurrency(result.rawMaterialCost, currency)}
                </span>
              </div>
            </div>

            {/* Material Lines */}
            <div className="space-y-2.5">
              {materials.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                  Aucun matériau ajouté. Cliquez sur "Ajouter un matériau" ci-dessous.
                </div>
              ) : (
                materials.map((mat, index) => {
                  const subtotal = (mat.quantity || 0) * (mat.unitPrice || 0);
                  return (
                    <div
                      key={mat.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500 text-[11px]">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={mat.name}
                          onChange={(e) => handleUpdateMaterial(mat.id, 'name', e.target.value)}
                          placeholder="Nom du matériau (ex: Tube carré 40×40)"
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                        />
                        <button
                          onClick={() => handleRemoveMaterial(mat.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="Supprimer la ligne"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 items-center">
                        {/* Quantity */}
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                            Quantité
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={mat.quantity === 0 ? '' : mat.quantity}
                            onChange={(e) => handleUpdateMaterial(mat.id, 'quantity', e.target.value)}
                            placeholder="1"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                            Unité
                          </label>
                          <select
                            value={mat.unit}
                            onChange={(e) => handleUpdateMaterial(mat.id, 'unit', e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                          >
                            {COMMON_UNITS.map((u) => (
                              <option key={u.value} value={u.value}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Unit Price */}
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                            Prix Unit. ({currency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={mat.unitPrice === 0 ? '' : mat.unitPrice}
                            onChange={(e) => handleUpdateMaterial(mat.id, 'unitPrice', e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="col-span-3 sm:col-span-1 text-right">
                          <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                            Sous-total
                          </label>
                          <div className="font-mono font-bold text-slate-900 text-xs py-1">
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

            {/* Waste / Loss Section */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-600" />
                  Chutes / Pertes de matière (%) :
                </div>
                <div className="text-[11px] text-slate-500">
                  Compense les découpes, chutes métalliques et pertes atelier.
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-24">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={wastePercent === 0 ? '' : wastePercent}
                    onChange={(e) => setWastePercent(Math.max(0, sanitizeNumber(e.target.value)))}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-right font-mono font-bold text-xs focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-600">%</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Ajusté (+ {formatCurrency(result.wasteAmount, currency)})</span>
                  <span className="font-mono text-xs font-bold text-amber-900">
                    {formatCurrency(result.adjustedMaterialCost, currency)}
                  </span>
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
                  Main-d'œuvre & Temps d'atelier
                </h2>
                <p className="text-xs text-slate-500">Soudure, découpe, assemblage, peinture, pose...</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Main-d'œuvre</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {formatCurrency(result.laborCost, currency)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              {labor.length === 0 ? (
                <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                  Aucune heure de main d'œuvre ajoutée.
                </div>
              ) : (
                labor.map((l, index) => {
                  const subtotal = (l.hours || 0) * (l.hourlyRate || 0);
                  return (
                    <div
                      key={l.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500 text-[11px]">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={l.task}
                          onChange={(e) => handleUpdateLabor(l.id, 'task', e.target.value)}
                          placeholder="Tâche (ex: Découpe & Soudure à l'arc)"
                          className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                        />
                        <button
                          onClick={() => handleRemoveLabor(l.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                            Heures estimées
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={l.hours === 0 ? '' : l.hours}
                            onChange={(e) => handleUpdateLabor(l.id, 'hours', e.target.value)}
                            placeholder="1"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                            Taux horaire ({currency}/h)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={l.hourlyRate === 0 ? '' : l.hourlyRate}
                            onChange={(e) => handleUpdateLabor(l.id, 'hourlyRate', e.target.value)}
                            placeholder="2500"
                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono text-slate-800 focus:ring-1 focus:ring-teal-500"
                          />
                        </div>

                        <div className="text-right">
                          <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">
                            Coût tâche
                          </label>
                          <div className="font-mono font-bold text-slate-900 text-xs py-1">
                            {formatCurrency(subtotal, currency)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => handleAddLabor()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une tâche</span>
              </button>

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
                    + Choisir un tarif type...
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

          {/* SECTION C: AUTRES COÛTS & FRAIS SUPPLÉMENTAIRES */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-teal-100 text-teal-800 text-xs font-black flex items-center justify-center">
                    C
                  </span>
                  Autres Coûts Directs & Frais de Fonctionnement
                </h2>
                <p className="text-xs text-slate-500">Transport, électricité, sous-traitance, consommables...</p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block">Total Annexes</span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {formatCurrency(result.otherCostsTotal + result.overheadCost, currency)}
                </span>
              </div>
            </div>

            {/* Other costs list */}
            <div className="space-y-2">
              {otherCosts.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                >
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => handleUpdateOtherCost(item.id, 'description', e.target.value)}
                    placeholder="Description (ex: Transport sur chantier)"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-slate-800 focus:ring-1 focus:ring-teal-500"
                  />
                  <div className="w-32">
                    <input
                      type="number"
                      min="0"
                      value={item.amount === 0 ? '' : item.amount}
                      onChange={(e) => handleUpdateOtherCost(item.id, 'amount', e.target.value)}
                      placeholder="Montant FCFA"
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-right font-mono font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveOtherCost(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
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

              <div className="flex items-center gap-2">
                <select
                  value={overheadType}
                  onChange={(e) => setOverheadType(e.target.value as OverheadType)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700"
                >
                  <option value="percent">% Coûts directs</option>
                  <option value="fixed">Montant fixe ({currency})</option>
                </select>

                <input
                  type="number"
                  min="0"
                  value={overheadValue === 0 ? '' : overheadValue}
                  onChange={(e) => setOverheadValue(Math.max(0, sanitizeNumber(e.target.value)))}
                  placeholder="0"
                  className="w-24 px-2 py-1 bg-white border border-slate-300 rounded font-mono text-right text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: LIVE PRICING & MARGIN CARD ================= */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-18">
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

            {/* Target Percentage Slider & Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-800">
                  {pricingMode === 'margin' ? 'Taux de Marge Cible :' : 'Pourcentage de Marque :'}
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="1"
                    max={pricingMode === 'margin' ? 95 : 200}
                    value={targetProfitPercent}
                    onChange={(e) => setTargetProfitPercent(sanitizeNumber(e.target.value))}
                    className="w-16 px-2 py-1 bg-white border border-slate-300 rounded font-mono font-bold text-right text-xs focus:ring-1 focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-700">%</span>
                </div>
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
                <button onClick={() => setTargetProfitPercent(15)} className="hover:text-teal-700">15%</button>
                <button onClick={() => setTargetProfitPercent(20)} className="hover:text-teal-700">20%</button>
                <button onClick={() => setTargetProfitPercent(25)} className="hover:text-teal-700 font-bold text-slate-700">25% (Standard)</button>
                <button onClick={() => setTargetProfitPercent(30)} className="hover:text-teal-700 font-bold text-slate-700">30%</button>
                <button onClick={() => setTargetProfitPercent(40)} className="hover:text-teal-700">40%</button>
                <button onClick={() => setTargetProfitPercent(50)} className="hover:text-teal-700">50%</button>
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

          {/* MAIN PROMINENT RESULTS CARD (As required in Section 4) */}
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
                <span>Chutes / Pertes ({wastePercent}%) :</span>
                <span className="font-mono text-amber-400">+{formatCurrency(result.wasteAmount, currency)}</span>
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
              <button
                onClick={() => handleQuoteClick?.(calculationInput, result)}
                disabled={!result.isValid || result.roundedSellingPrice === 0}
                className="w-full py-3.5 px-4 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 hover:scale-[1.01]"
              >
                <FileText className="w-4 h-4" />
                <span>Créer le Devis à partir de ce calcul</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowFormulaModal(true)}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors text-center"
              >
                🔍 Afficher le détail des formules mathématiques
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Sticky Mobile Summary Bar */}
      <div className="md:hidden fixed bottom-14 left-0 right-0 z-30 bg-slate-900 text-white p-3 border-t border-slate-800 shadow-2xl flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-teal-400 font-bold uppercase">Prix Conseillé</div>
          <div className="text-base font-black font-mono">
            {formatCurrency(result.roundedSellingPrice, currency)}
          </div>
          <div className="text-[10px] text-slate-400">
            Coût : {formatCurrency(result.totalCost, '')} • Marge {formatPercent(result.effectiveMarginPercent)}
          </div>
        </div>

        <button
          onClick={() => handleQuoteClick?.(calculationInput, result)}
          disabled={!result.isValid || result.roundedSellingPrice === 0}
          className="py-2 px-3.5 bg-teal-500 text-slate-950 font-extrabold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Faire Devis</span>
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
    </div>
  );
}
