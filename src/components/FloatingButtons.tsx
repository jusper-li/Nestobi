import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import { Coffee, GripVertical, Map, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function FloatingButtons() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);
  const isEn = lang === 'en';

  const labels = {
    drag: isEn ? 'Drag' : '拖曳',
    itinerary: isEn ? 'AI Guide' : 'AI 導遊',
    itinerarySub: isEn ? 'Trip Planner' : '行程規劃',
    chat: isEn ? 'AI Support' : 'AI 客服',
    chatSub: isEn ? 'Live Assistant' : '對話客服',
    quiz: isEn ? 'AI Coffee Quiz' : 'AI 咖啡測驗',
    quizSub: isEn ? 'Flavor Profile' : '風味偏好分析',
  };

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
