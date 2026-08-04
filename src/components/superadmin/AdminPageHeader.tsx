import type { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
};

export default function AdminPageHeader({
  title,
  description,
  icon,
  actions,
  eyebrow,
}: AdminPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          {icon}
        </div>
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">{eyebrow}</p>}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
