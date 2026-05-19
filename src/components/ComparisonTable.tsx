import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeInUp } from '../lib/animations';

export default function ComparisonTable() {
  const comparisons = [
    {
      feature: '精選',
      kessaku: '精心挑選具有獨特性格和遺產價值的建築瑰寶',
      traditional: '選擇有限，通常是缺乏特色的普通物業',
    },
    {
      feature: '設計',
      kessaku: '獲獎建築師和設計師確保卓越美學',
      traditional: '標準設計，對建築意義關注甚少',
    },
    {
      feature: '維護',
      kessaku: '由我們的專家團隊全面管理，業主零麻煩',
      traditional: '業主負責所有維修、保養和協調工作',
    },
    {
      feature: '營運',
      kessaku: '無縫預訂系統，包含專業物業管理',
      traditional: '複雜的排程、保險、公用事業和行政負擔',
    },
    {
      feature: '通行',
      kessaku: '全球多個物業，透過我們的平台靈活排程',
      traditional: '單一物業，僅限一個地點，排程衝突',
    },
    {
      feature: '投資',
      kessaku: '從可負擔的價格點開始的分權持有',
      traditional: '需要大量資金承諾的完整物業購買',
    },
  ];

  return (
    <section className="py-24 px-6 lg:px-12 bg-cream">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-serif text-charcoal mb-4">
            Kessaku 對比傳統持有
          </h2>
          <p className="text-lg text-charcoal/70 max-w-2xl mx-auto">
            體驗房地產投資的新範式
          </p>
        </div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="bg-white rounded-sm shadow-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-charcoal text-cream">
                <tr>
                  <th className="px-6 py-4 text-left font-serif text-lg">特點</th>
                  <th className="px-6 py-4 text-left font-serif text-lg">Kessaku</th>
                  <th className="px-6 py-4 text-left font-serif text-lg">傳統方式</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((item, index) => (
                  <tr
                    key={index}
                    className={`border-b border-charcoal/10 ${
                      index % 2 === 0 ? 'bg-cream/30' : 'bg-white'
                    }`}
                  >
                    <td className="px-6 py-5 font-medium text-charcoal">
                      {item.feature}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start">
                        <Check className="text-emerald-600 mr-3 mt-1 flex-shrink-0" size={20} />
                        <span className="text-charcoal/80">{item.kessaku}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-start">
                        <X className="text-red-600 mr-3 mt-1 flex-shrink-0" size={20} />
                        <span className="text-charcoal/60">{item.traditional}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
