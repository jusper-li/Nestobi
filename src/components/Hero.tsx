import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Hero() {
  const scrollToExplore = () => {
    const element = document.getElementById('explore');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/1732414/pexels-photo-1732414.jpeg?auto=compress&cs=tinysrgb&w=1920')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/50 to-charcoal/70" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-6xl lg:text-7xl font-serif text-cream mb-6 leading-tight"
        >
          擁有獨特的
          <br />
          建築遺產
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-cream/90 mb-12 max-w-2xl mx-auto leading-relaxed"
        >
          透過分權持有投資卓越物業。
          體驗房地產投資的未來。
        </motion.p>
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          className="px-10 py-4 bg-[#2C1F10] text-charcoal font-medium rounded-sm hover:bg-cream transition-colors duration-300 shadow-lg"
        >
          立即註冊
        </motion.button>
      </div>

      <button
        onClick={scrollToExplore}
        className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-cream/80 hover:text-cream transition-colors animate-bounce"
        aria-label="Scroll to explore"
      >
        <ChevronDown size={32} />
      </button>
    </section>
  );
}
