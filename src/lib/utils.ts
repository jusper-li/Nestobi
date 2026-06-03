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
    pending: pickByLang(lang, '待處理', 'Pending', '保留中', '대기 중'),
    confirmed: pickByLang(lang, '已確認', 'Confirmed', '確認済み', '확인됨'),
    cancelled: pickByLang(lang, '已取消', 'Cancelled', 'キャンセル済み', '취소됨'),
    completed: pickByLang(lang, '已完成', 'Completed', '完了', '완료됨'),
    processing: pickByLang(lang, '處理中', 'Processing', '処理中', '처리 중'),
    shipped: pickByLang(lang, '已出貨', 'Shipped', '発送済み', '배송됨'),
    paid: pickByLang(lang, '已付款', 'Paid', '支払い済み', '결제 완료'),
    unpaid: pickByLang(lang, '未付款', 'Unpaid', '未払い', '미결제'),
    refunded: pickByLang(lang, '已退款', 'Refunded', '返金済み', '환불됨'),
    active: pickByLang(lang, '啟用中', 'Active', '有効', '활성'),
    inactive: pickByLang(lang, '停用中', 'Inactive', '無効', '비활성'),
    draft: pickByLang(lang, '草稿', 'Draft', '下書き', '초안'),
    shared: pickByLang(lang, '已分享', 'Shared', '共有済み', '공유됨'),
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
