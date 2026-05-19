import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useDragControls } from 'framer-motion';
import { Coffee, Map, MessageCircle, GripVertical } from 'lucide-react';

const buttons = [
  {
    id: 'itinerary',
    icon: Map,
    label: 'AI導遊',
    sublabel: '行程規劃',
    path: '/ai/itinerary',
    bg: 'bg-[#C09A6A]',
    hover: 'hover:bg-[#8B6840]',
    shadow: 'shadow-travel-blue/40',
  },
  {
    id: 'chat',
    icon: MessageCircle,
    label: 'AI客服',
    sublabel: '對話客服',
    path: '/ai/chat',
    bg: 'bg-[#C09A6A]',
    hover: 'hover:bg-[#8B6840]',
    shadow: 'shadow-[#C09A6A]/40',
  },
  {
    id: 'coffee-quiz',
    icon: Coffee,
    label: 'AI咖啡測驗',
    sublabel: '風味偏好分析',
    path: '/ai/coffee-quiz',
    bg: 'bg-[#C09A6A]',
    hover: 'hover:bg-[#8B6840]',
    shadow: 'shadow-[#C09A6A]/40',
  },
];

export default function FloatingButtons() {
  const navigate = useNavigate();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    dragControls.start(e);
  };

  const handleButtonClick = (path: string) => {
    if (!isDragging) {
      if (path.startsWith('http')) {
        window.open(path, '_blank', 'noopener,noreferrer');
        return;
      }
      navigate(path);
    }
  };

  return (
    <>
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-40" />
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
            className="w-8 h-6 flex items-center justify-center rounded-lg bg-white/90 shadow-md cursor-grab active:cursor-grabbing border border-gray-200"
            title="拖移"
          >
            <GripVertical size={14} className="text-gray-400" />
          </div>

          {buttons.map(({ id, icon: Icon, label, sublabel, path, bg, hover, shadow }) => (
            <motion.button
              key={id}
              whileHover={{ scale: isDragging ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleButtonClick(path)}
              className={`flex items-center gap-2.5 px-4 py-2.5 ${bg} ${hover} text-white rounded-2xl shadow-lg ${shadow} transition-colors duration-200`}
            >
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon size={16} />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold leading-none">{label}</div>
                <div className="text-xs text-white/70 mt-0.5">{sublabel}</div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </>
  );
}
