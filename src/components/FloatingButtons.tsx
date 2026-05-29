import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import { Coffee, GripVertical, Map, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeLang, pickByLang } from '../lib/i18n';

export default function FloatingButtons() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const normalizedLang = normalizeLang(lang);
  const pick = (zh: string, en: string, ja: string, ko: string) => pickByLang(normalizedLang, zh, en, ja, ko);

  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);

  const buttons = [
    {
      id: 'itinerary',
      icon: Map,
      label: pick('AI 導遊', 'AI Guide', 'AIガイド', 'AI 가이드'),
      sublabel: pick('行程規劃', 'Trip Planner', '旅程プラン', '여행 일정'),
      path: '/ai/itinerary',
    },
    {
      id: 'chat',
      icon: MessageCircle,
      label: pick('AI 客服', 'AI Support', 'AIサポート', 'AI 고객지원'),
      sublabel: pick('對話客服', 'Live Assistant', 'チャット相談', '채팅 도우미'),
      path: '/ai/chat',
    },
    {
      id: 'coffee-quiz',
      icon: Coffee,
      label: pick('AI 咖啡測驗', 'AI Coffee Quiz', 'AIコーヒー診断', 'AI 커피 퀴즈'),
      sublabel: pick('風味偏好分析', 'Flavor Profile', '好み分析', '취향 분석'),
      path: '/ai/coffee-quiz',
    },
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
            title={pick('拖曳', 'Drag', 'ドラッグ', '드래그')}
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

