import type { InventoryForecast, InventoryForecastInput } from '../types/inventory';

const nonNegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;

function averageDailyUsage(input: InventoryForecastInput) {
  const daily7 = input.usageLast7Days > 0 ? input.usageLast7Days / 7 : 0;
  const daily30 = input.usageLast30Days > 0 ? input.usageLast30Days / 30 : 0;
  if (daily7 > 0 && daily30 > 0) return daily7 * 0.6 + daily30 * 0.4;
  return daily7 || daily30;
}

export function calculateInventoryForecast(input: InventoryForecastInput, today = new Date()): InventoryForecast {
  const availableQty = Math.max(0, nonNegative(input.onHandQty) - nonNegative(input.reservedQty));
  const averageDaily = averageDailyUsage(input);
  const leadTimeDays = nonNegative(input.leadTimeDays);
  const safetyStock = nonNegative(input.safetyStock);
  const reorderPoint = averageDaily * leadTimeDays + safetyStock;
  const stockDays = averageDaily > 0 ? availableQty / averageDaily : null;
  const predictedStockoutDate = stockDays === null ? null : new Date(today.getTime() + stockDays * 86_400_000).toISOString();
  const targetDemand = averageDaily * nonNegative(input.targetStockDays);
  const rawRecommended = Math.max(0, targetDemand - availableQty - nonNegative(input.incomingQty));
  const minimum = nonNegative(input.minimumOrderQty);
  const multiple = input.orderMultiple > 0 ? input.orderMultiple : 1;
  const recommendedOrderQty = rawRecommended === 0 ? 0 : Math.max(minimum, Math.ceil(rawRecommended / multiple) * multiple);
  let status: InventoryForecast['status'] = 'normal';
  if (stockDays !== null && stockDays <= leadTimeDays) status = 'critical';
  else if (availableQty <= reorderPoint) status = 'reorder';
  else if (availableQty <= reorderPoint * 1.5) status = 'attention';
  return { ...input, availableQty, averageDailyUsage: averageDaily, reorderPoint, stockDays, predictedStockoutDate, recommendedOrderQty, status };
}

