import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, Send, Bot, User, Phone, Mail, ChevronRight,
  Hotel, ShoppingBag, CreditCard, Gift, Globe, ThumbsUp, ThumbsDown, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { callAI } from '../../lib/openai';
import Navigation from '../../components/Navigation';
import SEOHead from '../../components/SEOHead';

const uuidv4 = () => crypto.randomUUID();

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  rated?: 'up' | 'down' | null;
}

const FAQ_CATEGORIES = [
  {
    icon: Hotel,
    label: '訂房問題',
    color: 'text-sky-600 bg-sky-50',
    questions: ['訂房流程', '取消訂房', '入住退房時間', '提前入住', '加床服務', '早餐供應'],
  },
  {
    icon: ShoppingBag,
    label: '購物問題',
    color: 'text-emerald-600 bg-emerald-50',
    questions: ['運費說明', '退貨流程', '商品換貨', '訂單追蹤'],
  },
  {
    icon: CreditCard,
    label: '付款與退款',
    color: 'text-orange-600 bg-orange-50',
    questions: ['付款方式', '退款時間', '發票申請', '折扣碼使用'],
  },
  {
    icon: Gift,
    label: '點數說明',
    color: 'text-rose-600 bg-rose-50',
    questions: ['如何獲得點數', '點數兌換方式', '點數有效期限', '點數餘額查詢'],
  },
  {
    icon: Globe,
    label: 'AI 功能',
    color: 'text-violet-600 bg-violet-50',
    questions: ['AI行程規劃說明', 'AI翻譯使用', 'AI客服說明'],
  },
];

interface QA { patterns: RegExp[]; reply: string; suggestions: string[]; }

const QA_DB: QA[] = [
  {
    patterns: [/訂房流程|如何訂房|怎麼訂房|訂房步驟/],
    reply: '訂房流程非常簡單！\n\n1. 前往「住宿」頁面瀏覽所有房型\n2. 選擇喜愛的房間，點擊查看詳情\n3. 點選「立即預訂」\n4. 填寫入住日期、退房日期、入住人數\n5. 選擇付款方式並完成付款\n6. 系統自動發送確認信至您的電子信箱\n\n如需進一步協助，歡迎繼續詢問！',
    suggestions: ['取消訂房', '入住退房時間', '付款方式'],
  },
  {
    patterns: [/取消|退訂|Cancel/i],
    reply: '取消訂房政策如下：\n\n• 入住前 7 天以上：全額退款\n• 入住前 3-7 天：退款 70%\n• 入住前 1-3 天：退款 30%\n• 入住當天取消：恕不退款\n\n部分特殊優惠價格可能有不同規定，請查閱訂單詳情頁面。如需協助取消，請前往「我的訂單」操作，或聯繫客服。',
    suggestions: ['退款時間', '付款方式', '訂房流程'],
  },
  {
    patterns: [/入住|退房|check.?in|check.?out|幾點/i],
    reply: '標準入退房時間如下：\n\n• 入住時間：下午 3:00 後\n• 退房時間：中午 12:00 前\n\n如需提前入住或延遲退房，請在預訂時備注，或入住前聯繫旅館，視空房狀況安排。提前或延遲退房可能需另外收費。',
    suggestions: ['提前入住', '加床服務', '取消訂房'],
  },
  {
    patterns: [/提前入住|early check/i],
    reply: '提前入住服務：\n\n我們盡量安排提前入住，但需視當日房況而定。建議您：\n\n1. 預訂時在備注欄填寫期望入住時間\n2. 抵達當日來電確認（客服電話：0800-123-456）\n3. 如無法提前入住，我們提供免費行李寄放服務\n\n無法保證提前入住，建議安排時間彈性。',
    suggestions: ['入住退房時間', '加床服務', '早餐供應'],
  },
  {
    patterns: [/加床|嬰兒床|extra bed/i],
    reply: '加床服務說明：\n\n• 加床費用：每晚 NT$800（依房型不同）\n• 嬰兒床：免費提供（需提前預約）\n• 加床上限：每間客房最多加一張床\n\n請在預訂時或入住前聯繫我們預約，以確保床位安排。',
    suggestions: ['早餐供應', '入住退房時間', '訂房流程'],
  },
  {
    patterns: [/早餐|breakfast/i],
    reply: '早餐服務資訊：\n\n• 提供自助式早餐\n• 供應時間：07:00 ~ 10:00\n• 部分房型含早餐（訂房頁面會標示）\n• 未含早餐房型可加購：每人每日 NT$350\n\n如需加購早餐，請在預訂時備注或入住後告知前台。',
    suggestions: ['訂房流程', '加床服務', '入住退房時間'],
  },
  {
    patterns: [/付款|信用卡|支付|payment/i],
    reply: '我們支援多元付款方式：\n\n• 信用卡：Visa / MasterCard / JCB / American Express\n• 金融卡（ATM 轉帳）\n• Line Pay\n• Apple Pay / Google Pay\n• 超商代碼繳費\n\n所有交易均採用 SSL 加密技術，安全有保障。如付款遇到問題，請聯繫客服。',
    suggestions: ['退款時間', '折扣碼使用', '發票申請'],
  },
  {
    patterns: [/退款|refund/i],
    reply: '退款處理時間：\n\n• 信用卡退款：5-7 個工作天退回原卡\n• 金融卡（ATM）：3-5 個工作天退回原帳戶\n• Line Pay：3-5 個工作天退回 Line 點數\n\n如已超過時限未收到退款，請聯繫客服並提供訂單編號，我們優先為您處理。',
    suggestions: ['取消訂房', '付款方式', '聯繫客服'],
  },
  {
    patterns: [/發票|invoice|統編/],
    reply: '電子發票說明：\n\n• 系統於付款完成後自動開立電子發票\n• 發票寄送至您的電子信箱\n• 如需公司戶統一編號，請於結帳時填寫\n• 發票相關問題請聯繫：invoice@travelplatform.com',
    suggestions: ['付款方式', '折扣碼使用', '訂單追蹤'],
  },
  {
    patterns: [/折扣|優惠碼|coupon|promo/i],
    reply: '折扣碼使用說明：\n\n1. 在結帳頁面找到「折扣碼」欄位\n2. 輸入優惠碼並點擊「套用」\n3. 系統自動計算折扣金額\n\n注意事項：\n• 每筆訂單僅限使用一組折扣碼\n• 部分折扣碼有最低消費限制\n• 折扣碼有使用期限，請留意有效日期',
    suggestions: ['付款方式', '點數兌換方式', '訂房流程'],
  },
  {
    patterns: [/運費|shipping|郵費/],
    reply: '運費說明：\n\n• 台灣本島：訂單滿 NT$1,500 免運費，未滿收 NT$100\n• 離島（澎湖、金門、馬祖）：固定 NT$250\n• 海外訂單：依重量計算，結帳時顯示\n\n緊急配送服務（加急）可加購，通常於 1-2 個工作天送達。',
    suggestions: ['退貨流程', '訂單追蹤', '商品換貨'],
  },
  {
    patterns: [/退貨|return|退換/],
    reply: '退貨流程說明：\n\n1. 收到商品後 7 天內申請退貨（鑑賞期）\n2. 前往「我的訂單」選擇商品申請退貨\n3. 填寫退貨原因並上傳照片\n4. 客服確認後提供退貨地址\n5. 寄回商品（請保留完整包裝）\n6. 收到商品後 3-5 個工作天完成退款\n\n注意：使用後或拆封的商品恕不接受退換。',
    suggestions: ['商品換貨', '退款時間', '訂單追蹤'],
  },
  {
    patterns: [/換貨|exchange/],
    reply: '商品換貨說明：\n\n• 收到商品後 7 天內可申請換貨\n• 限瑕疵品、錯誤商品或尺寸更換\n• 請前往「我的訂單」提交換貨申請\n• 換貨運費由平台負擔（瑕疵品）\n\n如為一般換色/換尺寸，需負擔來回運費各一次。',
    suggestions: ['退貨流程', '退款時間', '訂單追蹤'],
  },
  {
    patterns: [/訂單|追蹤|查詢訂單/],
    reply: '訂單查詢方式：\n\n1. 登入後前往「我的訂單」\n2. 可查看訂單狀態：待確認 / 處理中 / 已出貨 / 已完成\n3. 點擊訂單可查看詳細資訊和物流追蹤\n\n如有任何訂單問題，請附上訂單編號聯繫客服，我們盡快為您處理。',
    suggestions: ['退貨流程', '退款時間', '聯繫客服'],
  },
  {
    patterns: [/點數|積分|如何獲得點數/],
    reply: '點數獲取說明：\n\n• 訂房消費：每 NT$100 = 10 點\n• 購物消費：每 NT$100 = 5 點\n• 會員生日當月：雙倍點數\n• 撰寫評論：每篇 50 點\n• 邀請朋友：每位成功邀請 100 點\n\n點數自動累計，可在「我的點數」頁面查看餘額。',
    suggestions: ['點數兌換方式', '點數有效期限', '點數餘額查詢'],
  },
  {
    patterns: [/點數兌換|redeem|如何使用點數/],
    reply: '點數兌換方式：\n\n• 住宿折抵：100 點 = NT$50 折扣\n• 購物折抵：100 點 = NT$30 折扣\n• 免費早餐：500 點兌換\n• 房型升等：視當日空房狀況\n\n使用方式：在結帳頁面選擇「使用點數」，輸入欲使用的點數數量即可。',
    suggestions: ['如何獲得點數', '點數有效期限', '點數餘額查詢'],
  },
  {
    patterns: [/點數過期|有效期/],
    reply: '點數有效期限說明：\n\n• 一般點數：自獲得日起 2 年內有效\n• 生日點數：當月底到期\n• 活動點數：依活動規定，會在備注說明\n\n點數即將到期前，系統會發送提醒信至您的電子信箱。建議定期查看「我的點數」確認餘額。',
    suggestions: ['如何獲得點數', '點數兌換方式', '點數餘額查詢'],
  },
  {
    patterns: [/點數餘額|查看點數/],
    reply: '查詢點數餘額步驟：\n\n1. 登入會員帳戶\n2. 點擊右上角頭像 → 選擇「我的帳戶」\n3. 點擊左側選單「點數管理」\n4. 即可查看當前點數餘額與歷史記錄\n\n也可直接前往 /member/points 頁面查看。',
    suggestions: ['如何獲得點數', '點數兌換方式', '點數有效期限'],
  },
  {
    patterns: [/AI行程|行程規劃/],
    reply: 'AI 行程規劃功能說明：\n\n功能特色：\n• 支援台北、東京、京都、大阪、首爾、峇里島等熱門目的地\n• 依您的旅遊興趣生成個人化行程\n• 提供逐日時段安排（早上/下午/晚間）\n• 推薦當地美食與旅遊貼士\n\n使用方式：\n前往「AI 行程規劃師」，輸入目的地、日期、人數和興趣，點擊「立即規劃」即可。',
    suggestions: ['AI翻譯使用', 'AI客服說明', '訂房流程'],
  },
  {
    patterns: [/翻譯|translator|AI翻譯/],
    reply: 'AI 即時翻譯功能說明：\n\n支援語言：\n繁體中文、英語、日語、韓語、法語、西班牙語、泰語等多種語言\n\n使用方式：\n1. 前往「AI 翻譯」頁面\n2. 選擇來源語言和目標語言\n3. 輸入需翻譯的文字\n4. 點擊「立即翻譯」即可\n\n翻譯歷史記錄會自動儲存（已登入會員）。',
    suggestions: ['AI行程規劃說明', 'AI客服說明', '訂房流程'],
  },
  {
    patterns: [/人工客服|真人|聯繫客服|客服電話|contact/i],
    reply: '如需聯繫人工客服：\n\n電話客服：\n• 0800-123-456（免費）\n• 服務時間：週一至週五 09:00 ~ 18:00\n\n電子郵件：\n• service@travelplatform.com\n• 回覆時間：24小時內\n\n線上留言：\n• 請點擊下方「聯繫人工客服」按鈕\n\n我們竭誠為您服務！',
    suggestions: ['訂房流程', '取消訂房', '退款時間'],
  },
  {
    patterns: [/忘記密碼|重設密碼|reset password/i],
    reply: '忘記密碼處理方式：\n\n1. 前往登入頁面\n2. 點擊「忘記密碼？」連結\n3. 輸入您的電子郵件地址\n4. 收取重設密碼郵件（請查收垃圾郵件匣）\n5. 點擊郵件中的連結設定新密碼\n\n如未收到郵件，請聯繫客服提供您的帳號資訊驗證後協助處理。',
    suggestions: ['修改個人資料', '聯繫客服', '帳號安全'],
  },
  {
    patterns: [/修改資料|更新資料|個人資料/],
    reply: '修改個人資料步驟：\n\n1. 登入後點擊右上角頭像\n2. 選擇「個人資料」\n3. 點擊「編輯資料」\n4. 修改您的姓名、電話、地址等資訊\n5. 點擊「儲存」完成更新\n\n注意：電子郵件為登入帳號，如需更換請聯繫客服。',
    suggestions: ['忘記密碼', '點數查詢', '聯繫客服'],
  },
];

const WELCOME_MSG = '您好！我是旅遊平台的 AI 智能客服小幫手。\n\n我可以協助您解答：\n• 訂房、取消、入住退房相關問題\n• 線上購物、退貨退款問題\n• 點數累積與兌換說明\n• AI 功能使用說明\n\n請問今天有什麼可以幫您？';

const SUGGESTIONS_WELCOME = ['訂房流程', '取消訂房', '如何獲得點數', '付款方式'];

function getAutoReply(text: string): { reply: string; suggestions: string[] } {
  for (const qa of QA_DB) {
    if (qa.patterns.some(p => p.test(text))) {
      return { reply: qa.reply, suggestions: qa.suggestions };
    }
  }
  return {
    reply: '感謝您的詢問！您的問題已記錄，我們的客服人員將盡快為您回覆。\n\n您也可以：\n• 撥打免費客服專線：0800-123-456\n• 服務時間：週一至週五 09:00~18:00\n• 或寄信至：service@travelplatform.com',
    suggestions: ['訂房流程', '取消訂房', '聯繫客服'],
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

const Chatbot: React.FC = () => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([{
    id: '0',
    role: 'assistant',
    content: WELCOME_MSG,
    timestamp: new Date(),
    suggestions: SUGGESTIONS_WELCOME,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => uuidv4());
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [showContact, setShowContact] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);

    if (user) {
      await supabase.from('tbl_mn5wn257').insert({ user_id: user.id, session_id: sessionId, role: 'user', content: text });
      await supabase.from('user_usage').upsert(
        { user_id: user.id, feature_type: 'chatbot', usage_count: 1, last_used_at: new Date().toISOString() },
        { onConflict: 'user_id,feature_type' }
      );
    }

    let reply = '';
    try {
      reply = await callAI<string>('chat', {
        messages: currentMessages.map(m => ({ role: m.role, content: m.content })),
        language: lang,
      });
    } catch {
      const { reply: fallback } = getAutoReply(text);
      reply = fallback;
    }

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: reply,
      timestamp: new Date(),
      suggestions: [],
      rated: null,
    };
    setMessages(prev => [...prev, botMsg]);

    if (user) {
      await supabase.from('tbl_mn5wn257').insert({ user_id: user.id, session_id: sessionId, role: 'assistant', content: reply });
    }
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const rateMessage = (id: string, rating: 'up' | 'down') => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, rated: m.rated === rating ? null : rating } : m));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SEOHead title="AI 旅遊客服" description="24 小時 AI 旅遊客服，即時回答旅遊問題、推薦行程與住宿，為您的旅途保駕護航。" keywords="AI客服, 旅遊客服, 智慧客服, 旅遊諮詢" pageType="default" breadcrumbs={[{name:'首頁',url:'/'},{name:'AI 旅遊客服',url:'/ai/chat'}]} />
      <Navigation />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-sky-500 to-blue-700 rounded-2xl mb-3 shadow-lg">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t.ai.chat.title}</h1>
          <p className="text-gray-500 mt-1">{t.ai.chat.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-5 items-start">
          <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">{t.ai.chat.faqTitle}</h3>
              <div className="space-y-1">
                {FAQ_CATEGORIES.map((cat, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setActiveCategory(activeCategory === i ? null : i)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${activeCategory === i ? 'bg-sky-50 text-sky-700' : 'text-gray-600 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${cat.color}`}>
                          <cat.icon className="w-3.5 h-3.5" />
                        </div>
                        {cat.label}
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeCategory === i ? 'rotate-90' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {activeCategory === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-8 py-1 space-y-0.5">
                            {cat.questions.map((q, j) => (
                              <button
                                key={j}
                                onClick={() => sendMessage(q)}
                                className="w-full text-left text-xs text-gray-500 hover:text-sky-600 py-1 px-2 rounded-lg hover:bg-sky-50 transition"
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowContact(true)}
              className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4 text-left hover:border-sky-200 transition group"
            >
              <p className="text-sm font-semibold text-gray-700 mb-1 group-hover:text-sky-600 transition">聯繫人工客服</p>
              <p className="text-xs text-gray-400">週一至週五 09:00~18:00</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Phone className="w-3 h-3" />0800-123-456
                </div>
              </div>
            </button>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col" style={{ height: '65vh' }}>
            <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">AI 客服小幫手</p>
                  <p className="text-xs text-emerald-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                    {t.ai.chat.online}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id}>
                  <div className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-sky-600' : 'bg-slate-100'}`}>
                      {msg.role === 'user'
                        ? <User className="w-4 h-4 text-white" />
                        : <Bot className="w-4 h-4 text-slate-500" />}
                    </div>
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'user'
                          ? 'bg-sky-600 text-white rounded-tr-none'
                          : 'bg-slate-100 text-gray-800 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                        {msg.role === 'assistant' && msg.rated !== undefined && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => rateMessage(msg.id, 'up')}
                              className={`p-1 rounded transition ${msg.rated === 'up' ? 'text-emerald-500' : 'text-gray-300 hover:text-emerald-400'}`}
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => rateMessage(msg.id, 'down')}
                              className={`p-1 rounded transition ${msg.rated === 'down' ? 'text-red-400' : 'text-gray-300 hover:text-red-400'}`}
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div className={`flex flex-wrap gap-2 mt-2 ml-10`}>
                      {msg.suggestions.map((s, si) => (
                        <button
                          key={si}
                          onClick={() => sendMessage(s)}
                          className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1.5 rounded-full hover:bg-sky-100 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex gap-1 items-center">
                      {[0, 0.2, 0.4].map(d => (
                        <motion.div
                          key={d}
                          className="w-2 h-2 bg-slate-400 rounded-full"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.5, delay: d, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-slate-100 p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={t.ai.chat.placeholder}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="bg-sky-600 hover:bg-sky-700 text-white p-2.5 rounded-xl transition disabled:opacity-40 flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-2 text-center">{t.ai.chat.footer}</p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
            onClick={() => setShowContact(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">聯繫人工客服</h3>
                <button onClick={() => setShowContact(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-sky-50 rounded-xl">
                  <Phone className="w-5 h-5 text-sky-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">免費客服專線</p>
                    <p className="text-lg font-bold text-sky-600">0800-123-456</p>
                    <p className="text-xs text-gray-500">週一至週五 09:00 ~ 18:00</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <Mail className="w-5 h-5 text-slate-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">電子郵件</p>
                    <p className="text-sm text-slate-600">service@travelplatform.com</p>
                    <p className="text-xs text-gray-500">24小時內回覆</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chatbot;
