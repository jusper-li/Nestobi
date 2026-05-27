import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import { Coffee, GripVertical, Map, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type SupportedLang = 'zh-TW' | 'en' | 'ja' | 'ko';

const floatingLabels: Record<
  SupportedLang,
  {
    drag: string;
    itinerary: string;
    itinerarySub: string;
    chat: string;
    chatSub: string;
    quiz: string;
    quizSub: string;
  }
> = {
  'zh-TW': {
    drag: '拖曳',
    itinerary: 'AI 導遊',
    itinerarySub: '行程規劃',
    chat: 'AI 客服',
    chatSub: '對話客服',
    quiz: 'AI 咖啡測驗',
    quizSub: '風味偏好分析',
  },
  en: {
    drag: 'Drag',
    itinerary: 'AI Guide',
    itinerarySub: 'Trip Planner',
    chat: 'AI Support',
    chatSub: 'Live Assistant',
    quiz: 'AI Coffee Quiz',
    quizSub: 'Flavor Profile',
  },
  ja: {
    drag: 'ドラッグ',
    itinerary: 'AI ガイド',
    itinerarySub: '旅程プラン',
    chat: 'AI サポート',
    chatSub: 'チャット相談',
    quiz: 'AI コーヒー診断',
    quizSub: '味の傾向分析',
  },
  ko: {
    drag: '드래그',
    itinerary: 'AI 가이드',
    itinerarySub: '여행 일정',
    chat: 'AI 상담',
    chatSub: '라이브 채팅',
    quiz: 'AI 커피 퀴즈',
    quizSub: '풍미 성향 분석',
  },
};

export default function FloatingButtons() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);

  const safeLang: SupportedLang = (lang as SupportedLang) in floatingLabels ? (lang as SupportedLang) : 'zh-TW';
  const labels = floatingLabels[safeLang];

  const buttons = [
    { id: 'itinerary', icon: Map, label: labels.itinerary, sublabel: labels.itinerarySub, path: '/ai/itinerary' },
    { id: 'chat', icon: MessageCircle, label: labels.chat, sublabel: labels.chatSub, path: '/ai/chat' },
    { id: 'coffee-quiz', icon: Coffee, label: labels.quiz, sublabel: labels.quizSub, path: '/ai/coffee-quiz' },
  ];

  const handlePointerDown = (event: React.PointerEvent) => {
    dragControls.start(event);
  };

  const handleButtonClick = (path: string) => {
    if (!isDragging) navigate(path);
  };

  return (
    <>
      <div ref={constraintsRef} className="pointer-events-none fixed inset-0 z-40" />
      <motion.div
        drag
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setTimeout(() => setIsDragging(false), 50)}
        initial={{ x: 0, y: 0 }}
        className="fixed bottom-24 right-6 z-50 select-none"
        style={{ touchAction: 'none' }}
      >
        <div className="flex flex-col items-center gap-2">
          <div
            onPointerDown={handlePointerDown}
            className="flex h-6 w-8 cursor-grab items-center justify-center rounded-lg border border-gray-200 bg-white/90 shadow-md active:cursor-grabbing"
            title={labels.drag}
          >
            <GripVertical size={14} className="text-gray-400" />
          </div>

          {buttons.map(({ id, icon: Icon, label, sublabel, path }) => (
            <motion.button
              key={id}
              whileHover={{ scale: isDragging ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleButtonClick(path)}
              className="flex items-center gap-2.5 rounded-2xl bg-[#C09A6A] px-4 py-2.5 text-white shadow-lg shadow-[#C09A6A]/40 transition-colors duration-200 hover:bg-[#8B6840]"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Icon size={16} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold leading-none">{label}</div>
                <div className="mt-0.5 text-xs text-white/70">{sublabel}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </>
  );
}

