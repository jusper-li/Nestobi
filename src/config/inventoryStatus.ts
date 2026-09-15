import type { InventoryStatus } from '../types/inventory';

export const INVENTORY_STATUS: Record<InventoryStatus, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-emerald-50 text-emerald-700' },
  attention: { label: '留意', className: 'bg-amber-50 text-amber-700' },
  reorder: { label: '建議叫貨', className: 'bg-orange-50 text-orange-700' },
  critical: { label: '急需叫貨', className: 'bg-red-50 text-red-700' },
};
