import { X, HelpCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { CalculationInput, CalculationResult } from '../types';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  input: CalculationInput;
  result: CalculationResult;
  currencySymbol?: string;
}

export function CalculationBreakdownModal({
  isOpen,
  onClose,
  input,
  result,
  currencySymbol = 'FCFA',
}: Props) {
  if (!isOpen) return null;

  const isMargin = input.pricingMode === 'margin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <HelpCircle className="w-5 h-5 text-teal-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold">Détail et Transparence du Calcul</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-xs sm:text-sm text-slate-700">
          {/* Step 1: Matériaux et Pertes */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-semibold text-slate-900">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </span>
                Coût des Matériaux + Pertes
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold pl-8 sm:pl-0">{formatCurrency(result.adjustedMaterialCost, currencySymbol)}</span>
            </div>
            <div className="pl-8 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between gap-2">
                <span>Total brut des matériaux :</span>
                <span className="font-mono">{formatCurrency(result.rawMaterialCost, currencySymbol)}</span>
              </div>
              <div className="flex justify-between gap-2 text-amber-700">
                <span>Chutes / Pertes d'atelier ({input.wastePercent}%) :</span>
                <span className="font-mono">+ {formatCurrency(result.wasteAmount, currencySymbol)}</span>
              </div>
              <div className="pt-1 text-[11px] text-slate-500 italic">
                Formule : Matériaux bruts × (1 + {input.wastePercent} / 100)
              </div>
            </div>
          </div>

          {/* Step 2: Main d'œuvre */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-semibold text-slate-900">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </span>
                Main-d'œuvre directe
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold pl-8 sm:pl-0">{formatCurrency(result.laborCost, currencySymbol)}</span>
            </div>
            <div className="pl-8 text-xs text-slate-600 space-y-1">
              {input.labor.length === 0 ? (
                <div className="text-slate-400 italic">Aucune heure de main-d'œuvre saisie</div>
              ) : (
                input.labor.map((l) => (
                  <div key={l.id} className="flex justify-between gap-2">
                    <span>{l.task || 'Tâche'} ({l.hours}h × {formatCurrency(l.hourlyRate, currencySymbol)}/h) :</span>
                    <span className="font-mono">{formatCurrency(l.hours * l.hourlyRate, currencySymbol)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Step 3: Autres coûts directs & Fonctionnement */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 font-semibold text-slate-900">
              <span className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </span>
                Autres coûts & Frais supplémentaires
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold pl-8 sm:pl-0">{formatCurrency(result.otherCostsTotal + result.overheadCost, currencySymbol)}</span>
            </div>
            <div className="pl-8 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between gap-2">
                <span>Autres coûts directs (transport, consommables...) :</span>
                <span className="font-mono">{formatCurrency(result.otherCostsTotal, currencySymbol)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Frais de fonctionnement ({input.overheadType === 'percent' ? `${input.overheadValue}% des coûts directs` : 'Fixe'}) :</span>
                <span className="font-mono">{formatCurrency(result.overheadCost, currencySymbol)}</span>
              </div>
            </div>
          </div>

          {/* Step 4: Coût de revient total */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-teal-50 border border-teal-200 flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 text-teal-950 font-bold">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
              <span>COÛT DE REVIENT TOTAL (Dépenses réelles) :</span>
            </span>
            <span className="text-base font-mono pl-7 sm:pl-0">{formatCurrency(result.totalCost, currencySymbol)}</span>
          </div>

          {/* Step 5: Calcul de la marge et prix de vente */}
          <div className="p-3.5 sm:p-4 rounded-lg bg-slate-900 text-slate-100 space-y-3">
            <div className="flex items-center justify-between font-semibold text-teal-400 text-xs sm:text-sm">
              <span>Étape 5 : Prix de vente avec {isMargin ? 'Marge Réelle' : 'Coefficient de Marque'} ({input.targetProfitPercent}%)</span>
            </div>
            
            <div className="space-y-2 text-xs text-slate-300">
              {isMargin ? (
                <>
                  <div className="p-2.5 rounded bg-slate-800 font-mono text-teal-300 text-xs break-all">
                    Prix de vente = Coût total / (1 - Marge)
                    <br />
                    = {formatCurrency(result.totalCost, '')} / (1 - {input.targetProfitPercent / 100})
                    <br />
                    = {formatCurrency(result.totalCost, '')} / {(1 - input.targetProfitPercent / 100).toFixed(2)}
                    <br />
                    = {formatCurrency(result.rawSellingPrice, currencySymbol, true)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    💡 La <strong>marge bénéficiaire réelle</strong> garantit que sur chaque FCFA encaissé chez le client, exactement {input.targetProfitPercent}% reste en bénéfice net pour l'atelier.
                  </p>
                </>
              ) : (
                <>
                  <div className="p-2.5 rounded bg-slate-800 font-mono text-teal-300 text-xs break-all">
                    Prix de vente = Coût total × (1 + Taux de marque)
                    <br />
                    = {formatCurrency(result.totalCost, '')} × (1 + {input.targetProfitPercent / 100})
                    <br />
                    = {formatCurrency(result.rawSellingPrice, currencySymbol, true)}
                  </div>
                </>
              )}

              {input.roundingStep !== 'none' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-slate-700 text-amber-300">
                  <span>Arrondi sélectionné ({input.roundingStep} FCFA) :</span>
                  <span className="font-mono font-bold">{formatCurrency(result.roundedSellingPrice, currencySymbol)}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-2 border-t border-slate-700 text-emerald-400 font-bold text-xs sm:text-sm">
                <span>Bénéfice net d'atelier :</span>
                <span className="font-mono">+{formatCurrency(result.profitAmount, currencySymbol)} ({formatPercent(result.effectiveMarginPercent)} marge)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
