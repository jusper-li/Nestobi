import type { ReactNode } from 'react';

export type PageShellTone = 'amber' | 'emerald' | 'sand';

export interface PageShellAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  primary?: boolean;
  disabled?: boolean;
}

export interface PageShellStat {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}

interface PageShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: ReactNode;
  actions?: PageShellAction[];
  stats?: PageShellStat[];
  tone?: PageShellTone;
  children: ReactNode;
  contentClassName?: string;
}

const tones: Record<PageShellTone, { icon: string; eyebrow: string; primary: string; stat: string }> = {
  amber: {
    icon: 'bg-amber-100 text-amber-700',
    eyebrow: 'text-amber-700',
    primary: 'bg-amber-600 text-white hover:bg-amber-700',
    stat: 'bg-amber-50/70',
  },
  emerald: {
    icon: 'bg-emerald-100 text-emerald-700',
    eyebrow: 'text-emerald-700',
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    stat: 'bg-emerald-50/70',
  },
  sand: {
    icon: 'bg-[#f3e8d7] text-[#8b5e34]',
    eyebrow: 'text-[#8b5e34]',
    primary: 'bg-[#8b5e34] text-white hover:bg-[#704723]',
    stat: 'bg-[#fbf7f1]',
  },
};

export default function PageShell({
  title,
  subtitle,
  eyebrow,
  icon,
  actions = [],
  stats = [],
  tone = 'amber',
  children,
  contentClassName = 'p-4 md:p-6',
}: PageShellProps) {
  const palette = tones[tone];

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-5">
      <header className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {icon ? <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${palette.icon}`}>{icon}</div> : null}
            <div className="min-w-0">
              {eyebrow ? <p className={`text-xs font-bold uppercase tracking-[0.16em] ${palette.eyebrow}`}>{eyebrow}</p> : null}
              <h1 className="text-2xl font-bold tracking-tight text-gray-950 md:text-3xl">{title}</h1>
              {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">{subtitle}</p> : null}
            </div>
          </div>

          {actions.length ? (
            <div className="flex flex-wrap gap-2 md:justify-end">
              {actions.map(action => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    action.primary ? palette.primary : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {stats.length ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(stat => (
              <div key={stat.label} className={`rounded-2xl border border-gray-100 p-4 ${palette.stat}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                    <p className="mt-1 break-words text-xl font-bold text-gray-950">{stat.value}</p>
                  </div>
                  {stat.icon ? <div className={palette.eyebrow}>{stat.icon}</div> : null}
                </div>
                {stat.hint ? <p className="mt-2 text-xs leading-5 text-gray-500">{stat.hint}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <div className={`rounded-3xl border border-gray-100 bg-white shadow-sm ${contentClassName}`}>{children}</div>
    </section>
  );
}
