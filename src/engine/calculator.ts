import {
  CalculationInput,
  CalculationResult,
  DepositConfig,
  LaborItem,
  MaterialItem,
  OtherCostItem,
  OverheadType,
  PricingMode,
  RoundingStep,
} from '../types';

/**
 * Sanitizes numeric input to avoid NaN, Infinity, negative numbers or floating point weirdness
 */
export function sanitizeNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(parsed) || !isFinite(parsed)) return fallback;
  return parsed;
}

/**
 * Calculates the raw sum of materials (quantity * unitPrice)
 */
export function calculateMaterialCost(materials: MaterialItem[]): number {
  if (!Array.isArray(materials) || materials.length === 0) return 0;
  return materials.reduce((acc, item) => {
    const qty = Math.max(0, sanitizeNumber(item.quantity));
    const price = Math.max(0, sanitizeNumber(item.unitPrice));
    return acc + qty * price;
  }, 0);
}

/**
 * Calculates waste / loss amount based on raw material cost and waste percentage
 */
export function calculateWaste(rawCost: number, wastePercent: number): number {
  const safeRaw = Math.max(0, sanitizeNumber(rawCost));
  const safeWaste = Math.max(0, sanitizeNumber(wastePercent));
  return safeRaw * (safeWaste / 100);
}

/**
 * Calculates total labor cost (hours * hourlyRate)
 */
export function calculateLaborCost(labor: LaborItem[]): number {
  if (!Array.isArray(labor) || labor.length === 0) return 0;
  return labor.reduce((acc, item) => {
    const hours = Math.max(0, sanitizeNumber(item.hours));
    const rate = Math.max(0, sanitizeNumber(item.hourlyRate));
    return acc + hours * rate;
  }, 0);
}

/**
 * Calculates additional / other direct costs (transport, consumables, electricity, etc.)
 */
export function calculateAdditionalCosts(otherCosts: OtherCostItem[]): number {
  if (!Array.isArray(otherCosts) || otherCosts.length === 0) return 0;
  return otherCosts.reduce((acc, item) => {
    const amount = Math.max(0, sanitizeNumber(item.amount));
    return acc + amount;
  }, 0);
}

/**
 * Calculates overhead costs (frais généraux / fonctionnement)
 * Either fixed amount or percentage of direct costs
 */
export function calculateOverhead(
  directCost: number,
  overheadType: OverheadType,
  overheadValue: number
): number {
  const safeDirect = Math.max(0, sanitizeNumber(directCost));
  const safeVal = Math.max(0, sanitizeNumber(overheadValue));

  if (overheadType === 'percent') {
    return safeDirect * (safeVal / 100);
  }
  return safeVal;
}

/**
 * Calculates total cost of production (Coût de revient total)
 */
export function calculateTotalCost(
  materialWithWaste: number,
  laborCost: number,
  otherCosts: number,
  overheadCost: number
): number {
  return (
    Math.max(0, sanitizeNumber(materialWithWaste)) +
    Math.max(0, sanitizeNumber(laborCost)) +
    Math.max(0, sanitizeNumber(otherCosts)) +
    Math.max(0, sanitizeNumber(overheadCost))
  );
}

/**
 * Calculates selling price using TRUE PROFIT MARGIN:
 * Selling Price = Cost / (1 - Margin)
 * Example: Cost = 100,000, Margin = 25% -> 100,000 / (1 - 0.25) = 133,333.33
 */
export function calculateSellingPriceFromMargin(
  cost: number,
  marginPercent: number
): number {
  const safeCost = Math.max(0, sanitizeNumber(cost));
  const safeMargin = sanitizeNumber(marginPercent);

  if (safeCost === 0) return 0;
  if (safeMargin >= 100) {
    throw new Error('La marge bénéficiaire ne peut pas être supérieure ou égale à 100%.');
  }
  if (safeMargin < 0) {
    throw new Error('La marge ne peut pas être négative.');
  }

  const marginDecimal = safeMargin / 100;
  return safeCost / (1 - marginDecimal);
}

/**
 * Calculates selling price using MARKUP (Taux de marque / coefficient multiplicateur):
 * Selling Price = Cost * (1 + Markup)
 * Example: Cost = 100,000, Markup = 25% -> 100,000 * 1.25 = 125,000
 */
export function calculateSellingPriceFromMarkup(
  cost: number,
  markupPercent: number
): number {
  const safeCost = Math.max(0, sanitizeNumber(cost));
  const safeMarkup = sanitizeNumber(markupPercent);

  if (safeCost === 0) return 0;
  if (safeMarkup < 0) {
    throw new Error('Le coefficient de marque ne peut pas être négatif.');
  }

  const markupDecimal = safeMarkup / 100;
  return safeCost * (1 + markupDecimal);
}

/**
 * Calculates profit amount: Selling Price - Total Cost
 */
export function calculateProfit(sellingPrice: number, totalCost: number): number {
  const safePrice = Math.max(0, sanitizeNumber(sellingPrice));
  const safeCost = Math.max(0, sanitizeNumber(totalCost));
  return safePrice - safeCost;
}

/**
 * Rounds a price to nearest specified FCFA increment
 * steps: 'none' | '100' | '500' | '1000' | '5000'
 */
export function roundPrice(price: number, step: RoundingStep): number {
  const safePrice = Math.max(0, sanitizeNumber(price));
  if (step === 'none' || !step) return Math.round(safePrice * 100) / 100;

  const stepNumber = parseInt(step, 10);
  if (isNaN(stepNumber) || stepNumber <= 0) return Math.round(safePrice);

  return Math.round(safePrice / stepNumber) * stepNumber;
}

/**
 * Calculates deposit (Acompte) from selling price
 */
export function calculateDeposit(
  sellingPrice: number,
  config: DepositConfig
): { depositAmount: number; balanceAmount: number } {
  const safeTotal = Math.max(0, sanitizeNumber(sellingPrice));
  let depositAmount = 0;

  if (config.type === 'percent') {
    const percent = Math.min(100, Math.max(0, sanitizeNumber(config.value, 0)));
    depositAmount = safeTotal * (percent / 100);
  } else {
    depositAmount = Math.min(safeTotal, Math.max(0, sanitizeNumber(config.value, 0)));
  }

  // Round deposit to nearest integer for clean display in FCFA
  depositAmount = Math.round(depositAmount);
  const balanceAmount = Math.max(0, safeTotal - depositAmount);

  return { depositAmount, balanceAmount };
}

/**
 * Primary calculation engine function.
 * Validates inputs and returns comprehensive result object with no UI ties.
 */
export function calculateQuote(input: CalculationInput): CalculationResult {
  const errors: string[] = [];

  // Validation
  if (input.targetProfitPercent >= 100 && input.pricingMode === 'margin') {
    errors.push('La marge bénéficiaire doit être strictement inférieure à 100% (ex: 20%, 25%, 35%).');
  }

  if (input.targetProfitPercent < 0) {
    errors.push('Le pourcentage de bénéfice ne peut pas être négatif.');
  }

  if (input.wastePercent < 0) {
    errors.push('Le taux de perte ne peut pas être négatif.');
  }

  // Step 1: Raw Materials
  const rawMaterialCost = calculateMaterialCost(input.materials || []);

  // Step 2: Waste / Loss
  const wasteAmount = calculateWaste(rawMaterialCost, input.wastePercent || 0);
  const adjustedMaterialCost = rawMaterialCost + wasteAmount;

  // Step 3: Labor
  const laborCost = calculateLaborCost(input.labor || []);

  // Step 4: Additional Costs
  const otherCostsTotal = calculateAdditionalCosts(input.otherCosts || []);

  // Step 5: Direct Cost
  const directCost = adjustedMaterialCost + laborCost + otherCostsTotal;

  // Step 6: Overhead
  const overheadCost = calculateOverhead(
    directCost,
    input.overheadType || 'percent',
    input.overheadValue || 0
  );

  // Step 7: Total Cost (Coût de revient total)
  const totalCost = directCost + overheadCost;

  // Step 8: Selling Price calculation
  let rawSellingPrice = 0;
  if (totalCost > 0) {
    try {
      if (input.pricingMode === 'markup') {
        rawSellingPrice = calculateSellingPriceFromMarkup(
          totalCost,
          input.targetProfitPercent
        );
      } else {
        rawSellingPrice = calculateSellingPriceFromMargin(
          totalCost,
          input.targetProfitPercent
        );
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        errors.push(e.message);
      } else {
        errors.push('Erreur lors du calcul du prix de vente.');
      }
      rawSellingPrice = totalCost;
    }
  }

  // Step 9: Rounding
  const roundedSellingPrice = roundPrice(rawSellingPrice, input.roundingStep || 'none');

  // Step 10: Final profit and effective margin
  const profitAmount = roundedSellingPrice - totalCost;

  let effectiveMarginPercent = 0;
  if (roundedSellingPrice > 0) {
    effectiveMarginPercent = (profitAmount / roundedSellingPrice) * 100;
  }

  let effectiveMarkupPercent = 0;
  if (totalCost > 0) {
    effectiveMarkupPercent = (profitAmount / totalCost) * 100;
  }

  return {
    rawMaterialCost: Math.round(rawMaterialCost * 100) / 100,
    wasteAmount: Math.round(wasteAmount * 100) / 100,
    adjustedMaterialCost: Math.round(adjustedMaterialCost * 100) / 100,
    laborCost: Math.round(laborCost * 100) / 100,
    otherCostsTotal: Math.round(otherCostsTotal * 100) / 100,
    directCost: Math.round(directCost * 100) / 100,
    overheadCost: Math.round(overheadCost * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    rawSellingPrice: Math.round(rawSellingPrice * 100) / 100,
    roundedSellingPrice,
    profitAmount: Math.round(profitAmount * 100) / 100,
    effectiveMarginPercent: Math.round(effectiveMarginPercent * 10) / 10,
    effectiveMarkupPercent: Math.round(effectiveMarkupPercent * 10) / 10,
    isValid: errors.length === 0,
    errors,
  };
}
