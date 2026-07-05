import { Coffee, Gift } from 'lucide-react';

interface ProductImagePlaceholderProps {
  name: string;
  compact?: boolean;
}

export default function ProductImagePlaceholder({ name, compact = false }: ProductImagePlaceholderProps) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-stone-50">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(41,37,36,0.04)_25%,transparent_25%,transparent_50%,rgba(41,37,36,0.04)_50%,rgba(41,37,36,0.04)_75%,transparent_75%,transparent)] bg-[length:28px_28px]" />
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500/70 via-stone-900 to-emerald-700/70" />
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className={`${compact ? 'h-12 w-12' : 'h-16 w-16'} flex items-center justify-center border border-stone-200 bg-white shadow-sm`}>
          {compact ? (
            <Gift className="h-6 w-6 text-amber-700" />
          ) : (
            <Coffee className="h-8 w-8 text-amber-700" />
          )}
        </div>
        {!compact && (
          <>
            <img src="/LOGO-1.png" alt="" className="mt-5 h-10 opacity-70" />
            <p className="mt-4 max-w-[13rem] text-xs font-medium leading-relaxed tracking-[0.12em] text-stone-700">
              {name}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
