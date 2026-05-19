import React from 'react';
import { CalendarDays } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

const DAYS = [
  { key: 1, label: '週一', short: '一' },
  { key: 2, label: '週二', short: '二' },
  { key: 3, label: '週三', short: '三' },
  { key: 4, label: '週四', short: '四' },
  { key: 5, label: '週五', short: '五' },
  { key: 6, label: '週六', short: '六' },
  { key: 0, label: '週日', short: '日' },
];

interface WeeklyPricingSectionProps {
  dayPrices: Record<number, number>;
  defaultPrice: number;
  onChange: (prices: Record<number, number>) => void;
  accentColor?: 'blue' | 'amber';
}

const WeeklyPricingSection: React.FC<WeeklyPricingSectionProps> = ({
  dayPrices,
  defaultPrice,
  onChange,
  accentColor = 'blue',
}) => {
  const ring = accentColor === 'amber' ? 'focus:ring-amber-400' : 'focus:ring-[#2C1F10]';
  const badge = accentColor === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-[#F0E4C8] text-[#2C1F10]';
  const isWeekend = (day: number) => day === 0 || day === 6;

  const handleChange = (day: number, value: string) => {
    const num = value === '' ? 0 : Math.max(0, Number(value));
    onChange({ ...dayPrices, [day]: num });
  };

  const clearDay = (day: number) => {
    const next = { ...dayPrices };
    delete next[day];
    onChange(next);
  };

  const hasCustom = Object.keys(dayPrices).some(k => dayPrices[Number(k)] > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">星期別價格設定</span>
        <span className="text-xs text-gray-400">（留空表示使用預設價格）</span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DAYS.map(({ key, label, short }) => {
          const val = dayPrices[key];
          const hasVal = val !== undefined && val > 0;
          return (
            <div key={key} className={`relative rounded-xl border-2 transition-all ${hasVal ? (isWeekend(key) ? 'border-rose-300 bg-rose-50' : 'border-gray-300 bg-gray-50') : 'border-gray-100 bg-white'}`}>
              <div className={`text-center text-xs font-semibold py-1.5 rounded-t-[10px] ${isWeekend(key) ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </div>
              <div className="px-1.5 pb-1.5 pt-1">
                <input
                  type="number"
                  min={0}
                  value={hasVal ? val : ''}
                  onChange={e => handleChange(key, e.target.value)}
                  placeholder={String(defaultPrice)}
                  className={`w-full text-center text-xs px-1 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 ${ring} bg-white`}
                />
                {hasVal && (
                  <button
                    type="button"
                    onClick={() => clearDay(key)}
                    className="w-full text-center text-[10px] text-gray-400 hover:text-red-500 mt-0.5 transition"
                  >
                    清除
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasCustom && (
        <div className="flex flex-wrap gap-2 pt-1">
          {DAYS.filter(({ key }) => dayPrices[key] > 0).map(({ key, label }) => (
            <span key={key} className={`text-xs px-2.5 py-1 rounded-full font-medium ${badge}`}>
              {label} {formatCurrency(dayPrices[key])}
            </span>
          ))}
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500">
            其他日 {formatCurrency(defaultPrice)}
          </span>
        </div>
      )}
    </div>
  );
};

export default WeeklyPricingSection;
