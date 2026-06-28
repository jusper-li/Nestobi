import type { BeanFinderResult, RoastLabel } from '../types';

export interface BeanFinderProductRecommendation {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock_quantity: number;
  category_id: string | null;
  origin: string | null;
  roast_level: string | null;
  processing_method: string | null;
  flavor_notes: string[] | null;
  tags: string[] | null;
  categories?: { id?: string | null; name?: string | null; slug?: string | null } | null;
}

export interface RankedBeanFinderProductRecommendation {
  product: BeanFinderProductRecommendation;
  score: number;
  reasons: string[];
}

const ROAST_ORDER: RoastLabel[] = ['淺焙', '淺中焙', '中焙', '中深焙', '深焙'];

function normalizeText(value: string | null | undefined) {
  return String(value || '').toLowerCase();
}

function joinProductText(product: BeanFinderProductRecommendation) {
  return normalizeText([
    product.name,
    product.description,
    product.origin,
    product.roast_level,
    product.processing_method,
    ...(product.flavor_notes || []),
    ...(product.tags || []),
  ].filter(Boolean).join(' '));
}

function classifyRoastLabel(product: BeanFinderProductRecommendation): RoastLabel | null {
  const text = joinProductText(product);
  if (/淺中|light[- ]?medium|medium[- ]?light|light medium/.test(text)) return '淺中焙';
  if (/淺焙|淺烘焙|light roast|\blight\b/.test(text)) return '淺焙';
  if (/中深|medium[- ]?dark|medium dark/.test(text)) return '中深焙';
  if (/深焙|深烘焙|dark roast|\bdark\b/.test(text)) return '深焙';
  if (/中焙|中烘焙|medium roast|\bmedium\b/.test(text)) return '中焙';
  return null;
}

function isAdjacentRoast(a: RoastLabel | null, b: RoastLabel) {
  if (!a) return false;
  const ai = ROAST_ORDER.indexOf(a);
  const bi = ROAST_ORDER.indexOf(b);
  return ai >= 0 && bi >= 0 && Math.abs(ai - bi) === 1;
}

function keywordsMatch(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(normalizeText(keyword)));
}

function extractAcidityScore(product: BeanFinderProductRecommendation) {
  const text = joinProductText(product);
  if (/淺中|淺焙|light roast|light|果酸|柑橘|檸檬|莓果|花香|清爽/.test(text)) return 8;
  if (/中焙|medium roast|balanced|平衡|焦糖|堅果|可可/.test(text)) return 5;
  if (/中深|深焙|dark roast|深烘焙|煙燻|厚實|醇厚/.test(text)) return 3;
  return 5;
}

function pushReason(reasons: string[], score: number, reason: string) {
  reasons.push(`${score >= 0 ? '+' : ''}${score} ${reason}`);
}

function scoreProduct(product: BeanFinderProductRecommendation, result: BeanFinderResult): RankedBeanFinderProductRecommendation | null {
  const text = joinProductText(product);
  if (!text && !product.origin && !product.roast_level && !product.processing_method) return null;

  const reasons: string[] = [];
  let score = 0;
  const roastLabel = classifyRoastLabel(product);

  if (roastLabel === result.primaryRoast) {
    score += 100;
    pushReason(reasons, 100, `主焙度命中：${product.roast_level || roastLabel || result.primaryRoast}`);
  } else if (isAdjacentRoast(roastLabel, result.primaryRoast)) {
    score += 30;
    pushReason(reasons, 30, `鄰近焙度：${product.roast_level || roastLabel || result.primaryRoast}`);
  }

  const flavorText = [product.description, ...(product.flavor_notes || []), ...(product.tags || [])].filter(Boolean).join(' ');

  if (result.specialTags.includes('香氣') && keywordsMatch(flavorText, ['香氣', '花香', '果香', '柑橘', '莓果', '水果', '清香', '茶感'])) {
    score += 20;
    pushReason(reasons, 20, '符合香氣偏好');
  }

  if (result.specialTags.includes('厚實') && keywordsMatch(flavorText, ['厚實', '醇厚', '巧克力', '堅果', '奶油', '焦糖', '黑糖', 'body'])) {
    score += 20;
    pushReason(reasons, 20, '符合厚實口感偏好');
  }

  if (result.specialTags.includes('怕酸') && extractAcidityScore(product) >= 7) {
    score -= 40;
    pushReason(reasons, -40, '酸值過高');
  }

  if (result.specialTags.includes('怕苦') && roastLabel === '深焙') {
    score -= 40;
    pushReason(reasons, -40, '深焙苦感扣分');
  }

  if (keywordsMatch(text, ['花香', '果香', '柑橘', '莓果', '檸檬', '茶感', '可可', '堅果', '焦糖', '奶油', '黑糖'])) {
    score += 8;
    pushReason(reasons, 8, '風味標記相符');
  }

  if (keywordsMatch(text, ['水洗', '日曬', '蜜處理', '厭氧', '發酵'])) {
    score += 4;
    pushReason(reasons, 4, '處理法相符');
  }

  if (!score && !roastLabel && !product.origin && !product.roast_level && !product.processing_method) return null;

  return {
    product,
    score,
    reasons: reasons.slice(0, 3),
  };
}

export function recommendBeansForResult(
  products: BeanFinderProductRecommendation[],
  result: BeanFinderResult,
) {
  return products
    .map((product) => scoreProduct(product, result))
    .filter((item): item is RankedBeanFinderProductRecommendation => Boolean(item))
    .sort((a, b) => {
      const stockA = a.product.stock_quantity > 0 ? 1 : 0;
      const stockB = b.product.stock_quantity > 0 ? 1 : 0;
      if (stockA !== stockB) return stockB - stockA;
      if (b.score !== a.score) return b.score - a.score;
      return a.product.price - b.product.price;
    });
}

