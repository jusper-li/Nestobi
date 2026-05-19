export function formatCurrency(amount: number, currency = 'TWD'): string {
  if (currency === 'TWD') {
    return `NT$ ${Number(amount || 0).toLocaleString('zh-TW')}`;
  }

  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency }).format(amount);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';

  return new Date(dateStr).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';

  return new Date(dateStr).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function dateDiffInDays(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();

  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '待處理',
    confirmed: '已確認',
    cancelled: '已取消',
    completed: '已完成',
    processing: '處理中',
    shipped: '已出貨',
    paid: '已付款',
    unpaid: '未付款',
    refunded: '已退款',
    active: '啟用中',
    inactive: '停用',
    draft: '草稿',
    shared: '已分享',
  };

  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-teal-100 text-teal-800',
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-red-100 text-red-800',
    refunded: 'bg-gray-100 text-gray-800',
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
  };

  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return `${str.slice(0, maxLen)}...`;
}
