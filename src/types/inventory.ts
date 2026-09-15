export type InventoryStatus = 'normal' | 'attention' | 'reorder' | 'critical';

export interface InventoryForecastInput {
  beanId: string;
  sku: string;
  name: string;
  unit: string;
  onHandQty: number;
  reservedQty: number;
  incomingQty: number;
  usageLast7Days: number;
  usageLast30Days: number;
  leadTimeDays: number;
  safetyStock: number;
  targetStockDays: number;
  minimumOrderQty: number;
  orderMultiple: number;
  supplierName?: string | null;
  locationName?: string | null;
}

export interface InventoryForecast extends InventoryForecastInput {
  availableQty: number;
  averageDailyUsage: number;
  reorderPoint: number;
  stockDays: number | null;
  predictedStockoutDate: string | null;
  recommendedOrderQty: number;
  status: InventoryStatus;
}
