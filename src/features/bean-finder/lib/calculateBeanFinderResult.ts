import { BEAN_FINDER_CHOICE_EFFECTS, BASE_RANGE_BY_ROAST, ROAST_ORDER } from '../data/beanFinderChoiceEffects';
import { BEAN_FINDER_RESULT_TYPES } from '../data/beanFinderResultTypes';
import type { BeanFinderChoiceEffect, BeanFinderResult, Level, RoastLabel, SpecialTag } from '../types';

const CHOICE_EFFECT_BY_ID = Object.fromEntries(
  BEAN_FINDER_CHOICE_EFFECTS.map((effect) => [effect.id, effect]),
) as Record<string, BeanFinderChoiceEffect>;

const QUESTION_11_TITLE = '請問你的年齡？';
const QUESTION_12_TITLE = '請問你的性別？';

function toNumber(value: unknown) {
  const parsed = Number(String(value ?? '').trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickPrimaryRoast(roastScores: Record<RoastLabel, number>) {
  const maxScore = Math.max(...ROAST_ORDER.map((label) => roastScores[label] || 0));
  const tied = ROAST_ORDER.filter((label) => (roastScores[label] || 0) === maxScore);
  return tied[0] || '中焙';
}

function normalizeScore(value: number, max: number) {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(0, Math.min(10, Math.round((value / max) * 10)));
}

function uniqueTags(values: SpecialTag[]) {
  return [...new Set(values)];
}

function resolveResultTypeName(primaryRoast: RoastLabel, level: Level) {
  return `${primaryRoast}的${level}`;
}

export function calculateBeanFinderResult(selectedChoiceIds: string[]): BeanFinderResult | null {
  if (!selectedChoiceIds.length) return null;
  if (selectedChoiceIds.length !== 12) throw new Error('AI 尋豆師必須完成 12 題');

  const selected = selectedChoiceIds.map((id) => CHOICE_EFFECT_BY_ID[id]).filter(Boolean);
  if (selected.length !== 12) throw new Error('包含無效選項');

  const roastScores: Record<RoastLabel, number> = {
    '淺焙': 0,
    '淺中焙': 0,
    '中焙': 0,
    '中深焙': 0,
    '深焙': 0,
  };

  const specialTags = new Set<SpecialTag>();
  let dose = 0;
  let mouthfeelLow = 0;
  let mouthfeelHigh = 0;
  let acidLow = 0;
  let acidHigh = 0;
  let flavorLow = 0;
  let flavorHigh = 0;
  let age: string | undefined;
  let gender: string | undefined;

  for (const choice of selected) {
    for (const roast of choice.roastLabels) {
      roastScores[roast] = (roastScores[roast] || 0) + 1;
    }
    for (const tag of choice.specialTags) {
      specialTags.add(tag);
    }

    dose += toNumber(choice.dose);
    mouthfeelLow += toNumber(choice.mouthfeelLowDelta);
    mouthfeelHigh += toNumber(choice.mouthfeelHighDelta);
    acidLow += toNumber(choice.acidLowDelta);
    acidHigh += toNumber(choice.acidHighDelta);
    flavorLow += toNumber(choice.flavorLowDelta);
    flavorHigh += toNumber(choice.flavorHighDelta);

    if (choice.question === QUESTION_11_TITLE) age = choice.content;
    if (choice.question === QUESTION_12_TITLE) gender = choice.content;
  }

  const primaryRoast = pickPrimaryRoast(roastScores);
  const level: Level = specialTags.has('專家') ? '專家' : '新手';
  const resultTypeName = resolveResultTypeName(primaryRoast, level);
  const resultType = BEAN_FINDER_RESULT_TYPES[resultTypeName] || BEAN_FINDER_RESULT_TYPES['中焙的新手'];
  const base = BASE_RANGE_BY_ROAST[primaryRoast];
  const maxRoast = Math.max(...ROAST_ORDER.map((label) => roastScores[label] || 0), 1);

  return {
    label: resultTypeName,
    summary: resultType.description,
    brewHint: resultType.brewHint,
    flavorNotes: resultType.flavorNotes,
    beanStyle: resultType.beanStyle,
    scores: {
      '淺焙': normalizeScore(roastScores['淺焙'], maxRoast),
      '淺中焙': normalizeScore(roastScores['淺中焙'], maxRoast),
      '中焙': normalizeScore(roastScores['中焙'], maxRoast),
      '中深焙': normalizeScore(roastScores['中深焙'], maxRoast),
      '深焙': normalizeScore(roastScores['深焙'], maxRoast),
    },
    roastScores,
    primaryRoast,
    level,
    resultTypeName,
    resultDescription: resultType.description,
    resultImage: resultType.image,
    specialTags: uniqueTags([...specialTags]),
    dose,
    roastRange: [base.roastLow, base.roastHigh],
    acidityRange: [base.acidLow + acidLow, base.acidHigh + acidHigh],
    mouthfeelRange: [base.mouthfeelLow + mouthfeelLow, base.mouthfeelHigh + mouthfeelHigh],
    flavorRange: [base.flavorLow + flavorLow, base.flavorHigh + flavorHigh],
    age,
    gender,
  };
}

