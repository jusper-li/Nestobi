import { supabase } from './supabase';
import { pickByLang } from './i18n';

export type SiteContentArea = 'navigation' | 'footer' | 'home';

export interface SiteContentBlock {
  id: string;
  area: SiteContentArea;
  placement: string;
  block_type: string;
  block_key: string;
  parent_block_key: string;
  title_zh: string;
  title_en: string;
  title_ja: string;
  title_ko: string;
  subtitle_zh: string;
  subtitle_en: string;
  subtitle_ja: string;
  subtitle_ko: string;
  body_zh: string;
  body_en: string;
  body_ja: string;
  body_ko: string;
  cta_label_zh: string;
  cta_label_en: string;
  cta_label_ja: string;
  cta_label_ko: string;
  link_url: string;
  icon_name: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
}

const SELECT_COLUMNS = [
  'id',
  'area',
  'placement',
  'block_type',
  'block_key',
  'parent_block_key',
  'title_zh',
  'title_en',
  'title_ja',
  'title_ko',
  'subtitle_zh',
  'subtitle_en',
  'subtitle_ja',
  'subtitle_ko',
  'body_zh',
  'body_en',
  'body_ja',
  'body_ko',
  'cta_label_zh',
  'cta_label_en',
  'cta_label_ja',
  'cta_label_ko',
  'link_url',
  'icon_name',
  'image_url',
  'display_order',
  'is_active',
  'metadata',
].join(',');

const cache = new Map<SiteContentArea, Promise<SiteContentBlock[]>>();

function sanitizeLocalizedText(value: string | null | undefined) {
  const text = (value || '').trim();
  if (!text) return '';
  const suspiciousQuestionMarks = text.match(/\?/g)?.length ?? 0;
  const suspiciousReplacementChars = text.includes('\uFFFD') ? 1 : 0;
  const totalLength = text.length;
  const suspiciousRatio = (suspiciousQuestionMarks + suspiciousReplacementChars) / Math.max(totalLength, 1);
  if (suspiciousQuestionMarks >= 2 && suspiciousRatio > 0.2) return '';
  if (suspiciousReplacementChars) return '';
  return text;
}

export function indexBlocks(blocks: SiteContentBlock[]) {
  return blocks.reduce<Record<string, SiteContentBlock>>((acc, block) => {
    acc[block.block_key] = block;
    return acc;
  }, {});
}

export function getBlockText(
  block: SiteContentBlock | undefined,
  locale: string,
  field: 'title' | 'subtitle' | 'body' | 'cta_label',
) {
  if (!block) return '';
  const selected = pickByLang(
    locale,
    block[`${field}_zh` as const],
    block[`${field}_en` as const],
    block[`${field}_ja` as const],
    block[`${field}_ko` as const],
  );
  if (sanitizeLocalizedText(selected)) return selected;
  const fallbackCandidates = [
    block[`${field}_zh` as const],
    block[`${field}_en` as const],
    block[`${field}_ja` as const],
    block[`${field}_ko` as const],
  ].map(sanitizeLocalizedText).filter(Boolean);
  return fallbackCandidates[0] || '';
}

export async function fetchSiteContentBlocks(area: SiteContentArea) {
  if (!cache.has(area)) {
    cache.set(
      area,
      supabase
        .from('site_content_blocks')
        .select(SELECT_COLUMNS)
        .eq('area', area)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })
        .then(({ data, error }) => {
          if (error) throw error;
          return (data || []) as SiteContentBlock[];
        }),
    );
  }
  return cache.get(area)!;
}
