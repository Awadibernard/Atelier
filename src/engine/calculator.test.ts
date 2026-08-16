import {
  calculateMaterialCost,
  calculateWaste,
  calculateLaborCost,
  calculateAdditionalCosts,
  calculateTotalCost,
  calculateSellingPriceFromMargin,
  calculateSellingPriceFromMarkup,
  calculateProfit,
  roundPrice,
  calculateDeposit,
  calculateQuote,
} from './calculator';
import { CalculationInput } from '../types';

export interface TestResult {
  name: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  error?: string;
}

export function runCalculationTests(): { results: TestResult[]; allPassed: boolean } {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, expected?: unknown, actual?: unknown) {
    results.push({
      name,
      passed: Boolean(condition),
      expected,
      actual,
    });
  }

  // 1. Benchmark Scenario from Atelier Métal Bernard
  const bernardInput: CalculationInput = {
    materials: [
      { id: '1', name: 'Tube carré 40×40', quantity: 12, unit: 'm', unitPrice: 2000 },
      { id: '2', name: 'Tôle 2mm', quantity: 2, unit: 'm2', unitPrice: 5000 },
    ],
    wastePercent: 5,
    labor: [
      { id: 'l1', task: 'Soudure & Fabrication', hours: 8, hourlyRate: 2500 },
    ],
    otherCosts: [
      { id: 'o1', description: 'Transport', amount: 5000 },
    ],
    overheadType: 'percent',
    overheadValue: 0,
    pricingMode: 'margin',
    targetProfitPercent: 25,
    roundingStep: 'none',
  };

  const rawCost = calculateMaterialCost(bernardInput.materials);
  assert('Test 1.1: Raw material cost is 34,000 FCFA', rawCost === 34000, 34000, rawCost);

  const waste = calculateWaste(rawCost, 5);
  assert('Test 1.2: Waste 5% is 1,700 FCFA', waste === 1700, 1700, waste);

  const labor = calculateLaborCost(bernardInput.labor);
  assert('Test 1.3: Labor cost is 20,000 FCFA', labor === 20000, 20000, labor);

  const other = calculateAdditionalCosts(bernardInput.otherCosts);
  assert('Test 1.4: Other costs is 5,000 FCFA', other === 5000, 5000, other);

  const totalCost = calculateTotalCost(rawCost + waste, labor, other, 0);
  assert('Test 1.5: Total cost is 60,700 FCFA', totalCost === 60700, 60700, totalCost);

  const sellingPriceRaw = calculateSellingPriceFromMargin(totalCost, 25);
  // 60,700 / 0.75 = 80933.3333...
  assert(
    'Test 1.6: Raw selling price from 25% margin is 80,933.33 FCFA',
    Math.abs(sellingPriceRaw - 80933.3333) < 0.01,
    80933.33,
    sellingPriceRaw
  );

  const profit = calculateProfit(sellingPriceRaw, totalCost);
  assert(
    'Test 1.7: Profit amount is 20,233.33 FCFA',
    Math.abs(profit - 20233.3333) < 0.01,
    20233.33,
    profit
  );

  // Rounding tests
  const round500 = roundPrice(sellingPriceRaw, '500');
  assert('Test 1.8: Rounding to nearest 500 is 81,000 FCFA', round500 === 81000, 81000, round500);

  const round1000 = roundPrice(sellingPriceRaw, '1000');
  assert('Test 1.9: Rounding to nearest 1,000 is 81,000 FCFA', round1000 === 81000, 81000, round1000);

  // 2. Deposit & Balance test
  const depositTest = calculateDeposit(81000, { type: 'percent', value: 40 });
  assert(
    'Test 2.1: Deposit 40% of 81,000 is 32,400 FCFA',
    depositTest.depositAmount === 32400,
    32400,
    depositTest.depositAmount
  );
  assert(
    'Test 2.2: Balance of 81,000 with 40% deposit is 48,600 FCFA',
    depositTest.balanceAmount === 48600,
    48600,
    depositTest.balanceAmount
  );

  // 3. Margin vs Markup distinction
  const costBase = 100000;
  const marginPrice = calculateSellingPriceFromMargin(costBase, 25);
  const markupPrice = calculateSellingPriceFromMarkup(costBase, 25);
  assert(
    'Test 3.1: 25% margin gives 133,333.33 FCFA on 100,000 cost',
    Math.abs(marginPrice - 133333.3333) < 0.01,
    133333.33,
    marginPrice
  );
  assert(
    'Test 3.2: 25% markup gives 125,000 FCFA on 100,000 cost',
    markupPrice === 125000,
    125000,
    markupPrice
  );

  // 4. Edge cases: 0 cost
  const zeroRes = calculateQuote({
    materials: [],
    wastePercent: 0,
    labor: [],
    otherCosts: [],
    overheadType: 'percent',
    overheadValue: 0,
    pricingMode: 'margin',
    targetProfitPercent: 25,
    roundingStep: 'none',
  });
  assert('Test 4.1: 0 cost produces 0 selling price with no errors', zeroRes.totalCost === 0 && zeroRes.roundedSellingPrice === 0, 0, zeroRes.totalCost);

  // 5. Margin >= 100% rejection
  const invalidMarginRes = calculateQuote({
    materials: [{ id: '1', name: 'Fer', quantity: 1, unit: 'piece', unitPrice: 10000 }],
    wastePercent: 0,
    labor: [],
    otherCosts: [],
    overheadType: 'percent',
    overheadValue: 0,
    pricingMode: 'margin',
    targetProfitPercent: 100,
    roundingStep: 'none',
  });
  assert(
    'Test 5.1: 100% margin is rejected with error flag',
    invalidMarginRes.isValid === false && invalidMarginRes.errors.length > 0,
    false,
    invalidMarginRes.isValid
  );

  // 6. 50% margin test: 100,000 / (1 - 0.5) = 200,000
  const margin50Price = calculateSellingPriceFromMargin(100000, 50);
  assert('Test 6.1: 50% margin doubles the cost (200,000 FCFA)', margin50Price === 200000, 200000, margin50Price);

  const allPassed = results.every((r) => r.passed);
  return { results, allPassed };
}
