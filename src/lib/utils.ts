import { pickByLang } from './i18n';

export function formatCurrency(amount: number, currency = 'TWD'): string {
  if (currency === 'TWD') {
    return `NT$ ${Number(amount || 0).toLocaleString('zh-TW')}`;
  }

  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency }).format(amount);
}

export function formatDate(dateStr: string | null | undefined, locale = 'zh-TW'): string {
  if (!dateStr) return '-';

  return new Date(dateStr).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateTime(dateStr: string | null | undefined, locale = 'zh-TW'): string {
  if (!dateStr) return '-';

  return new Date(dateStr).toLocaleString(locale, {
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

export function getStatusLabel(status: string, lang: string = 'zh-TW'): string {
  const labels: Record<string, string> = {
    pending: pickByLang(lang, '\u5f85\u8655\u7406', 'Pending', 'Pending', 'Pending'),
    confirmed: pickByLang(lang, '\u5df2\u78ba\u8a8d', 'Confirmed', 'Confirmed', 'Confirmed'),
    cancelled: pickByLang(lang, '\u5df2\u53d6\u6d88', 'Cancelled', 'Cancelled', 'Cancelled'),
    completed: pickByLang(lang, '\u5df2\u5b8c\u6210', 'Completed', 'Completed', 'Completed'),
    processing: pickByLang(lang, '\u8655\u7406\u4e2d', 'Processing', 'Processing', 'Processing'),
    shipped: pickByLang(lang, '\u5df2\u51fa\u8ca8', 'Shipped', 'Shipped', 'Shipped'),
    paid: pickByLang(lang, '\u5df2\u4ed8\u6b3e', 'Paid', 'Paid', 'Paid'),
    unpaid: pickByLang(lang, '\u672a\u4ed8\u6b3e', 'Unpaid', 'Unpaid', 'Unpaid'),
    refunded: pickByLang(lang, '\u5df2\u9000\u6b3e', 'Refunded', 'Refunded', 'Refunded'),
    active: pickByLang(lang, '\u555f\u7528\u4e2d', 'Active', 'Active', 'Active'),
    inactive: pickByLang(lang, '\u505c\u7528\u4e2d', 'Inactive', 'Inactive', 'Inactive'),
    draft: pickByLang(lang, '\u8349\u7a3f', 'Draft', 'Draft', 'Draft'),
    shared: pickByLang(lang, '\u5df2\u5206\u4eab', 'Shared', 'Shared', 'Shared'),
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
