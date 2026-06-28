export type RoastLabel = '淺焙' | '淺中焙' | '中焙' | '中深焙' | '深焙';
export type Level = '新手' | '專家';
export type SpecialTag = '專家' | '香氣' | '厚實' | '怕酸' | '怕苦';

export type BeanFinderQuestionOption = {
  id: string;
  option_key: 'A' | 'B' | 'C' | 'D' | 'E';
  option_text: string;
  score: number;
};

export type BeanFinderQuestion = {
  id: string;
  question_text: string;
  image_url: string | null;
  display_order: number;
  options: BeanFinderQuestionOption[];
};

export type BeanFinderChoiceEffect = {
  id: string;
  question: string;
  indexLabel: string;
  content: string;
  roastLabels: RoastLabel[];
  specialTags: SpecialTag[];
  dose: number;
  mouthfeelLowDelta: number;
  mouthfeelHighDelta: number;
  acidLowDelta: number;
  acidHighDelta: number;
  flavorLowDelta: number;
  flavorHighDelta: number;
};

export type BeanFinderBaseRange = {
  roastLow: number;
  roastHigh: number;
  acidLow: number;
  acidHigh: number;
  mouthfeelLow: number;
  mouthfeelHigh: number;
  flavorLow: number;
  flavorHigh: number;
};

export type BeanFinderResultType = {
  name: string;
  roastLabel: RoastLabel;
  level: Level;
  description: string;
  image: string;
};

export type BeanFinderResult = {
  label: string;
  summary: string;
  brewHint: string;
  flavorNotes: string[];
  beanStyle: string[];
  scores: Record<RoastLabel, number>;
  roastScores: Record<RoastLabel, number>;
  primaryRoast: RoastLabel;
  level: Level;
  resultTypeName: string;
  resultDescription: string;
  resultImage: string;
  specialTags: SpecialTag[];
  dose: number;
  roastRange: [number, number];
  acidityRange: [number, number];
  mouthfeelRange: [number, number];
  flavorRange: [number, number];
  age?: string;
  gender?: string;
};
