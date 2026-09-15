import { supabase } from '../lib/supabase';
import { calculateInventoryForecast } from '../lib/inventoryForecast';
import type { InventoryForecast, InventoryForecastInput } from '../types/inventory';

type Row = Record<string, unknown>;
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || fallback;

export async function loadInventoryForecasts(): Promise<InventoryForecast[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [beansResult, inventoryResult, usageResult] = await Promise.all([
    supabase.from('coffee_beans').select('id, sku, name, unit, lead_time_days, safety_stock, target_stock_days, minimum_order_qty, order_multiple, suppliers(name)').eq('is_active', true).order('name'),
    supabase.from('bean_inventory').select('bean_id, location_id, on_hand_qty, reserved_qty, incoming_qty, inventory_locations(name)').order('bean_id'),
    supabase.from('inventory_transactions').select('bean_id, quantity, created_at').eq('transaction_type', 'sale_usage').gte('created_at', since),
  ]);
  if (beansResult.error) throw beansResult.error;
  if (inventoryResult.error) throw inventoryResult.error;
  if (usageResult.error) throw usageResult.error;

  const usageByBean = new Map<string, { last7: number; last30: number }>();
  const cutoff7 = Date.now() - 7 * 86_400_000;
  for (const row of (usageResult.data || []) as Row[]) {
    const beanId = String(row.bean_id || '');
    if (!beanId) continue;
    const current = usageByBean.get(beanId) || { last7: 0, last30: 0 };
    const quantity = Math.abs(asNumber(row.quantity));
    current.last30 += quantity;
    if (new Date(String(row.created_at)).getTime() >= cutoff7) current.last7 += quantity;
    usageByBean.set(beanId, current);
  }
  const inventoryByBean = new Map<string, Row>();
  for (const row of (inventoryResult.data || []) as Row[]) {
    const beanId = String(row.bean_id || '');
    if (!beanId) continue;
    const current = inventoryByBean.get(beanId);
    if (current) {
      current.on_hand_qty = asNumber(current.on_hand_qty) + asNumber(row.on_hand_qty);
      current.reserved_qty = asNumber(current.reserved_qty) + asNumber(row.reserved_qty);
      current.incoming_qty = asNumber(current.incoming_qty) + asNumber(row.incoming_qty);
      current.inventory_locations = '多個庫位';
    } else inventoryByBean.set(beanId, { ...row });
  }
  return ((beansResult.data || []) as Row[]).map((bean) => {
    const beanId = String(bean.id);
    const inventory = inventoryByBean.get(beanId) || {};
    const usage = usageByBean.get(beanId) || { last7: 0, last30: 0 };
    const supplier = bean.suppliers as Row | null;
    const location = inventory.inventory_locations as Row | string | null;
    const input: InventoryForecastInput = {
      beanId, sku: String(bean.sku || ''), name: String(bean.name || ''), unit: String(bean.unit || 'kg'),
      onHandQty: asNumber(inventory.on_hand_qty), reservedQty: asNumber(inventory.reserved_qty), incomingQty: asNumber(inventory.incoming_qty),
      usageLast7Days: usage.last7, usageLast30Days: usage.last30, leadTimeDays: asNumber(bean.lead_time_days), safetyStock: asNumber(bean.safety_stock),
      targetStockDays: asNumber(bean.target_stock_days, 30), minimumOrderQty: asNumber(bean.minimum_order_qty), orderMultiple: asNumber(bean.order_multiple, 1),
      supplierName: supplier && typeof supplier === 'object' ? String(supplier.name || '') : null,
      locationName: typeof location === 'string' ? location : location && typeof location === 'object' ? String(location.name || '') : null,
    };
    return calculateInventoryForecast(input);
  });
}

export async function createPurchaseOrderDraft(items: Array<{ beanId: string; quantity: number; unitCost: number }>, notes = '') {
  const payload = items.map(item => ({ bean_id: item.beanId, quantity: item.quantity, unit_cost: item.unitCost, source: 'smart_reorder' }));
  const { data, error } = await supabase.rpc('create_inventory_purchase_order', { p_items: payload, p_notes: notes });
  if (error) throw error;
  return String(data);
}
