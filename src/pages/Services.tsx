import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Hotel, ShoppingBag, Map, Languages, MessageCircle, Star,
  BookMarked, ArrowRight, Shield, Clock, Zap, Globe,
  CreditCard, Headphones, Coffee, ChevronRight
} from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

const services = [
  {
    icon: Hotel,
    title: '住宿訂房',
    tagline: 'Curated Stays',
    color: 'from-[#C09A6A] to-[#8B6840]',
    badge: 'bg-[#F0E4C8] text-[#2C1F10]',
    image: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: '精選全台頂級飯店、民宿與度假村，從都市精品旅館到山林秘境別墅，每一間都經過嚴格審核。',
    features: [
      '即時確認訂房，無需等待',
      '入住前 3 天免費取消',
      '獨家早鳥優惠與季節折扣',
      '消費即累積旅遊點數回饋',
      '支援多幣別安全付款',
    ],
    link: '/rooms',
    cta: '瀏覽住宿',
  },
  {
    icon: ShoppingBag,
    title: '旅遊購物',
    tagline: 'Travel Shop',
    color: 'from-teal-500 to-teal-700',
    badge: 'bg-teal-50 text-teal-700',
    image: 'https://images.pexels.com/photos/5632381/pexels-photo-5632381.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: '嚴選旅遊配件、在地伴手禮與特色商品，從實用旅行裝備到紀念品一站購足。',
    features: [
      '產地直送在地特色伴手禮',
      '旅行配件、行李箱、收納用品',
      '1-3 天快速出貨',
      '7 天鑑賞期無憂退換',
      '購物消費同步累積點數',
    ],
    link: '/shop',
    cta: '逛逛商城',
  },
  {
    icon: Map,
    title: 'AI 行程規劃',
    tagline: 'AI Itinerary',
    color: 'from-emerald-500 to-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700',
    image: 'https://images.pexels.com/photos/3278215/pexels-photo-3278215.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: '輸入目的地、日期與偏好，AI 智慧引擎即時生成完整每日行程，涵蓋景點、餐廳、交通與預算建議。',
    features: [
      '支援台北、京都、東京、首爾等熱門城市',
      '根據美食、文化、購物等興趣客製化',
      '經濟、中等、奢華三種預算方案',
      '一鍵儲存行程並匯入旅遊護照',
      '可手動編輯、新增或刪除景點',
    ],
    link: '/ai/itinerary',
    cta: '開始規劃',
  },
  {
    icon: Languages,
    title: 'AI 即時翻譯',
    tagline: 'AI Translator',
    color: 'from-orange-500 to-orange-700',
    badge: 'bg-orange-50 text-orange-700',
    image: 'https://images.pexels.com/photos/5238117/pexels-photo-5238117.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: '消除語言障礙，支援 30 種語言即時互譯，涵蓋問路、點餐、購物等旅遊場景常用語句。',
    features: [
      '中文、英文、日文、韓文等 30 種語言',
      '即時翻譯結果，毫秒級回應',
      '旅遊場景專用語句庫',
      '語意理解準確度高',
      '免費無限次使用',
    ],
    link: '/ai/translator',
    cta: '翻譯試試',
  },
  {
    icon: MessageCircle,
    title: 'AI 智慧客服',
    tagline: 'AI Concierge',
    color: 'from-sky-500 to-sky-700',
    badge: 'bg-sky-50 text-sky-700',
    image: 'https://images.pexels.com/photos/8867482/pexels-photo-8867482.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: '24 小時全年無休的 AI 旅遊顧問，即時回答訂房、行程、購物等任何旅遊問題。',
    features: [
      '全天 24 小時不間斷服務',
      '自然語言對話，理解你的需求',
      '推薦住宿、行程、餐廳',
      '訂單追蹤與問題排解',
      '支援多國語言提問',
    ],
    link: '/ai/chat',
    cta: '立即對話',
  },
  {
    icon: BookMarked,
    title: '旅遊護照',
    tagline: 'Travel Passport',
    color: 'from-[#C09A6A] to-[#8B6840]',
    badge: 'bg-[#F0E4C8] text-[#2C1F10]',
    image: 'https://images.pexels.com/photos/1051075/pexels-photo-1051075.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: '專屬的數位旅行紀錄本，記錄走過的每一個足跡，像蓋印章一樣累積旅遊回憶。',
    features: [
      '文化古蹟、美食、自然等多種分類',
      '從行程規劃一鍵匯入足跡',
      '依目的地與類型篩選瀏覽',
      '統計走訪數據與旅行軌跡',
      '建立專屬旅遊成就紀錄',
    ],
    link: '/ai/passport',
    cta: '查看護照',
  },
  {
    icon: Star,
    title: '點數回饋',
    tagline: 'Reward Points',
    color: 'from-amber-500 to-amber-700',
    badge: 'bg-amber-50 text-amber-700',
    image: 'https://images.pexels.com/photos/4386158/pexels-photo-4386158.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: '消費即累積旅遊點數，點數可折抵住宿與商品費用，讓每一次旅行都更加超值。',
    features: [
      '消費金額 1% 回饋為旅遊點數',
      '1 點 = 1 元，無門檻折抵',
      '訂房、購物皆可使用',
      '會員中心即時查看點數餘額',
      '不定期加碼回饋活動',
    ],
    link: '/member/points',
    cta: '了解點數',
  },
  {
    icon: Coffee,
    title: '咖啡旅行家',
    tagline: 'Coffee Traveler',
    color: 'from-amber-700 to-amber-900',
    badge: 'bg-amber-50 text-amber-800',
    image: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=600',
    description: '探索台灣與世界的咖啡旅途，分享旅遊指南、美食探索、住宿推薦與旅行日記。',
    features: [
      '深度旅遊指南與攻略文章',
      '在地美食與咖啡廳推薦',
      '住宿真實體驗分享',
      '旅行日記與攝影紀錄',
      '定期更新最新旅遊資訊',
    ],
    link: '/blog',
    cta: '閱讀文章',
  },
];

const trustPoints = [
  { icon: Shield, title: '安全保障', desc: '銀行級 SSL 加密傳輸，資金安全有保障' },
  { icon: Clock, title: '24 小時服務', desc: 'AI 客服全天候待命，即時解答您的疑問' },
  { icon: Zap, title: '即時確認', desc: '訂房、行程秒速確認，不浪費旅途每一刻' },
  { icon: Globe, title: '多語支援', desc: '中、英、日、韓四國語言介面，國際旅客友善' },
  { icon: CreditCard, title: '多元付款', desc: '信用卡、銀行轉帳、點數折抵靈活選擇' },
  { icon: Headphones, title: '真人客服', desc: '週一至週五 09:00-18:00 人工客服協助' },
];

export default function Services() {
  return (
    <div className="min-h-screen bg-white">
      <SEOHead
        title="服務說明"
        description="Nestobi 旅遊平台完整服務功能說明。住宿訂房、旅遊購物、AI 行程規劃、即時翻譯、AI 客服、旅遊護照、點數回饋、咖啡旅行家部落格。"
        keywords="旅遊服務, 訂房服務, AI行程規劃, 旅遊購物, 旅遊翻譯, AI客服, 旅遊護照, 點數回饋, Nestobi"
        pageType="list"
        breadcrumbs={[{ name: '首頁', url: '/' }, { name: '服務說明', url: '/services' }]}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: '旅遊服務項目',
          numberOfItems: services.length,
          itemListElement: services.map((s, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: s.title,
            description: s.description,
          })),
        }}
      />
      <Navigation />

      {/* Hero */}
      <section className="relative py-20 md:py-28 bg-gradient-to-b from-[#F0E4C8]/60 to-white overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C09A6A]/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.span variants={fadeUp} className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[#C09A6A] mb-4">Our Services</motion.span>
            <motion.h1
              variants={fadeUp}
              className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-[#2C1F10] mb-5"
              style={{ letterSpacing: '-0.025em' }}
            >
              全方位旅遊服務
            </motion.h1>
            <motion.div variants={fadeUp} className="w-12 h-[2px] bg-[#C09A6A] mx-auto mb-6" />
            <motion.p variants={fadeUp} className="text-[#2C1F10]/60 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
              整合最先進的 AI 技術，為您提供從訂房、購物、行程規劃到語言翻譯的一站式旅遊解決方案，讓每一次旅行都無憂無慮。
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Services Detail */}
      <section className="py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20 md:space-y-28">
          {services.map((service, i) => {
            const Icon = service.icon;
            const isEven = i % 2 === 1;
            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col ${isEven ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-14 items-center`}
              >
                {/* Image */}
                <div className="w-full md:w-5/12 flex-shrink-0">
                  <div className="relative rounded-2xl overflow-hidden shadow-xl group">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-64 md:h-80 object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${service.color} opacity-20`} />
                    <div className="absolute top-4 left-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${service.badge}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {service.tagline}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2C1F10] mb-3" style={{ letterSpacing: '-0.02em' }}>
                    {service.title}
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-6">{service.description}</p>
                  <ul className="space-y-2.5 mb-7">
                    {service.features.map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2.5 text-sm text-gray-700">
                        <ChevronRight className="w-4 h-4 text-[#C09A6A] mt-0.5 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={service.link}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2C1F10] text-white text-sm font-semibold rounded-xl hover:bg-[#1A1208] transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    {service.cta}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 bg-[#F5F5F3]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-[#C09A6A] mb-3">Why Nestobi</span>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#2C1F10] mb-3" style={{ letterSpacing: '-0.02em' }}>值得信賴的旅遊夥伴</h2>
            <div className="w-10 h-[2px] bg-[#C09A6A] mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {trustPoints.map((tp, i) => (
              <motion.div
                key={tp.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                  <tp.icon className="w-6 h-6 text-[#C09A6A]" />
                </div>
                <h3 className="font-semibold text-[#2C1F10] text-sm mb-1">{tp.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{tp.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-[#C09A6A] to-[#8B6840] text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4" style={{ letterSpacing: '-0.025em' }}>
              準備好開始旅程了嗎？
            </h2>
            <p className="text-white/70 mb-8 leading-relaxed">
              免費註冊會員，立即享受全方位旅遊服務與專屬點數回饋
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/auth/register" className="px-8 py-3.5 bg-white text-[#8B6840] font-semibold rounded-xl hover:bg-white/90 transition shadow-lg text-sm">
                免費註冊會員
              </Link>
              <Link to="/faq" className="px-8 py-3.5 bg-white/15 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/25 transition text-sm">
                常見問題
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
