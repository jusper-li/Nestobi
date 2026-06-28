import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Coffee, RotateCcw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import SEOHead from '../../components/SEOHead';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency } from '../../lib/utils';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import {
  translateCoffeeQuizQuestionsFromCacheOnly,
  translateCoffeeQuizQuestionsOnDemand,
  translateProductsFromCacheOnly,
  translateProductsOnDemand,
} from '../../lib/contentTranslations';
import { BEAN_FINDER_QUESTIONS } from '../../features/bean-finder/data/beanFinderQuestions';
import { calculateBeanFinderResult } from '../../features/bean-finder/lib/calculateBeanFinderResult';
import {
  recommendBeansForResult,
  type BeanFinderProductRecommendation,
  type RankedBeanFinderProductRecommendation,
} from '../../features/bean-finder/lib/recommendBeansForResult';
import type { BeanFinderResult } from '../../features/bean-finder/types';

type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';
type UiLang = 'zh-TW' | 'en' | 'ja' | 'ko';
type CoffeeProfileKey = 'bright_explorer' | 'balanced_daily' | 'sweet_smooth' | 'bold_classic';
type ScoreKey = CoffeeProfileKey | 'adventure';
type ProductRecommendation = BeanFinderProductRecommendation;
type RankedProductRecommendation = RankedBeanFinderProductRecommendation;

const COFFEE_CATEGORY_SLUG = 'coffee-beans';
const RECOMMENDATION_LIMIT = 6;
const PRODUCT_FALLBACK_IMAGE = 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=900';

function normalizeText(value: string | null | undefined) {
  return (value || '').toLowerCase();
}

function joinProductText(product: ProductRecommendation) {
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

function isCoffeeLikeProduct(product: ProductRecommendation) {
  return Boolean(
    product.origin ||
      product.roast_level ||
      product.processing_method ||
      (product.flavor_notes || []).length > 0 ||
      (product.tags || []).some((tag) => /咖啡|coffee|espresso|手沖|濾掛|精品|豆/.test(tag)) ||
      /咖啡|coffee|espresso|手沖|濾掛|精品豆|咖啡豆/.test(joinProductText(product)),
  );
}

type QuestionOption = {
  id: string;
  option_key: OptionKey;
  option_text: string;
  score: number;
};

type Question = {
  id: string;
  question_text: string;
  image_url: string | null;
  display_order: number;
  options: QuestionOption[];
};

type CoffeeProfileResult = BeanFinderResult;

type QuizSubmissionRow = {
  result_type: string;
  answers: Record<string, OptionKey> | null;
  created_at: string;
};

type QuizResultCache = {
  submission: QuizSubmissionRow;
  result: CoffeeProfileResult;
};

const COFFEE_PROFILE_LABELS: Record<CoffeeProfileKey, Record<UiLang, string>> = {
  bright_explorer: {
    'zh-TW': '明亮探索型',
    en: 'Bright Explorer',
    ja: '明るい探究型',
    ko: '밝은 탐색형',
  },
  balanced_daily: {
    'zh-TW': '日常平衡型',
    en: 'Balanced Daily',
    ja: 'バランス日常型',
    ko: '균형형 데일리',
  },
  sweet_smooth: {
    'zh-TW': '柔順甜感型',
    en: 'Sweet Smooth',
    ja: 'やさしい甘さ型',
    ko: '부드러운 단맛형',
  },
  bold_classic: {
    'zh-TW': '濃郁厚實型',
    en: 'Bold Classic',
    ja: 'しっかり濃厚型',
    ko: '진하고 묵직한 타입',
  },
};

const COFFEE_PROFILE_SUMMARIES: Record<CoffeeProfileKey, Record<UiLang, string>> = {
  bright_explorer: {
    'zh-TW': '喜歡果香、清爽酸質與多層次風味，適合從淺焙精品豆開始探索。',
    en: 'You enjoy fruity notes, bright acidity, and layered flavors. A great starting point for light-roast specialty beans.',
    ja: 'フルーティーさ、爽やかな酸味、複雑な風味を好みます。浅煎りのスペシャルティ豆から始めるのに向いています。',
    ko: '과일향, 산뜻한 산미, 다층적인 풍미를 선호합니다. 라이트 로스트 스페셜티 원두로 탐색을 시작하기 좋습니다.',
  },
  balanced_daily: {
    'zh-TW': '喜歡穩定、順口、每天都能喝的平衡風味，適合中焙與均衡口感。',
    en: 'You prefer a stable, smooth cup that works every day, with a balanced medium-roast profile.',
    ja: '安定感があり、毎日飲みやすいバランスのよい風味が好みです。中煎りの豆が向いています。',
    ko: '안정적이고 부드러워 매일 마시기 좋은 균형 잡힌 풍미를 선호합니다. 미디엄 로스트가 잘 맞습니다.',
  },
  sweet_smooth: {
    'zh-TW': '偏好柔和、甜感明顯、口感圓潤的咖啡，適合中淺焙與風味清晰的豆子。',
    en: 'You like soft, sweet, and round cups. Medium-light roasts with clear flavor notes are a great match.',
    ja: 'やわらかく、甘さと丸みのある味わいが好みです。中浅煎りで風味が明瞭な豆が合います。',
    ko: '부드럽고 달콤하며 둥근 질감의 커피를 좋아합니다. 미디엄 라이트 로스트가 잘 어울립니다.',
  },
  bold_classic: {
    'zh-TW': '喜歡厚實、苦甜明顯、存在感強的咖啡，適合深焙與濃縮或奶咖基底。',
    en: 'You enjoy a fuller-bodied, bolder cup with strong presence. Great for dark roasts, espresso, or milk drinks.',
    ja: '厚みがあり、苦味と甘さがしっかりした存在感のあるコーヒーが好みです。深煎りやエスプレッソ向きです。',
    ko: '묵직하고 진하며 존재감 있는 커피를 선호합니다. 다크 로스트, 에스프레소, 밀크 베이스 음료에 잘 맞습니다.',
  },
};

const COFFEE_PROFILE_BREW_HINTS: Record<CoffeeProfileKey, Record<UiLang, string>> = {
  bright_explorer: {
    'zh-TW': '建議從淺焙手沖開始，能更完整感受到酸甜與花果香。',
    en: 'Start with a light-roast pour-over to highlight acidity, sweetness, and floral notes.',
    ja: '浅煎りのハンドドリップから始めると、酸味・甘さ・花果の香りをより楽しめます。',
    ko: '라이트 로스트 핸드드립으로 시작하면 산미, 단맛, 플로럴 노트를 더 잘 느낄 수 있습니다.',
  },
  balanced_daily: {
    'zh-TW': '中焙濾掛或手沖都很適合，日常喝起來穩定順口。',
    en: 'Medium-roast drip bags or pour-over work well for a consistent daily cup.',
    ja: '中煎りのドリップバッグやハンドドリップが、毎日の一杯にちょうどいいです。',
    ko: '미디엄 로스트 드립백이나 핸드드립이 매일 마시기 좋은 안정적인 선택입니다.',
  },
  sweet_smooth: {
    'zh-TW': '中淺焙最能表現甜感與圓潤口感，手沖會更清楚。',
    en: 'Medium-light roasts bring out sweetness and a round mouthfeel, especially with pour-over.',
    ja: '中浅煎りが甘さとまろやかさを引き立て、ハンドドリップでより鮮明になります。',
    ko: '미디엄 라이트 로스트가 단맛과 둥근 질감을 잘 살리며, 핸드드립에서 더 선명합니다.',
  },
  bold_classic: {
    'zh-TW': '深焙或義式濃縮最適合，搭配牛奶也能保有存在感。',
    en: 'Dark roasts or espresso are ideal, and the cup still stands out in milk drinks.',
    ja: '深煎りやエスプレッソが最適で、ミルク系でも存在感があります。',
    ko: '다크 로스트나 에스프레소가 잘 맞고, 우유 음료에서도 존재감을 유지합니다.',
  },
};

function buildResultFromSavedSubmission(questions: Question[], row: QuizSubmissionRow, locale: UiLang): CoffeeProfileResult | null {
  const savedAnswers = row.answers || {};
  const restoredAnswers = Object.fromEntries(
    questions
      .map((question) => {
        const answerKey = savedAnswers[String(question.display_order)];
        if (!answerKey) return null;
        return [question.id, answerKey] as const;
      })
      .filter((item): item is readonly [string, OptionKey] => Boolean(item)),
  ) as Partial<Record<string, OptionKey>>;

  if (Object.keys(restoredAnswers).length !== questions.length) return null;

  return computeResult(questions, restoredAnswers);
}

const FALLBACK_QUIZ_QUESTIONS: Question[] = [
  {
    id: 'coffee-fallback-1',
    question_text: '什麼情境下你會想來杯咖啡？',
    image_url: '/images/coffee-quiz/1.avif',
    display_order: 1,
    options: [
      { id: 'coffee-fallback-1-a', option_key: 'A', option_text: '需要提神時', score: 1 },
      { id: 'coffee-fallback-1-b', option_key: 'B', option_text: '每天都要來一杯', score: 1 },
      { id: 'coffee-fallback-1-c', option_key: 'C', option_text: '待在一個地方的時候', score: 1 },
      { id: 'coffee-fallback-1-d', option_key: 'D', option_text: '情緒需要抒發的時候', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-2',
    question_text: '對於精品咖啡的了解程度?',
    image_url: '/images/coffee-quiz/2.avif',
    display_order: 2,
    options: [
      { id: 'coffee-fallback-2-a', option_key: 'A', option_text: '沖煮、處理法、風味落點瞭若指掌', score: 1 },
      { id: 'coffee-fallback-2-b', option_key: 'B', option_text: '有一定了解，烘焙度、產地等等', score: 1 },
      { id: 'coffee-fallback-2-c', option_key: 'C', option_text: '懂一些，都選推薦款或是喝習慣的口味', score: 1 },
      { id: 'coffee-fallback-2-d', option_key: 'D', option_text: '完全沒概念或是才剛接觸', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-3',
    question_text: '飲食的口味和習慣?',
    image_url: '/images/coffee-quiz/3.avif',
    display_order: 3,
    options: [
      { id: 'coffee-fallback-3-a', option_key: 'A', option_text: '濃郁調味明顯的料理', score: 1 },
      { id: 'coffee-fallback-3-b', option_key: 'B', option_text: '口味多變，多方嘗試', score: 1 },
      { id: 'coffee-fallback-3-c', option_key: 'C', option_text: '清新淡雅的飲食', score: 1 },
      { id: 'coffee-fallback-3-d', option_key: 'D', option_text: '原型食物，食物最真實的美味', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-4',
    question_text: '平時喝咖啡的習慣',
    image_url: '/images/coffee-quiz/4.avif',
    display_order: 4,
    options: [
      { id: 'coffee-fallback-4-a', option_key: 'A', option_text: '吃飯時', score: 1 },
      { id: 'coffee-fallback-4-b', option_key: 'B', option_text: '抽菸時', score: 1 },
      { id: 'coffee-fallback-4-c', option_key: 'C', option_text: '咖啡搭配甜點、餅乾', score: 1 },
      { id: 'coffee-fallback-4-d', option_key: 'D', option_text: '喜歡單獨品飲咖啡', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-5',
    question_text: '綜合果汁中不想加入的水果？',
    image_url: '/images/coffee-quiz/5.avif',
    display_order: 5,
    options: [
      { id: 'coffee-fallback-5-a', option_key: 'A', option_text: '檸檬', score: 1 },
      { id: 'coffee-fallback-5-b', option_key: 'B', option_text: '莓果', score: 1 },
      { id: 'coffee-fallback-5-c', option_key: 'C', option_text: '香蕉', score: 1 },
      { id: 'coffee-fallback-5-d', option_key: 'D', option_text: '西瓜', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-6',
    question_text: '哪一種味道對你來說無法接受?',
    image_url: '/images/coffee-quiz/6.avif',
    display_order: 6,
    options: [
      { id: 'coffee-fallback-6-a', option_key: 'A', option_text: '酸味', score: 1 },
      { id: 'coffee-fallback-6-b', option_key: 'B', option_text: '苦味', score: 1 },
      { id: 'coffee-fallback-6-c', option_key: 'C', option_text: '煙燻味，味道在鼻腔的感覺', score: 1 },
      { id: 'coffee-fallback-6-d', option_key: 'D', option_text: '香料味，辣味嗆味', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-7',
    question_text: '到手搖店去飲料喝幾分糖才好喝呢？',
    image_url: '/images/coffee-quiz/7.avif',
    display_order: 7,
    options: [
      { id: 'coffee-fallback-7-a', option_key: 'A', option_text: '全糖', score: 1 },
      { id: 'coffee-fallback-7-b', option_key: 'B', option_text: '7分糖', score: 1 },
      { id: 'coffee-fallback-7-c', option_key: 'C', option_text: '3分糖', score: 1 },
      { id: 'coffee-fallback-7-d', option_key: 'D', option_text: '1分糖或無糖', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-8',
    question_text: '過去曾經喝咖啡最不好的經驗？',
    image_url: '/images/coffee-quiz/8.avif',
    display_order: 8,
    options: [
      { id: 'coffee-fallback-8-a', option_key: 'A', option_text: '喝咖啡後心悸', score: 1 },
      { id: 'coffee-fallback-8-b', option_key: 'B', option_text: '喝了一口覺得好苦', score: 1 },
      { id: 'coffee-fallback-8-c', option_key: 'C', option_text: '滿心期待喝了卻覺得沒有什麼味道', score: 1 },
      { id: 'coffee-fallback-8-d', option_key: 'D', option_text: '很酸完全喝不完', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-9',
    question_text: '怎麼決定一杯咖啡的好壞？',
    image_url: '/images/coffee-quiz/9.avif',
    display_order: 9,
    options: [
      { id: 'coffee-fallback-9-a', option_key: 'A', option_text: '香氣，要讓我喜歡才好', score: 1 },
      { id: 'coffee-fallback-9-b', option_key: 'B', option_text: '口感，喝起來的質地', score: 1 },
      { id: 'coffee-fallback-9-c', option_key: 'C', option_text: '風味，有層次變化的風味', score: 1 },
      { id: 'coffee-fallback-9-d', option_key: 'D', option_text: '尾韻，嚥下後留在嘴裡的餘韻', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-10',
    question_text: '閉上眼想像一下嚐到下列哪個味道時，你會有最不舒服感覺？',
    image_url: '/images/coffee-quiz/10.avif',
    display_order: 10,
    options: [
      { id: 'coffee-fallback-10-a', option_key: 'A', option_text: '酸', score: 1 },
      { id: 'coffee-fallback-10-b', option_key: 'B', option_text: '甜', score: 1 },
      { id: 'coffee-fallback-10-c', option_key: 'C', option_text: '苦', score: 1 },
      { id: 'coffee-fallback-10-d', option_key: 'D', option_text: '鹹', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-11',
    question_text: '早上的早餐是一份吐司與咖啡，你想在吐司上抹上甚麼？',
    image_url: null,
    display_order: 11,
    options: [
      { id: 'coffee-fallback-11-a', option_key: 'A', option_text: '水果果醬', score: 1 },
      { id: 'coffee-fallback-11-b', option_key: 'B', option_text: '楓糖醬', score: 1 },
      { id: 'coffee-fallback-11-c', option_key: 'C', option_text: '花生醬', score: 1 },
      { id: 'coffee-fallback-11-d', option_key: 'D', option_text: '奶油或是起司', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-12',
    question_text: '今天午餐後公司主管請客，你想吃什麼下午茶甜點？',
    image_url: null,
    display_order: 12,
    options: [
      { id: 'coffee-fallback-12-a', option_key: 'A', option_text: '雪酪冰沙', score: 1 },
      { id: 'coffee-fallback-12-b', option_key: 'B', option_text: '奶油泡芙', score: 1 },
      { id: 'coffee-fallback-12-c', option_key: 'C', option_text: '巧克力甜甜圈', score: 1 },
      { id: 'coffee-fallback-12-d', option_key: 'D', option_text: '銅鑼燒', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-13',
    question_text: '和朋友一起到了餐廳用餐，餐點的飲料你會點？',
    image_url: null,
    display_order: 13,
    options: [
      { id: 'coffee-fallback-13-a', option_key: 'A', option_text: '柳橙汁', score: 1 },
      { id: 'coffee-fallback-13-b', option_key: 'B', option_text: '薑汁汽水', score: 1 },
      { id: 'coffee-fallback-13-c', option_key: 'C', option_text: '烏龍茶', score: 1 },
      { id: 'coffee-fallback-13-d', option_key: 'D', option_text: '可可亞', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-14',
    question_text: '以下水果你最喜歡哪個？',
    image_url: null,
    display_order: 14,
    options: [
      { id: 'coffee-fallback-14-a', option_key: 'A', option_text: '葡萄柚', score: 1 },
      { id: 'coffee-fallback-14-b', option_key: 'B', option_text: '蘋果', score: 1 },
      { id: 'coffee-fallback-14-c', option_key: 'C', option_text: '哈密瓜', score: 1 },
      { id: 'coffee-fallback-14-d', option_key: 'D', option_text: '芒果', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-15',
    question_text: '通常到咖啡廳你都點什麼咖啡？',
    image_url: null,
    display_order: 15,
    options: [
      { id: 'coffee-fallback-15-a', option_key: 'A', option_text: '美式咖啡', score: 1 },
      { id: 'coffee-fallback-15-b', option_key: 'B', option_text: '精品手沖', score: 1 },
      { id: 'coffee-fallback-15-c', option_key: 'C', option_text: '拿鐵', score: 1 },
      { id: 'coffee-fallback-15-d', option_key: 'D', option_text: '義式濃縮', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-16',
    question_text: '喜歡哪一種巧克力？',
    image_url: null,
    display_order: 16,
    options: [
      { id: 'coffee-fallback-16-a', option_key: 'A', option_text: '香橙巧克力', score: 1 },
      { id: 'coffee-fallback-16-b', option_key: 'B', option_text: '白巧克力', score: 1 },
      { id: 'coffee-fallback-16-c', option_key: 'C', option_text: '牛奶巧克力', score: 1 },
      { id: 'coffee-fallback-16-d', option_key: 'D', option_text: '黑巧克力', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-17',
    question_text: '在冷冷天的天想要來一杯怎樣的熱飲暖暖身？',
    image_url: null,
    display_order: 17,
    options: [
      { id: 'coffee-fallback-17-a', option_key: 'A', option_text: '熱金桔汁', score: 1 },
      { id: 'coffee-fallback-17-b', option_key: 'B', option_text: '玉米濃湯', score: 1 },
      { id: 'coffee-fallback-17-c', option_key: 'C', option_text: '奶茶', score: 1 },
      { id: 'coffee-fallback-17-d', option_key: 'D', option_text: '香料熱紅酒', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-18',
    question_text: '在重要的日子當中，你想選擇哪類的大餐作為慶祝？',
    image_url: null,
    display_order: 18,
    options: [
      { id: 'coffee-fallback-18-a', option_key: 'A', option_text: '壽司料理', score: 1 },
      { id: 'coffee-fallback-18-b', option_key: 'B', option_text: '窯烤Pizza', score: 1 },
      { id: 'coffee-fallback-18-c', option_key: 'C', option_text: '義大利麵', score: 1 },
      { id: 'coffee-fallback-18-d', option_key: 'D', option_text: '燉牛肉', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-19',
    question_text: '在這些選項裡面你認為自己會喜歡的咖啡烘焙度？',
    image_url: null,
    display_order: 19,
    options: [
      { id: 'coffee-fallback-19-a', option_key: 'A', option_text: '淺烘焙', score: 1 },
      { id: 'coffee-fallback-19-b', option_key: 'B', option_text: '中烘焙', score: 1 },
      { id: 'coffee-fallback-19-c', option_key: 'C', option_text: '中深烘焙', score: 1 },
      { id: 'coffee-fallback-19-d', option_key: 'D', option_text: '深烘焙', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-20',
    question_text: '你通常如何獲得一杯咖啡？',
    image_url: null,
    display_order: 20,
    options: [
      { id: 'coffee-fallback-20-a', option_key: 'A', option_text: '投幣式罐裝', score: 1 },
      { id: 'coffee-fallback-20-b', option_key: 'B', option_text: '自己在家裡沖煮', score: 1 },
      { id: 'coffee-fallback-20-c', option_key: 'C', option_text: '連鎖店或是便利商店的咖啡', score: 1 },
      { id: 'coffee-fallback-20-d', option_key: 'D', option_text: '有特別喜歡的咖啡廳', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-21',
    question_text: '最喜歡吃什麼口味的冰淇淋呢？',
    image_url: null,
    display_order: 21,
    options: [
      { id: 'coffee-fallback-21-a', option_key: 'A', option_text: '芒果', score: 1 },
      { id: 'coffee-fallback-21-b', option_key: 'B', option_text: '香草', score: 1 },
      { id: 'coffee-fallback-21-c', option_key: 'C', option_text: '巧克力', score: 1 },
      { id: 'coffee-fallback-21-d', option_key: 'D', option_text: '萊姆葡萄', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-22',
    question_text: '下班後來到拉麵店，想要吃一碗什麼樣子的拉麵？',
    image_url: null,
    display_order: 22,
    options: [
      { id: 'coffee-fallback-22-a', option_key: 'A', option_text: '雞白湯拉麵', score: 1 },
      { id: 'coffee-fallback-22-b', option_key: 'B', option_text: '鹽味拉麵', score: 1 },
      { id: 'coffee-fallback-22-c', option_key: 'C', option_text: '醬油拉麵', score: 1 },
      { id: 'coffee-fallback-22-d', option_key: 'D', option_text: '濃厚豚骨拉麵', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-23',
    question_text: '旅行到了泰國，你想先品嚐特別的食物？',
    image_url: null,
    display_order: 23,
    options: [
      { id: 'coffee-fallback-23-a', option_key: 'A', option_text: '椰汁咖哩', score: 1 },
      { id: 'coffee-fallback-23-b', option_key: 'B', option_text: '酸辣蝦湯', score: 1 },
      { id: 'coffee-fallback-23-c', option_key: 'C', option_text: '涼拌大薄片', score: 1 },
      { id: 'coffee-fallback-23-d', option_key: 'D', option_text: '芒果糯米飯', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-24',
    question_text: '旅行到了美國，你想先品嚐特別的食物？',
    image_url: null,
    display_order: 24,
    options: [
      { id: 'coffee-fallback-24-a', option_key: 'A', option_text: '花生醬南瓜餅', score: 1 },
      { id: 'coffee-fallback-24-b', option_key: 'B', option_text: '波士頓烘烤豆', score: 1 },
      { id: 'coffee-fallback-24-c', option_key: 'C', option_text: '水牛城辣雞翅', score: 1 },
      { id: 'coffee-fallback-24-d', option_key: 'D', option_text: '美式餐廳的鱈魚薯條', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-25',
    question_text: '晚間和友人到酒吧聚餐，想要來一杯？',
    image_url: null,
    display_order: 25,
    options: [
      { id: 'coffee-fallback-25-a', option_key: 'A', option_text: '啤酒', score: 1 },
      { id: 'coffee-fallback-25-b', option_key: 'B', option_text: '聽調酒師的推薦', score: 1 },
      { id: 'coffee-fallback-25-c', option_key: 'C', option_text: '味道濃烈的威士忌', score: 1 },
      { id: 'coffee-fallback-25-d', option_key: 'D', option_text: '繽紛口味香甜的調酒', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-26',
    question_text: '請問這次收到的咖啡豆符合滿意嗎？',
    image_url: null,
    display_order: 26,
    options: [
      { id: 'coffee-fallback-26-a', option_key: 'A', option_text: '非常滿意，跟我想的一樣！', score: 1 },
      { id: 'coffee-fallback-26-b', option_key: 'B', option_text: '不錯滿意，有很多驚喜', score: 1 },
      { id: 'coffee-fallback-26-c', option_key: 'C', option_text: '普通，感覺這些咖啡豆我在別的地方都喝得到', score: 1 },
      { id: 'coffee-fallback-26-d', option_key: 'D', option_text: '還好，沒什麼新奇的感覺', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-27',
    question_text: '其中你最喜歡的咖啡豆有什麼特性？',
    image_url: null,
    display_order: 27,
    options: [
      { id: 'coffee-fallback-27-a', option_key: 'A', option_text: '花香', score: 1 },
      { id: 'coffee-fallback-27-b', option_key: 'B', option_text: '果香', score: 1 },
      { id: 'coffee-fallback-27-c', option_key: 'C', option_text: '茶、香料味', score: 1 },
      { id: 'coffee-fallback-27-d', option_key: 'D', option_text: '堅果可可', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-28',
    question_text: '定期便最讓你滿意的服務在於',
    image_url: null,
    display_order: 28,
    options: [
      { id: 'coffee-fallback-28-a', option_key: 'A', option_text: '定期配送，省得我一直要補貨', score: 1 },
      { id: 'coffee-fallback-28-b', option_key: 'B', option_text: '日本的精選咖啡豆，不用飛日本也可以喝得到', score: 1 },
      { id: 'coffee-fallback-28-c', option_key: 'C', option_text: '盲盒開箱，每個月初都有滿滿的驚喜感', score: 1 },
      { id: 'coffee-fallback-28-d', option_key: 'D', option_text: '價格實惠，平易近人', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-29',
    question_text: '如果說針對老顧客我們要推出周邊產品你更想收到',
    image_url: null,
    display_order: 29,
    options: [
      { id: 'coffee-fallback-29-a', option_key: 'A', option_text: '咖啡沖煮器具', score: 1 },
      { id: 'coffee-fallback-29-b', option_key: 'B', option_text: '咖啡杯盤、隨行杯', score: 1 },
      { id: 'coffee-fallback-29-c', option_key: 'C', option_text: '實用的生活小物（袋子、文具）', score: 1 },
      { id: 'coffee-fallback-29-d', option_key: 'D', option_text: '小卡、貼紙等等紀念產品', score: 1 },
    ],
  },
  {
    id: 'coffee-fallback-30',
    question_text: '你在自家沖煮時遇到了什麼問題？',
    image_url: null,
    display_order: 30,
    options: [
      { id: 'coffee-fallback-30-a', option_key: 'A', option_text: '完全沒問題，沖煮咖啡很熟', score: 1 },
      { id: 'coffee-fallback-30-b', option_key: 'B', option_text: '咖啡豆的保存問題', score: 1 },
      { id: 'coffee-fallback-30-c', option_key: 'C', option_text: '咖啡豆的沖煮參數不是很了解', score: 1 },
      { id: 'coffee-fallback-30-d', option_key: 'D', option_text: '一次配送的數量問題（不夠喝或是喝不完）', score: 1 },
    ],
  },
];

function normalizeScore(value: number, max: number) {
  if (max <= 0) return 0;
  if (value <= 0) return 0;
  return Math.max(1, Math.min(10, Math.round((value / max) * 10)));
}

function collectSelectedChoiceIds(questions: Question[], answers: Partial<Record<string, OptionKey>>) {
  return questions
    .map((question) => {
      const answerKey = answers[question.id];
      if (!answerKey) return null;
      const option = question.options.find((item) => item.option_key === answerKey);
      return option?.id || null;
    })
    .filter((value): value is string => Boolean(value));
}

function computeResult(questions: Question[], answers: Partial<Record<string, OptionKey>>): CoffeeProfileResult | null {
  if (!questions.length) return null;
  const selectedChoiceIds = collectSelectedChoiceIds(questions, answers);
  if (selectedChoiceIds.length !== questions.length) return null;
  return calculateBeanFinderResult(selectedChoiceIds);
}

function buildAnswerPayload(questions: Question[], answers: Partial<Record<string, OptionKey>>) {
  return Object.fromEntries(
    questions
      .map((question) => {
        const answerKey = answers[question.id];
        if (!answerKey) return null;
        return [String(question.display_order), answerKey] as const;
      })
      .filter((item): item is readonly [string, OptionKey] => Boolean(item)),
  ) as Record<string, OptionKey>;
}

const COFFEE_QUIZ_STORAGE_KEY = 'nestobi:coffee-quiz:last-submission';

function readCoffeeQuizStorage(): QuizResultCache | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(COFFEE_QUIZ_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QuizResultCache;
  } catch {
    return null;
  }
}

function writeCoffeeQuizStorage(cache: QuizResultCache) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(COFFEE_QUIZ_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore storage quota or access errors.
  }
}

function isMeaningfulQuizResult(result: CoffeeProfileResult | null | undefined) {
  return Boolean(result && Object.values(result.scores).some((value) => value > 0));
}

export default function CoffeeQuiz() {
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const locale = normalizeLang(lang);
  const uiLang = locale as UiLang;
  const shouldTranslate = pickByLang(locale, '0', '1', '1', '1') === '1';
  const t = (zh: string, en: string, ja: string, ko: string) => pickByLang(locale, zh, en, ja, ko);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, OptionKey>>>({});
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveTone, setSaveTone] = useState<'success' | 'warning' | 'error' | ''>('');
  const [recommendedProducts, setRecommendedProducts] = useState<RankedProductRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsMessage, setRecommendationsMessage] = useState('');
  const [savedSubmissionResult, setSavedSubmissionResult] = useState<CoffeeProfileResult | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      let rows = BEAN_FINDER_QUESTIONS;
      if (shouldTranslate) rows = await translateCoffeeQuizQuestionsFromCacheOnly(rows, locale);
      if (!active) return;
      setQuestions(rows);
      setLoading(false);

      if (shouldTranslate) {
        const fullRows = await translateCoffeeQuizQuestionsOnDemand(rows, locale);
        if (!active) return;
        setQuestions(fullRows);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [locale, shouldTranslate]);

  useEffect(() => {
    let active = true;

    const loadSavedSubmission = async () => {
      const cached = readCoffeeQuizStorage();
      const cachedResult = isMeaningfulQuizResult(cached?.result) ? cached.result : null;
      if (!user) {
        setSavedSubmissionResult(cachedResult);
        return;
      }

      const { data, error } = await supabase
        .from('coffee_quiz_submissions')
        .select('result_type, answers, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        if (active) setSavedSubmissionResult(null);
        return;
      }

      if (!active) return;

      const row = (data?.[0] as QuizSubmissionRow | undefined) || null;
      if (!row) {
        setSavedSubmissionResult(cachedResult);
        return;
      }

      setSavedSubmissionResult(buildResultFromSavedSubmission(questions, row, uiLang) || cachedResult);
    };

    void loadSavedSubmission();

    return () => {
      active = false;
    };
  }, [questions, uiLang, user]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const quizResult = useMemo(() => computeResult(questions, answers), [questions, answers]);
  const activeResult = quizResult || savedSubmissionResult;
  const hasSavedResult = Boolean(savedSubmissionResult);
  const current = questions[index];

  useEffect(() => {
    let active = true;

    const loadRecommendations = async () => {
      if (!activeResult) {
        setRecommendedProducts([]);
        setRecommendationsMessage('');
        setRecommendationsLoading(false);
        return;
      }

      setRecommendationsLoading(true);
      setRecommendationsMessage('');

      try {
        const { data: categoryRow } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', COFFEE_CATEGORY_SLUG)
          .maybeSingle();

        let productQuery = supabase
          .from('products')
          .select('id,name,description,price,image_url,stock_quantity,category_id,origin,roast_level,processing_method,flavor_notes,tags,categories!products_category_id_fkey(id,name,slug)')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(200);

        if (categoryRow?.id) {
          productQuery = productQuery.eq('category_id', categoryRow.id);
        }

        const { data, error } = await productQuery;
        if (error) throw error;
        if (!active) return;

        const sourceRows = ((data || []) as BeanFinderProductRecommendation[]).filter(isCoffeeLikeProduct);
        const rankedRows = recommendBeansForResult(sourceRows, activeResult).slice(0, RECOMMENDATION_LIMIT);

        if (!rankedRows.length) {
          setRecommendedProducts([]);
          setRecommendationsMessage(t('目前還沒有找到符合你偏好的咖啡商品。', 'No matching coffee products were found yet.', 'まだあなたに合うコーヒー商品が見つかりません。', '아직 취향에 맞는 커피 상품을 찾지 못했습니다.'));
          return;
        }

        let displayRows = rankedRows;
        if (shouldTranslate) {
          const cachedRows = await translateProductsFromCacheOnly(rankedRows.map((item) => item.product), locale);
          if (!active) return;
          const translatedRows = await translateProductsOnDemand(cachedRows, locale);
          if (!active) return;
          displayRows = rankedRows.map((item, itemIndex) => ({
            ...item,
            product: (translatedRows[itemIndex] as ProductRecommendation | undefined) || item.product,
          }));
        }

        if (!active) return;
        setRecommendedProducts(displayRows);
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : '';
        setRecommendedProducts([]);
        setRecommendationsMessage(
          message
            ? `${t('商品推薦載入失敗：', 'Failed to load recommendations: ', 'おすすめ商品の読み込みに失敗しました：', '상품 추천 불러오기에 실패했습니다: ')}${message}`
            : t('商品推薦載入失敗。', 'Failed to load recommendations.', 'おすすめ商品の読み込みに失敗しました。', '상품 추천 불러오기에 실패했습니다.'),
        );
      } finally {
        if (active) setRecommendationsLoading(false);
      }
    };

    void loadRecommendations();

    return () => {
      active = false;
    };
  }, [activeResult, locale, shouldTranslate]);

  useEffect(() => {
    let cancelled = false;

    const autoSave = async () => {
      if (!done || !quizResult || saved || saving) return;
      if (!user) {
        setSaveTone('warning');
        setSaveMessage(t('請先登入，系統才能自動寫入測驗資料。', 'Please sign in to save the quiz data automatically.', 'ログインすると診断データを自動保存できます。', '로그인 후에만 퀴즈 데이터를 자동 저장할 수 있습니다.'));
        return;
      }

      setSaving(true);
      setSaveMessage('');
      setSaveTone('');

      const payloadAnswers = buildAnswerPayload(questions, answers);
      const memberName = profile?.display_name?.trim() || user.user_metadata?.display_name || user.email || 'Member';
      const memberPhone = profile?.phone?.trim() || '-';

      const submission = {
        user_id: user.id,
        member_email: user.email || null,
        member_name: memberName,
        member_phone: memberPhone,
        result_type: quizResult.resultTypeName,
        roast_score: quizResult.roastScores[quizResult.primaryRoast],
        acidity_score: quizResult.acidityRange[1],
        adventure_score: quizResult.dose,
        answers: { ...payloadAnswers, age: quizResult.age || null, gender: quizResult.gender || null },
        agreement: true,
      };

      const { error: submissionError } = await supabase.from('coffee_quiz_submissions').insert(submission);
      if (submissionError) {
        if (cancelled) return;
        setSaving(false);
        setSaveTone('error');
        setSaveMessage(
          submissionError.message
            ? `測驗資料寫入失敗：${submissionError.message}`
            : t('測驗資料寫入失敗，請稍後再試。', 'Failed to save the quiz data. Please try again.', '診断データの保存に失敗しました。後でもう一度お試しください。', '퀴즈 데이터 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'),
        );
        return;
      }

      if (cancelled) return;
      writeCoffeeQuizStorage({ submission, result: quizResult });
      setSaveTone('success');
      setSaveMessage(t('測驗資料已寫入完成。', 'Quiz data has been saved successfully.', '診断データの保存が完了しました。', '퀴즈 데이터 저장이 완료되었습니다.'));
      setSaving(false);
      setSaved(true);
    };

    void autoSave();

    return () => {
      cancelled = true;
    };
  }, [done, quizResult, saved, saving, user, profile, questions, answers, t]);

  const onNext = () => {
    if (!current || !answers[current.id]) return;
    if (index === questions.length - 1) setDone(true);
    else setIndex((v) => v + 1);
  };

  const reset = () => {
    setIndex(0);
    setAnswers({});
    setDone(false);
    setSaved(false);
    setSaving(false);
    setSaveMessage('');
    setSaveTone('');
    setRecommendedProducts([]);
    setRecommendationsMessage('');
    setRecommendationsLoading(false);
  };

  const scoreBars = activeResult ? [
    { key: '淺焙', label: t('淺焙', 'Light', '浅煎り', '라이트'), value: activeResult.scores['淺焙'] },
    { key: '淺中焙', label: t('淺中焙', 'Light-Medium', '浅中煎り', '라이트미디엄'), value: activeResult.scores['淺中焙'] },
    { key: '中焙', label: t('中焙', 'Medium', '中煎り', '미디엄'), value: activeResult.scores['中焙'] },
    { key: '中深焙', label: t('中深焙', 'Medium-Dark', '中深煎り', '미디엄다크'), value: activeResult.scores['中深焙'] },
    { key: '深焙', label: t('深焙', 'Dark', '深煎り', '다크'), value: activeResult.scores['深焙'] },
  ] : [];

  return (
    <div className="min-h-screen bg-[#f8f8f8]">
      <SEOHead
        title={t('AI 尋豆師', 'AI Coffee Finder', 'AIコーヒーファインダー', 'AI 원두 찾기')}
        description={t('\u7528 12 \u984c\u627e\u51fa\u4f60\u7684\u5496\u5561\u504f\u597d\u8f2a\u5ed3\u3002', 'Find your coffee preference profile in 12 questions.', '12\u306e\u8cea\u554f\u3067\u3042\u306a\u305f\u306e\u30b3\u30fc\u30d2\u30fc\u50be\u5411\u3092\u898b\u3064\u3051\u307e\u3059\u3002', '12\uac1c\uc758 \uc9c8\ubb38\uc73c\ub85c \ub2f9\uc2e0\uc758 \ucee4\ud53c \ucde8\ud5a5\uc744 \ucc3e\uc544\ubcf4\uc138\uc694\u3002')}
      />
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between text-sm text-[#9c6b2f]">
          <Link to="/" className="inline-flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {t('返回首頁', 'Back Home', 'ホームへ戻る', '홈으로')}
          </Link>
          <span>
            {t('\u9032\u5ea6', 'Progress', '\u9032\u6357', '\uc9c4\ud589\ub3c4')} {Math.min(answeredCount, questions.length)}/{questions.length || 12}
          </span>
        </div>

        {activeResult && (
          <section className="mb-4 overflow-hidden rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#fff8ee] to-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#f6ead7] px-3 py-1 text-sm font-semibold text-[#8a5a22]">
                  <Sparkles className="h-4 w-4" />
                  {hasSavedResult && !quizResult
                    ? t('你已完成測驗', 'Your saved result', '保存済みの結果', '저장된 결과')
                    : t('你的咖啡偏好', 'Your coffee profile', 'あなたのコーヒープロファイル', '당신의 커피 프로필')}
                </div>
                <h2 className="text-2xl font-black text-[#2b2b2b]">{activeResult.label}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-gray-700">{activeResult.summary}</p>
                {hasSavedResult && !quizResult && (
                  <p className="mt-2 text-xs text-gray-500">
                    {t(
                      '這是你上次測驗留下的結果，下面會直接顯示最適合你的訂閱咖啡。',
                      'This is your saved quiz result, and the best subscription coffee matches are shown below.',
                      'これは保存された診断結果です。下にあなたに合う定期便コーヒーを表示します。',
                      '이것은 저장된 퀴즈 결과이며, 아래에 맞는 정기구독 커피를 표시합니다.',
                    )}
                  </p>
                )}
              </div>

              <div className="grid min-w-[220px] grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {scoreBars.map((item) => (
                  <div key={item.key} className="rounded-2xl border border-[#f0e7d8] bg-white px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-700">{item.label}</span>
                      <span className="font-bold text-[#8a5a22]">{item.value}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-white/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#8a5a22]">
                    {t('推薦訂閱咖啡', 'Recommended subscription coffee', 'おすすめの定期便コーヒー', '추천 정기구독 커피')}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {t(
                      '以下商品依你的咖啡輪廓排序，最上方就是最適合的訂閱咖啡。',
                      'Products are ranked by your coffee profile, and the first one is the best subscription match.',
                      '商品はあなたのコーヒープロファイルで並び替えられ、先頭が最適な定期便です。',
                      '상품은 커피 프로필 기준으로 정렬되며, 맨 위가 가장 잘 맞는 정기구독입니다.',
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-[#f6ead7] px-3 py-1 text-xs font-bold text-[#8a5a22]">
                  {recommendedProducts.length}/{RECOMMENDATION_LIMIT}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#e9dcc8] bg-white px-4 py-2 text-sm font-semibold text-[#6f4f2b] transition hover:border-[#c09a6a] hover:text-[#8a5a22]"
                >
                  {t('查看全部咖啡', 'Browse all coffee', 'コーヒー一覧を見る', '모든 커피 보기')}
                </Link>
                <Link
                  to="/shop?search=定期便"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#2C1F10] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3a2a17]"
                >
                  {t('查看定期便', 'View subscriptions', '定期便を見る', '정기구독 보기')}
                </Link>
              </div>

              {recommendationsLoading ? (
                <div className="mt-4 grid gap-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="animate-pulse rounded-2xl border border-[#f0e7d8] bg-[#fcfaf6] p-3">
                      <div className="h-4 w-2/3 rounded bg-[#efe5d4]" />
                      <div className="mt-2 h-3 w-1/3 rounded bg-[#f4ede2]" />
                    </div>
                  ))}
                </div>
              ) : recommendationsMessage ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {recommendationsMessage}
                </div>
              ) : recommendedProducts.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-2xl bg-white/70">
                  {recommendedProducts.slice(0, 3).map((item, index) => (
                    <Link
                      key={item.product.id}
                      to={'/shop/' + item.product.id}
                      className={`flex items-center gap-3 px-3 py-3 transition ${index > 0 ? 'border-t border-[#efe3d3]' : ''}`}
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f2f2f2]">
                        <img
                          src={item.product.image_url || PRODUCT_FALLBACK_IMAGE}
                          alt={item.product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-bold text-[#222]">{item.product.name}</p>
                            <p className="mt-1 text-xs text-[#8a5a22]">{formatCurrency(item.product.price)}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#f6ead7] px-2 py-1 text-[11px] font-bold text-[#8a5a22]">
                            {Math.max(item.score, 0)} pt
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        )}

        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          {loading ? (
            <div className="py-24 text-center text-gray-500">{t('題目載入中...', 'Loading questions...', '質問を読み込み中...', '질문을 불러오는 중...')}</div>
          ) : !done && current ? (
            <>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#f6ead7] px-3 py-1 text-sm font-semibold text-[#8a5a22]">
                <Coffee className="h-4 w-4" />
                {t('AI 尋豆師', 'AI Coffee Finder', 'AIコーヒーファインダー', 'AI 원두 찾기')}
              </div>

              {current.image_url && (
                <div className="mb-5 overflow-hidden rounded-2xl bg-[#f3f3f3]">
                  <img src={current.image_url} alt={current.question_text} className="h-72 w-full object-contain" />
                </div>
              )}

              <h2 className="mb-4 text-3xl font-black text-[#1a1a1a]">{current.question_text}</h2>

              <div className="space-y-3">
                {current.options.map((opt) => {
                  const active = answers[current.id] === opt.option_key;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: opt.option_key }))}
                      className={`w-full rounded-2xl border px-4 py-3 text-left text-lg transition ${active ? 'border-[#c09a6a] bg-[#f8efe2]' : 'border-gray-200 bg-white hover:border-[#d9c39d]'}`}
                    >
                      <span className="mr-2 font-bold">{opt.option_key}.</span>
                      {opt.option_text}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIndex((v) => Math.max(0, v - 1))}
                  className="rounded-xl border px-5 py-2.5 text-gray-600 disabled:opacity-40"
                  disabled={index === 0}
                >
                  {t('上一題', 'Previous', '前の問題', '이전')}
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded-xl bg-[#d8c5a6] px-5 py-2.5 font-semibold text-white disabled:opacity-60"
                  disabled={!answers[current.id]}
                >
                  {index === questions.length - 1 ? t('看結果', 'View Result', '結果を見る', '결과 보기') : t('下一題', 'Next', '次へ', '다음')}
                </button>
              </div>
            </>
          ) : quizResult ? (
            <>
              <div className="mx-auto mb-3 w-fit rounded-full bg-white px-5 py-2 text-xl font-black text-[#3b2a19] shadow-sm">
                {t('測驗結果', 'Quiz Result', '診断結果', '진단 결과')}
              </div>

              <div className="rounded-3xl border border-[#eadfce] bg-gradient-to-br from-[#fff9f0] to-white p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#8a5a22]">
                  <Sparkles className="h-4 w-4" />
                  {t('你的咖啡偏好輪廓', 'Your coffee profile', 'あなたのコーヒープロファイル', '당신의 커피 프로필')}
                </div>
                <h3 className="mb-2 text-3xl font-black text-[#2b2b2b]">{quizResult.label}</h3>
                <p className="text-base leading-7 text-gray-700">{quizResult.summary}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {scoreBars.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-[#efe5d4] bg-white p-3">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700">{item.label}</span>
                        <span className="font-bold text-[#8a5a22]">{item.value}/10</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#f2ede3]">
                        <div className="h-full rounded-full bg-[#c09a6a]" style={{ width: `${item.value * 10}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-white/80 p-4">
                  <p className="text-sm font-semibold text-gray-900">{t('適合你的風味與豆子', 'Best match notes', 'おすすめの風味と豆', '추천 풍미와 원두')}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quizResult.flavorNotes.map((note) => (
                      <span key={note} className="rounded-full bg-[#f6ead7] px-3 py-1 text-sm text-[#8a5a22]">
                        {note}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 text-sm leading-7 text-gray-700">
                    <span className="font-semibold text-gray-900">{t('沖煮建議：', 'Brew tip: ', '抽出のおすすめ：', '추출 팁: ')}</span>
                    {quizResult.brewHint}
                  </div>
                  <div className="mt-4 text-sm leading-7 text-gray-700">
                    <span className="font-semibold text-gray-900">{t('推薦豆型：', 'Bean style: ', 'おすすめ豆：', '추천 원두: ')}</span>
                    {quizResult.beanStyle.join('、')}
                  </div>
                </div>

                <div className="mt-5 rounded-3xl bg-[#faf6ee] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#8a5a22]">{t('最符合的商品建議', 'Best product matches', '最も合う商品おすすめ', '가장 잘 맞는 상품 추천')}</p>
                      <p className="mt-1 text-xs text-gray-500">{t('依照你的測驗結果、風味偏好與商品資料自動排序。', 'Ranked by your quiz result, flavor profile, and product data.', '診断結果、風味傾向、商品情報をもとに自動で並べ替えています。', '퀴즈 결과와 풍미 선호, 상품 정보를 바탕으로 자동 정렬했습니다.')}</p>
                    </div>
                    <span className="rounded-full bg-[#f3e4cf] px-3 py-1 text-xs font-bold text-[#8a5a22]">
                      {recommendedProducts.length}/{RECOMMENDATION_LIMIT}
                    </span>
                  </div>

                  {recommendationsLoading ? (
                    <div className="mt-4 grid gap-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="animate-pulse rounded-2xl border border-[#f0e7d8] bg-[#fcfaf6] p-3">
                          <div className="flex gap-3">
                            <div className="h-20 w-20 rounded-xl bg-[#f1eadf]" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-2/3 rounded bg-[#efe5d4]" />
                              <div className="h-3 w-1/3 rounded bg-[#f4ede2]" />
                              <div className="h-3 w-full rounded bg-[#f4ede2]" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recommendationsMessage ? (
                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {recommendationsMessage}
                    </div>
                  ) : recommendedProducts.length > 0 ? (
                    <div className="mt-4 overflow-hidden rounded-2xl bg-white/70">
                      {recommendedProducts.slice(0, 3).map((item, index) => (
                        <Link
                          key={item.product.id}
                          to={'/shop/' + item.product.id}
                          className={`flex items-center gap-3 px-3 py-3 transition ${index > 0 ? 'border-t border-[#efe3d3]' : ''}`}
                        >
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f2f2f2]">
                            <img
                              src={item.product.image_url || PRODUCT_FALLBACK_IMAGE}
                              alt={item.product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="line-clamp-1 text-sm font-bold text-[#222]">{item.product.name}</p>
                                <p className="mt-1 text-xs text-[#8a5a22]">{formatCurrency(item.product.price)}</p>
                              </div>
                              <span className="shrink-0 rounded-full bg-[#f6ead7] px-2 py-1 text-[11px] font-bold text-[#8a5a22]">
                                {Math.max(item.score, 0)} pt
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {saveMessage && (
                <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${saveTone === 'success' ? 'border-green-200 bg-green-50 text-green-700' : saveTone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {saveMessage}
                </div>
              )}

              {saving && (
                <p className="mt-4 text-center text-sm font-medium text-gray-500">
                  {t('存檔完成', 'Save complete', '保存完了', '저장 완료')}
                </p>
              )}

              {!user && (
                <p className="mt-3 text-center text-sm text-gray-500">
                  {t('登入後會自動把測驗結果寫入會員資料。', 'Sign in and the quiz result will be saved to your profile automatically.', 'サインインすると、診断結果が自動的にプロフィールに保存されます。', '로그인하면 퀴즈 결과가 회원 정보에 자동으로 저장됩니다.')}
                </p>
              )}

              <button
                type="button"
                onClick={reset}
                className="mx-auto mt-4 flex items-center gap-2 rounded-xl border px-4 py-2 text-sm text-gray-600"
              >
                <RotateCcw className="h-4 w-4" />
                {t('重新測驗', 'Retake Quiz', 'もう一度診断', '다시 테스트')}
              </button>
            </>
          ) : (
            <div className="py-24 text-center text-gray-500">{t('目前沒有可顯示的題目。', 'No questions available.', '表示できる質問がありません。', '표시할 질문이 없습니다.')}</div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
