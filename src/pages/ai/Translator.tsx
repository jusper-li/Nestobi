import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Mic, Volume2, Square, Sparkles, Trash2 } from 'lucide-react';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../../lib/i18n';
import { callAI } from '../../lib/openai';

type Locale = 'zh-TW' | 'en' | 'ja' | 'ko';
type TranslateLang = 'auto' | 'zh-TW' | 'en' | 'ja' | 'ko';

const pick = (locale: Locale, zh: string, en: string, ja: string, ko: string) =>
  pickByLang(locale, zh, en, ja, ko);

const languageLabel = (value: TranslateLang, locale: Locale) =>
  SOURCE_OPTIONS.find(option => option.value === value)?.label[locale] || value;

const speakerSelfLabel = (value: TranslateLang) => {
  if (value === 'en') return 'I speak';
  if (value === 'ja') return '\u79c1\u304c\u8a71\u3057\u307e\u3059';
  if (value === 'ko') return '\ub098\ub294 \ub9d0\ud574\uc694';
  return '\u6211\u8aaa';
};

const STORAGE_KEY = 'nestobi-ai-translator-preferences';

const SOURCE_OPTIONS: Array<{ value: TranslateLang; label: Record<Locale, string> }> = [
  {
    value: 'auto',
    label: {
      'zh-TW': '\u81ea\u52d5\u8fa8\u8b58',
      en: 'Auto detect',
      ja: '\u81ea\u52d5\u5224\u5b9a',
      ko: '\uc790\ub3d9 \uac10\uc9c0',
    },
  },
  {
    value: 'zh-TW',
    label: {
      'zh-TW': '\u7e41\u9ad4\u4e2d\u6587',
      en: 'Traditional Chinese',
      ja: '\u4e2d\u56fd\u8a9e\uff08\u7e41\u4f53\u5b57\uff09',
      ko: '\uc911\uad6d\uc5b4(\ubc88\uccb4)',
    },
  },
  {
    value: 'en',
    label: {
      'zh-TW': '\u82f1\u6587',
      en: 'English',
      ja: '\u82f1\u8a9e',
      ko: '\uc601\uc5b4',
    },
  },
  {
    value: 'ja',
    label: {
      'zh-TW': '\u65e5\u6587',
      en: 'Japanese',
      ja: '\u65e5\u672c\u8a9e',
      ko: '\uc77c\ubcf8\uc5b4',
    },
  },
  {
    value: 'ko',
    label: {
      'zh-TW': '\u97d3\u6587',
      en: 'Korean',
      ja: '\u97d3\u56fd\u8a9e',
      ko: '\ud55c\uad6d\uc5b4',
    },
  },
];

const TARGET_OPTIONS = SOURCE_OPTIONS.filter(option => option.value !== 'auto');

type PhraseSide = 'me' | 'other';
type VoiceSpeaker = 'me' | 'other';
type VoiceStatus = 'idle' | 'recording' | 'transcribing' | 'translating' | 'speaking' | 'error';
type TranslatorMode = 'text' | 'voice';

type ConversationMessage = {
  id: string;
  speaker: VoiceSpeaker;
  sourceLang: TranslateLang;
  targetLang: Exclude<TranslateLang, 'auto'>;
  sourceText: string;
  translatedText: string;
  createdAt: string;
};

const QUICK_PHRASES: Array<{ side: PhraseSide; text: string; label: Record<Locale, string> }> = [
  { side: 'me', text: '\u4f60\u597d\uff0c\u5f88\u9ad8\u8208\u8a8d\u8b58\u4f60\u3002', label: { 'zh-TW': '\u4f60\u597d\uff0c\u5f88\u9ad8\u8208\u8a8d\u8b58\u4f60', en: 'Hello, nice to meet you.', ja: '\u3053\u3093\u306b\u3061\u306f\u3001\u304a\u4f1a\u3044\u3067\u304d\u3066\u5b09\u3057\u3044\u3067\u3059', ko: '\uc548\ub155\ud558\uc138\uc694, \ub9cc\ub098\uc11c \ubc18\uac00\uc6cc\uc694' } },
  { side: 'me', text: '\u8acb\u554f\u9019\u9644\u8fd1\u6709\u63a8\u85a6\u7684\u9910\u5ef3\u55ce\uff1f', label: { 'zh-TW': '\u9019\u9644\u8fd1\u6709\u63a8\u85a6\u7684\u9910\u5ef3\u55ce\uff1f', en: 'Is there a restaurant you recommend nearby?', ja: '\u3053\u306e\u8fd1\u304f\u306b\u304a\u3059\u3059\u3081\u306e\u30ec\u30b9\u30c8\u30e9\u30f3\u306f\u3042\u308a\u307e\u3059\u304b\uff1f', ko: '\uc774 \uadfc\ucc98\uc5d0 \ucd94\ucc9c\ud560 \ub9cc\ud55c \ub808\uc2a4\ud1a0\ub791\uc774 \uc788\ub098\uc694?' } },
  { side: 'me', text: '\u6211\u8981\u53bb\u9019\u500b\u5730\u5740\uff0c\u8acb\u554f\u600e\u9ebc\u8d70\uff1f', label: { 'zh-TW': '\u6211\u8981\u53bb\u9019\u500b\u5730\u5740\uff0c\u600e\u9ebc\u8d70\uff1f', en: 'I need to go to this address. How do I get there?', ja: '\u3053\u306e\u4f4f\u6240\u306b\u884c\u304d\u305f\u3044\u306e\u3067\u3059\u304c\u3001\u3069\u3046\u884c\u3051\u3070\u3088\u3044\u3067\u3059\u304b\uff1f', ko: '\uc774 \uc8fc\uc18c\ub85c \uac00\ub824\uba74 \uc5b4\ub5bb게 \uac00\uc57c \ud558\ub098\uc694?' } },
  { side: 'other', text: '\u8acb\u7a0d\u7b49\u4e00\u4e0b\u3002', label: { 'zh-TW': '\u8acb\u7a0d\u7b49\u4e00\u4e0b', en: 'Please wait a moment.', ja: '\u5c11\u3005\u304a\u5f85\u3061\u304f\u3060\u3055\u3044', ko: '\uc7a0\uc2dc\ub9cc \uae30\ub2e4\ub824 \uc8fc\uc138\uc694' } },
  { side: 'other', text: '\u8acb\u554f\u60a8\u9700\u8981\u4ec0\u9ebc\u5354\u52a9\uff1f', label: { 'zh-TW': '\u8acb\u554f\u60a8\u9700\u8981\u4ec0\u9ebc\u5354\u52a9\uff1f', en: 'How can I help you?', ja: '\u3069\u306e\u3088\u3046\u306a\u304a\u624b\u4f1d\u3044\u304c\u5fc5\u8981\u3067\u3059\u304b\uff1f', ko: '\ubb34\uc5c7\uc744 \ub3c4\uc640\ub4dc\ub9b4\uae4c\uc694?' } },
  { side: 'other', text: '\u9019\u88e1\u53ef\u4ee5\u5237\u5361\u4ed8\u6b3e\u55ce\uff1f', label: { 'zh-TW': '\u9019\u88e1\u53ef\u4ee5\u5237\u5361\u4ed8\u6b3e\u55ce\uff1f', en: 'Can I pay by card here?', ja: '\u3053\u3053\u3067\u30ab\u30fc\u30c9\u3067\u652f\u6255\u3048\u307e\u3059\u304b\uff1f', ko: '\uc5ec\uae30\uc11c \uce74\ub4dc\ub85c \uacb0\uc81c\ud560 \uc218 \uc788\ub098\uc694?' } },
];

type StoredPreferences = {
  sourceLang?: TranslateLang;
  targetLang?: TranslateLang;
};

type SpeechRecognitionEventLike = Event & {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      length: number;
      [index: number]: { transcript: string };
    };
  };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const isTranslateLang = (value: unknown): value is TranslateLang =>
  value === 'auto' || value === 'zh-TW' || value === 'en' || value === 'ja' || value === 'ko';

export default function Translator() {
  const { lang } = useLanguage();
  const locale = normalizeLang(lang) as Locale;
  const lastManualSourceLang = useRef<Exclude<TranslateLang, 'auto'>>('zh-TW');
  const sourceTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resultTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceTextRef = useRef('');
  const shouldTranslateVoiceRef = useRef(false);
  const voiceBaseSourceRef = useRef<TranslateLang>('auto');
  const voiceBaseTargetRef = useRef<Exclude<TranslateLang, 'auto'>>('en');
  const continueConversationRef = useRef(false);

  const [sourceLang, setSourceLang] = useState<TranslateLang>('auto');
  const [targetLang, setTargetLang] = useState<Exclude<TranslateLang, 'auto'>>('en');
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [activeSpeaker, setActiveSpeaker] = useState<VoiceSpeaker | null>(null);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [translatorMode, setTranslatorMode] = useState<TranslatorMode>('text');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as StoredPreferences;
      if (isTranslateLang(parsed.sourceLang)) {
        setSourceLang(parsed.sourceLang);
        if (parsed.sourceLang !== 'auto') {
          lastManualSourceLang.current = parsed.sourceLang;
        }
      }
      if (isTranslateLang(parsed.targetLang) && parsed.targetLang !== 'auto') {
        setTargetLang(parsed.targetLang);
      }
    } catch {
      // Ignore invalid storage.
    }
  }, []);

  useEffect(() => {
    if (sourceLang !== 'auto') {
      lastManualSourceLang.current = sourceLang;
    }
  }, [sourceLang]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sourceLang,
        targetLang,
      }),
    );
  }, [sourceLang, targetLang]);

  const resizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    resizeTextarea(sourceTextareaRef.current);
  }, [sourceText]);

  useLayoutEffect(() => {
    resizeTextarea(resultTextareaRef.current);
  }, [resultText]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  const title = useMemo(() => pick(locale, '\u0041\u0049 \u5373\u6642\u7ffb\u8b6f', 'AI Translator', 'AI \u7ffb\u8a33', 'AI \ube0c\ub79c\uc2f1'), [locale]);
  const subtitle = useMemo(
    () =>
      pick(
        locale,
        '\u8f38\u5165\u6587\u5b57\u5f8c\u5373\u53ef\u5feb\u901f\u7ffb\u8b6f\uff0c\u4e26\u4fdd\u7559\u4f60\u4e0a\u6b21\u9078\u64c7\u7684\u8a9e\u7cfb\u3002',
        'Paste text, translate instantly, and keep your last language choices.',
        '\u30c6\u30ad\u30b9\u30c8\u3092\u5165\u529b\u3059\u308b\u3068\u3059\u3050\u306b\u7ffb\u8a33\u3067\u304d\u307e\u3059\u3002\u524d\u56de\u306e\u8a00\u8a9e\u8a2d\u5b9a\u3082\u8a18\u61b6\u3057\u307e\u3059\u3002',
        '\ud14d\uc2a4\ud2b8\ub97c \uc785\ub825\ud558\uba74 \ubc14\ub85c \ubc88\uc5ed\ub418\uace0, \ub9c8\uc9c0\ub9c9 \uc5b8\uc5b4 \uc124\uc815\ub3c4 \uae30\uc5b5\ud569\ub2c8\ub2e4.',
      ),
    [locale],
  );

  const sourceLabel = useMemo(
    () => SOURCE_OPTIONS.find(option => option.value === sourceLang)?.label[locale] || '',
    [locale, sourceLang],
  );
  const targetLabel = useMemo(
    () => TARGET_OPTIONS.find(option => option.value === targetLang)?.label[locale] || '',
    [locale, targetLang],
  );

  const onSwap = () => {
    if (sourceLang === 'auto') {
      const nextTarget = lastManualSourceLang.current === targetLang ? 'zh-TW' : lastManualSourceLang.current;
      setSourceLang(targetLang);
      setTargetLang(nextTarget);
      return;
    }

    const nextSource = targetLang;
    const nextTarget = sourceLang;
    setSourceLang(nextSource);
    setTargetLang(nextTarget);
  };

  const onClear = () => {
    continueConversationRef.current = false;
    setSourceText('');
    setResultText('');
    setConversationMessages([]);
    setVoiceStatus('idle');
  };

  const translateText = async (
    text: string,
    languagePair: { sourceLang: TranslateLang; targetLang: Exclude<TranslateLang, 'auto'> } = { sourceLang, targetLang },
  ): Promise<string> => {
    if (!text.trim() || loading) return '';
    setLoading(true);
    setVoiceStatus('translating');
    try {
      const translated = await callAI<string>('translate', {
        text,
        sourceLang: languagePair.sourceLang,
        targetLang: languagePair.targetLang,
        language: locale,
      });
      const result = translated?.trim() || '';
      setResultText(result);
      return result;
    } catch {
      setResultText(
        pick(
          locale,
          '\u7ffb\u8b6f\u5931\u6557\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002',
          'Translation failed. Please try again later.',
          '\u7ffb\u8a33\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u3057\u3070\u3089\u304f\u3057\u3066\u304b\u3089\u518d\u8a66\u884c\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
          '\ubc88\uc5ed\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \uc7a0\uc2dc \ud6c4 \ub2e4\uc2dc \uc2dc\ub3c4\ud574 \uc8fc\uc138\uc694.',
        ),
      );
      setVoiceStatus('error');
      return '';
    } finally {
      setLoading(false);
      setVoiceStatus(current => current === 'error' ? current : 'idle');
    }
  };

  const onTranslate = () => void translateText(sourceText);

  const getSpeechConstructor = (): SpeechRecognitionConstructor | null => {
    if (typeof window === 'undefined') return null;
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
  };

  const speechLang = (value: TranslateLang) => {
    if (value === 'en') return 'en-US';
    if (value === 'ja') return 'ja-JP';
    if (value === 'ko') return 'ko-KR';
    return 'zh-TW';
  };

  const onStartListening = (speaker: VoiceSpeaker = 'me') => {
    const SpeechRecognition = getSpeechConstructor();
    if (!SpeechRecognition) {
      setVoiceError(pick(locale, '\u6b64\u700f\u89bd\u5668\u4e0d\u652f\u63f4\u8a9e\u97f3\u8f38\u5165\uff0c\u8acb\u6539\u7528 Chrome \u6216 Edge\u3002', 'Voice input is not supported in this browser. Try Chrome or Edge.', '\u3053\u306e\u30d6\u30e9\u30a6\u30b6\u306f\u97f3\u58f0\u5165\u529b\u306b\u5bfe\u5fdc\u3057\u3066\u3044\u307e\u305b\u3093\u3002', '\uc774 \ube0c\ub77c\uc6b0\uc800\ub294 \uc74c\uc131 \uc785\ub825\uc744 \uc9c0\uc6d0\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.'));
      return;
    }

    setVoiceError('');
    if (!continueConversationRef.current) {
      voiceBaseSourceRef.current = sourceLang === 'auto' ? lastManualSourceLang.current : sourceLang;
      voiceBaseTargetRef.current = targetLang;
    }
    const myLanguage = voiceBaseSourceRef.current === 'auto' ? lastManualSourceLang.current : voiceBaseSourceRef.current;
    const conversationTarget = voiceBaseTargetRef.current;
    const pair = speaker === 'me'
      ? { sourceLang: myLanguage, targetLang: conversationTarget }
      : { sourceLang: conversationTarget, targetLang: myLanguage };
    continueConversationRef.current = true;
    setSourceLang(pair.sourceLang);
    setTargetLang(pair.targetLang);
    setActiveSpeaker(speaker);
    setVoiceStatus('recording');
    const recognition = new SpeechRecognition();
    voiceTextRef.current = '';
    shouldTranslateVoiceRef.current = true;
    recognition.lang = speechLang(pair.sourceLang);
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognition.onresult = event => {
      let finalText = '';
      let interimText = '';
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript || '';
        if (result.isFinal) finalText += transcript;
        else interimText += transcript;
      }
      voiceTextRef.current = finalText || interimText;
      setSourceText(voiceTextRef.current);
    };
    recognition.onerror = () => {
      shouldTranslateVoiceRef.current = false;
      continueConversationRef.current = false;
      setIsListening(false);
      setActiveSpeaker(null);
      setVoiceStatus('error');
      setVoiceError(pick(locale, '\u7121\u6cd5\u53d6\u5f97\u9ea5\u514b\u98a8\u8a31\u53ef\u6216\u8fa8\u8b58\u8a9e\u97f3\uff0c\u8acb\u6aa2\u67e5\u700f\u89bd\u5668\u6b0a\u9650\u3002', 'Microphone access or speech recognition failed. Check your browser permission.', '\u30de\u30a4\u30afの許\u53ef\u307eた\u306f\u97f3\u58f0\u8a8d\u8b58\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002', '\ub9c8\uc774\ud06c \uad8c\ud55c \ub610\ub294 \uc74c\uc131 \uc778\uc2dd\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.'));
    };
    recognition.onend = () => {
      setIsListening(false);
      const text = voiceTextRef.current.trim();
      setVoiceStatus(text ? 'transcribing' : 'idle');
      if (shouldTranslateVoiceRef.current && text) {
        void translateText(text, pair).then(translatedText => {
          if (!translatedText) return;
          setConversationMessages(messages => [...messages, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            speaker,
            sourceLang: pair.sourceLang,
            targetLang: pair.targetLang,
            sourceText: text,
            translatedText,
            createdAt: new Date().toISOString(),
          }]);
        });
      }
      shouldTranslateVoiceRef.current = false;
      setActiveSpeaker(null);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const onStopListening = () => {
    continueConversationRef.current = false;
    shouldTranslateVoiceRef.current = true;
    recognitionRef.current?.stop();
  };

  const speakText = (text: string, language: TranslateLang) => {
    if (!text.trim() || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = speechLang(language);
    utterance.onstart = () => {
      setIsSpeaking(true);
      setVoiceStatus('speaking');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setVoiceStatus('idle');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setVoiceStatus('error');
    };
    window.speechSynthesis.speak(utterance);
  };

  const onSpeakResult = () => speakText(resultText, targetLang);

  const onSpeakMessage = (message: ConversationMessage) => {
    speakText(message.translatedText, message.targetLang);
  };

  const onStopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setVoiceStatus('idle');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead title={title} description={subtitle} />
      <Navigation />

      <div className="mx-auto max-w-4xl px-4 py-5 sm:py-8">
        <div className="mb-4 text-center sm:mb-5">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{title}</h1>
          <p className="mx-auto mt-2 max-w-2xl text-xs leading-5 text-gray-500 sm:text-base">
            {subtitle}
          </p>
        </div>

        <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm sm:p-6">
          <div className="mb-3 flex rounded-2xl bg-slate-100 p-1">
            {(['text', 'voice'] as TranslatorMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (isListening) onStopListening();
                  setTranslatorMode(mode);
                }}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition ${translatorMode === mode ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {mode === 'text'
                  ? pick(locale, '\u6587\u5b57\u7ffb\u8b6f', 'Text', '\u6587\u5b57\u7ffb\u8a33', '\ubb38\uc790 \ubc88\uc5ed')
                  : pick(locale, '\u8a9e\u97f3\u5c0d\u8a71', 'Voice conversation', '\u97f3\u58f0\u4f1a\u8a71', '\uc74c\uc131 \ub300\ud654')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <select
              value={sourceLang}
              onChange={e => setSourceLang(e.target.value as TranslateLang)}
              aria-label={pick(locale, '來源語言', 'From', '元の言語', '원문 언어')}
              className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-[12px] font-semibold text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              {SOURCE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label[locale]}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onSwap}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50"
              aria-label={pick(locale, '交換語言', 'Swap languages', '言語を入れ替える', '언어 바꾸기')}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </button>

            <select
              value={targetLang}
              onChange={e => setTargetLang(e.target.value as Exclude<TranslateLang, 'auto'>)}
              aria-label={pick(locale, '翻譯成', 'To', '翻訳先', '번역 언어')}
              className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-[12px] font-semibold text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              {TARGET_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label[locale]}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 md:grid md:gap-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-2 py-1.5 sm:px-4 sm:py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
                    {pick(locale, '\u4f86\u6e90\u8a9e\u8a00', 'From', '\u5143\u306e\u8a00\u8a9e', '\uc6d0\ubb38 \uc5b8\uc5b4')}
                  </p>
                </div>
              </div>
              <select
                value={sourceLang}
                onChange={e => setSourceLang(e.target.value as TranslateLang)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-[12px] font-medium text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:mt-3 sm:px-3 sm:py-3 sm:text-sm"
              >
                {SOURCE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={onSwap}
              className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 shadow-sm transition hover:bg-gray-50 sm:h-11 sm:w-11"
              aria-label={pick(locale, '\u4ea4\u63db\u8a9e\u8a00', 'Swap languages', '\u8a00\u8a9e\u3092\u5165\u308c\u66ff\u3048\u308b', '\uc5b8\uc5b4 \ubc14\uafb8\uae30')}
            >
              <ArrowLeftRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-2 py-1.5 sm:px-4 sm:py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-gray-400 sm:text-[11px]">
                    {pick(locale, '\u7ffb\u8b6f\u6210', 'To', '\u7ffb\u8a33\u5148', '\ubc88\uc5ed \uc5b8\uc5b4')}
                  </p>
                </div>
              </div>
              <select
                value={targetLang}
                onChange={e => setTargetLang(e.target.value as Exclude<TranslateLang, 'auto'>)}
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-[12px] font-medium text-gray-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:mt-3 sm:px-3 sm:py-3 sm:text-sm"
              >
                {TARGET_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4">
            <div className={translatorMode === 'voice' ? 'hidden' : ''}>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-base font-semibold text-gray-700">
                  {pick(locale, '\u8f38\u5165\u6587\u5b57', 'Input text', '\u5165\u529b\u30c6\u30ad\u30b9\u30c8', '\uc785\ub825\ud560 \ubb38\uc7a5')}
                </p>
              </div>
              <textarea
                ref={sourceTextareaRef}
                value={sourceText}
                onChange={e => {
                  setSourceText(e.target.value);
                }}
                placeholder={pick(
                  locale,
                  '\u8f38\u5165\u8981\u7ffb\u8b6f\u7684\u6587\u5b57\uff0c\u7cfb\u7d71\u6703\u81ea\u52d5\u8fa8\u8b58\u8a9e\u8a00...',
                  'Type text to translate. The system will auto-detect the language...',
                  '\u7ffb\u8a33\u3057\u305f\u3044\u6587\u7ae0\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002\u8a00\u8a9e\u306f\u81ea\u52d5\u5224\u5b9a\u3055\u308c\u307e\u3059...',
                  '\ubc88\uc5ed\ud560 \ubb38\uc7a5\uc744 \uc785\ub825\ud558\uc138\uc694. \uc5b8\uc5b4\ub294 \uc790\ub3d9\uc73c\ub85c \uac10\uc9c0\ub429\ub2c8\ub2e4...',
                )}
                className="w-full resize-none overflow-hidden rounded-2xl border border-gray-200 px-4 py-3 text-[17px] leading-7 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 sm:text-[17px]"
              />
              <div className="hidden">
                <button
                  type="button"
                  onClick={isListening ? onStopListening : onStartListening}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${isListening ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
                >
                  {isListening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
                  {isListening
                    ? pick(locale, '\u505c\u6b62\u6536\u97f3', 'Stop listening', '\u9332\u97f3\u3092\u505c\u6b62', '\uc74c\uc131 \uc785\ub825 \uc911\uc9c0')
                    : pick(locale, '\u958b\u59cb\u8aaa\u8a71', 'Speak to translate', '\u8a71\u3057\u3066\u7ffb\u8a33', '\ub9d0\ud574\uc11c \ubc88\uc5ed')}
                </button>
                {isListening && (
                  <span className="text-xs text-rose-500">
                    {pick(locale, '\u6b63\u5728\u807d\u53d6\u8a9e\u97f3\uff0c\u8aaa\u5b8c\u5f8c\u5c07\u81ea\u52d5\u7ffb\u8b6f', 'Listening. Translation starts when you finish speaking.', '\u97f3\u58f0\u3092\u805e\u3044\u3066\u3044\u307e\u3059\u3002\u8a71\u3057\u7d42\u308f\u308b\u3068\u7ffb\u8a33\u3057\u307e\u3059\u3002', '\uc74c\uc131\uc744 \ub4e3고 \uc788어요. \ub9d0이 \ub05d나면 \ubc88역합니다.')}
                  </span>
                )}
              </div>
              {voiceError && <p className="hidden">{voiceError}</p>}
            </div>

            <div className={translatorMode === 'voice' ? 'hidden' : ''}>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-base font-semibold text-gray-700">
                  {pick(locale, '\u7ffb\u8b6f\u7d50\u679c', 'Result', '\u7ffb\u8a33\u7d50\u679c', '\ubc88\uc5ed \uacb0\uacfc')}
                </p>
                <button
                  type="button"
                  onClick={isSpeaking ? onStopSpeaking : onSpeakResult}
                  disabled={!resultText.trim()}
                  aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                  title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                  className="hidden"
                >
                  {isSpeaking ? <Square className="h-3.5 w-3.5 fill-teal-600 text-teal-600" /> : <Volume2 className="h-4 w-4 text-teal-600" />}
                  <span className="text-xs font-semibold text-teal-700">
                    {isSpeaking ? '停止朗讀' : '朗讀結果'}
                  </span>
                  {isSpeaking
                    ? pick(locale, '\u505c\u6b62\u6717\u8b80', 'Stop speaking', '\u8aad\u307f\u4e0a\u3052\u3092\u505c\u6b62', '\uc77d\uae30 \uc911\uc9c0')
                    : pick(locale, '\u6717\u8b80\u7ffb\u8b6f\u7d50\u679c', 'Read aloud', '\u7ffb\u8a33\u3092\u8aad\u307f\u4e0a\u3052る', '\ubc88역 \uacb0과 \uc77d\uae30')}
                </button>
              </div>
              <textarea
                ref={resultTextareaRef}
                value={resultText}
                readOnly
                placeholder={pick(
                  locale,
                  '\u7ffb\u8b6f\u7d50\u679c\u6703\u986f\u793a\u5728\u9019\u88e1...',
                  'Translation result appears here...',
                  '\u7ffb\u8a33\u7d50\u679c\u304c\u3053\u3053\u306b\u8868\u793a\u3055\u308c\u307e\u3059...',
                  '\ubc88\uc5ed \uacb0\uacfc\uac00 \uc5ec\uae30\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4...',
                )}
                className="w-full resize-none overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-[17px] leading-7 text-gray-900 outline-none placeholder:text-gray-400 sm:text-[17px]"
              />
              <div className="hidden">
                <button
                  type="button"
                  onClick={isListening ? onStopListening : onStartListening}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${isListening ? 'bg-rose-500 text-white shadow-sm' : 'border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
                >
                  {isListening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-3.5 w-3.5" />}
                  {isListening ? '停止收音' : '開始說話'}
                </button>
                <button
                  type="button"
                  onClick={isSpeaking ? onStopSpeaking : onSpeakResult}
                  disabled={!resultText.trim()}
                  className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  {isSpeaking ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {isSpeaking ? '停止朗讀' : '朗讀結果'}
                </button>
                {voiceError && <span className="basis-full text-xs text-rose-500">{voiceError}</span>}
              </div>
            </div>

            {false && <div className="hidden">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {pick(locale, '\u96d9\u5411\u8a9e\u97f3\u5c0d\u8a71', 'Voice conversation', '\u53cc\u65b9\u5411\u306e\u97f3\u58f0\u4f1a\u8a71', '\uc591\ubc29\ud5a5 \uc74c\uc131 \ub300\ud654')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {pick(locale, '\u8aaa\u5b8c\u5373\u6642\u7ffb\u8b6f\uff0c\u53ef\u96a8\u6642\u91cd\u65b0\u6717\u8b80\u3002', 'Speak, translate, and replay whenever you need.', '\u8a71\u3059\u3068\u3059\u3050\u7ffb\u8a33\u3002\u5fc5\u8981\u306a\u3068\u304d\u306b\u518d\u751f\u3067\u304d\u307e\u3059\u3002', '\ub9d0하면 바로 번역하고, 필요할 때 다시 읽을 수 있어요.')}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-teal-600 shadow-sm">
                  {sourceLabel} → {targetLabel}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl rounded-tl-md bg-white p-3 shadow-sm">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {pick(locale, '\u4f60\u8aaa', 'You said', '\u3042\u306a\u305f\u306e\u767a\u8a00', '\ub0b4\uac00 \ub9d0\ud55c \uac83')}
                  </p>
                  <p className="min-h-6 text-sm leading-6 text-slate-700">{sourceText || '—'}</p>
                </div>
                <div className="rounded-2xl rounded-tr-md bg-teal-50 p-3 shadow-sm">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-teal-600">
                    {pick(locale, '\u7ffb\u8b6f\u56de\u61c9', 'Translation', '\u7ffb\u8a33\u7d50\u679c', '\ubc88역 \uacb0과')}
                  </p>
                  <p className="min-h-6 text-sm leading-6 text-slate-700">{resultText || '—'}</p>
                </div>
              </div>
              </div>}

            {false && <div className="hidden">
              <div className="mb-2 flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-700">
                  {pick(locale, '\u5feb\u901f\u5c0d\u8a71', 'Quick conversation', '\u30af\u30a4\u30c3\u30af\u4f1a\u8a71', '\ube60\ub978 \ub300\ud654')}
                </p>
                <span className="text-xs text-slate-400">
                  {pick(locale, '\u9ede\u4e00\u53e5\u5c31\u6703\u81ea\u52d5\u7ffb\u8b6f', 'Tap a phrase to translate', '\u30d5\u30ec\u30fc\u30ba\u3092\u30bf\u30c3\u30d7\u3059\u308b\u3068\u7ffb\u8a33', '\ubb38장을 \ub204르면 \uc790동으로 \ubc88역')}
                </span>
              </div>
              <div className="mb-2 flex rounded-xl bg-white p-1">
                {(['me', 'other'] as PhraseSide[]).map(side => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setPhraseSide(side)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${phraseSide === side ? 'bg-teal-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {side === 'me'
                      ? pick(locale, '\u6211\u8aaa', 'I say', '\u79c1\u304c\u8a00\u3046', '\ub0b4\uac00 \ub9d0\ud558\uae30')
                      : pick(locale, '\u5c0d\u65b9\u8aaa', 'They say', '\u76f8\u624b\u304c\u8a00\u3046', '\uc0c1대방이 \ub9d0하기')}
                  </button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {QUICK_PHRASES.filter(phrase => phrase.side === phraseSide).map(phrase => (
                  <button
                    key={phrase.text}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setSourceText(phrase.text);
                      void translateText(phrase.text);
                    }}
                    className="rounded-xl border border-white bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {phrase.label[locale]}
                  </button>
                ))}
              </div>
            </div>}

            <div className={`flex flex-col rounded-2xl border border-slate-100 bg-slate-50 p-3 pb-32 sm:p-4 sm:pb-32 ${translatorMode === 'text' ? 'hidden' : ''}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {pick(locale, '\u96d9\u5411\u8a9e\u97f3\u5c0d\u8a71', 'Two-way voice conversation', '\u53cc\u65b9\u5411\u306e\u97f3\u58f0\u4f1a\u8a71', '\uc591\ubc29\ud5a5 \uc74c\uc131 \ub300\ud654')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {pick(locale, '\u6309\u4f4f\u4f60\u8981\u8aaa\u7684\u4e00\u65b9\uff0c\u8aaa\u5b8c\u5c31\u6703\u81ea\u52d5\u7ffb\u8b6f\u3002', 'Choose who is speaking. Translation starts after you finish.', '\u8a71\u3059\u65b9\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044\u3002\u8a71\u3057\u7d42\u308f\u308b\u3068\u7ffb\u8a33\u3057\u307e\u3059\u3002', '\ub9d0\ud558\ub294 \uc0ac\ub78c\uc744 \uc120\ud0dd\ud558세요. \ub9d0이 \ub05d나면 \ubc88역합니다.')}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${voiceStatus === 'error' ? 'bg-rose-100 text-rose-600' : voiceStatus === 'idle' ? 'bg-white text-slate-500' : 'bg-teal-100 text-teal-700'}`}>
                  {voiceStatus === 'recording' ? pick(locale, '\u6536\u97f3\u4e2d', 'Recording', '\u9332\u97f3\u4e2d', '\uc74c\uc131 \ub179\uc74c \uc911')
                    : voiceStatus === 'transcribing' ? pick(locale, '\u8fa8\u8b58\u4e2d', 'Transcribing', '\u6587\u5b57\u8d77\u3053\u3057\u4e2d', '\uc74c\uc131 \uc778\uc2dd \uc911')
                      : voiceStatus === 'translating' ? pick(locale, '\u7ffb\u8b6f\u4e2d', 'Translating', '\u7ffb\u8a33\u4e2d', '\ubc88역 중')
                        : voiceStatus === 'speaking' ? pick(locale, '\u6717\u8b80\u4e2d', 'Speaking', '\u8aad\u307f\u4e0a\u3052\u4e2d', '\uc77d기 중')
                          : voiceStatus === 'error' ? pick(locale, '\u9700\u8981\u91cd\u8a66', 'Try again', '\u3082\u3046\u4e00\u5ea6\u304a\u8a66\u3057\u304f\u3060\u3055\u3044', '\ub2e4시 \uc2dc도')
                            : pick(locale, '\u5f85\u6a5f', 'Ready', '\u6e96\u5099\u5b8c\u4e86', '\uc900비')}
                </span>
              </div>
              <div className="fixed inset-x-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-30 order-2 mx-auto grid max-w-2xl grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-[0_12px_32px_rgba(15,23,42,0.16)] backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-3">
                {(['me', 'other'] as VoiceSpeaker[]).map(speaker => {
                  const isActive = activeSpeaker === speaker && isListening;
                  const language = speaker === 'me' ? (sourceLang === 'auto' ? lastManualSourceLang.current : sourceLang) : targetLang;
                  return (
                    <button
                      key={speaker}
                      type="button"
                      disabled={isListening && !isActive}
                      onClick={() => isActive ? onStopListening() : onStartListening(speaker)}
                      className={`min-h-20 rounded-2xl border px-3 py-2.5 text-left shadow-sm transition ${isActive ? 'border-rose-300 bg-rose-50 text-rose-700 shadow-rose-100' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50'} disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">
                          {speaker === 'me' ? pick(locale, '\u6211\u8aaa', 'I speak', '\u79c1\u304c\u8a00\u3046', '\ub0b4가 \ub9d0하기') : pick(locale, '\u5c0d\u65b9\u8aaa', 'Other person speaks', '\u76f8\u624b\u304c\u8a00\u3046', '\uc0c1대방이 \ub9d0하기')}
                          {speaker === 'other' && <span className="ml-1 font-medium text-teal-600">/ {speakerSelfLabel(language)}</span>}
                          <span className="ml-1 font-medium text-slate-400">({languageLabel(language, locale)})</span>
                        </span>
                        {isActive ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4 text-teal-600" />}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">{language}</span>
                    </button>
                  );
                })}
              </div>
              {voiceError && <p className="fixed inset-x-4 bottom-[calc(10.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-2xl text-center text-xs text-rose-500 sm:inset-x-6 sm:bottom-24">{voiceError}</p>}
              {conversationMessages.length > 0 && (
                <div className="order-1 mt-4 space-y-3 border-t border-slate-200 pt-4">
                  {conversationMessages.slice(-5).reverse().map(message => (
                    <div key={message.id} className={`flex ${message.speaker === 'me' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[92%] rounded-2xl p-3 shadow-sm ${message.speaker === 'me' ? 'rounded-bl-md bg-teal-600 text-white' : 'rounded-br-md bg-white text-slate-800'}`}>
                      <p className="text-[11px] font-semibold text-teal-700">{message.speaker === 'me' ? pick(locale, '\u6211\u8aaa', 'I said', '\u79c1\u304c\u8a00\u3063\u305f', '\ub0b4가 \ub9d0한 \uac83') : pick(locale, '\u5c0d\u65b9\u8aaa', 'They said', '\u76f8\u624b\u304c\u8a00\u3063\u305f', '\uc0c1대방이 \ub9d0한 \uac83')}</p>
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          aria-label={pick(locale, '\u64ad\u653e\u9019\u53e5', 'Replay this message', '\u3053\u306e\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u518d\u751f', '\uc774 \uba54\uc2dc\uc9c0 \ub2e4\uc2dc \ub4e3\uae30')}
                          onClick={() => onSpeakMessage(message)}
                          className={`rounded-full p-1.5 transition ${message.speaker === 'me' ? 'text-white hover:bg-white/15' : 'text-teal-600 hover:bg-teal-50'}`}
                        >
                          <Volume2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className={`mt-2 text-[10px] font-medium ${message.speaker === 'me' ? 'text-teal-100' : 'text-slate-400'}`}>{languageLabel(message.sourceLang, locale)}</p>
                      <p className={`mt-0.5 text-sm ${message.speaker === 'me' ? 'text-white' : 'text-slate-700'}`}>{message.sourceText}</p>
                      <div className={`mt-2 border-t pt-2 ${message.speaker === 'me' ? 'border-white/20' : 'border-slate-100'}`}>
                        <p className={`text-[10px] font-medium ${message.speaker === 'me' ? 'text-teal-100' : 'text-slate-400'}`}>{languageLabel(message.targetLang, locale)}</p>
                        <p className={`mt-0.5 text-sm font-semibold ${message.speaker === 'me' ? 'text-white' : 'text-slate-900'}`}>{message.translatedText}</p>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`sticky bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 -mx-1 rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-[0_12px_30px_rgba(15,23,42,0.10)] backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0 ${translatorMode === 'voice' ? 'hidden' : ''}`}>
              <div className="grid gap-1.5 sm:grid-cols-[auto_1fr]">
                <button
                  type="button"
                  onClick={onClear}
                  disabled={!sourceText && !resultText}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-3"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {pick(locale, '\u6e05\u9664', 'Clear', '\u30af\u30ea\u30a2', '\uc9c0\uc6b0\uae30')}
                </button>
                <button
                  type="button"
                  onClick={onTranslate}
                  disabled={!sourceText.trim() || loading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-500 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3"
                >
                  {loading ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5 animate-pulse sm:h-4 sm:w-4" />
                      {pick(locale, '\u7ffb\u8b6f\u4e2d...', 'Translating...', '\u7ffb\u8a33\u4e2d...', '\ubc88\uc5ed \uc911...')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {pick(locale, '\u958b\u59cb\u7ffb\u8b6f', 'Start translation', '\u7ffb\u8a33\u958b\u59cb', '\ubc88\uc5ed \uc2dc\uc791')}
                    </>
                  )}
                </button>
              </div>
              {false && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={isListening ? onStopListening : onStartListening}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${isListening ? 'bg-rose-500 text-white shadow-sm' : 'border border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'}`}
              >
                {isListening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-3.5 w-3.5" />}
                {isListening ? '停止收音' : '開始說話'}
              </button>
              <button
                type="button"
                onClick={isSpeaking ? onStopSpeaking : onSpeakResult}
                disabled={!resultText.trim()}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
              >
                {isSpeaking ? <Square className="h-3.5 w-3.5 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
                {isSpeaking ? '停止朗讀' : '朗讀結果'}
              </button>
              {voiceError && <p className="basis-full text-center text-xs text-rose-500">{voiceError}</p>}
              </div>}
            </div>

            <p className="hidden text-center text-xs leading-5 text-gray-400 sm:block">
              {pick(
                locale,
                '\u4f86\u6e90\u8a9e\u8a00\u53ef\u4f7f\u7528\u81ea\u52d5\u8fa8\u8b58\uff0c\u4e26\u6703\u8a18\u4f4f\u4f60\u4e0a\u6b21\u9078\u64c7\u7684\u7ffb\u8b6f\u8a9e\u7cfb\u3002',
                'The source language can auto-detect, and your last target language will be remembered.',
                '\u5143\u306e\u8a00\u8a9e\u306f\u81ea\u52d5\u5224\u5b9a\u3067\u304d\u3001\u524d\u56de\u9078\u3093\u3060\u7ffb\u8a33\u5148\u3082\u8a18\u61b6\u3057\u307e\u3059\u3002',
                '\uc6d0\ubb38 \uc5b8\uc5b4\ub294 \uc790\ub3d9 \uac10\uc9c0\ub418\uba70, \ub9c8\uc9c0\ub9c9 \ubc88\uc5ed \uc5b8\uc5b4\ub3c4 \uae30\uc5b5\ud569\ub2c8\ub2e4.',
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
