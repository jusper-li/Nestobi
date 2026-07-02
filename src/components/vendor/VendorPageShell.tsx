import React from 'react';
import { motion } from 'framer-motion';

type ShellAction = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
};

type ShellStat = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
};

interface VendorPageShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: ShellAction[];
  stats?: ShellStat[];
  children: React.ReactNode;
}

export default function VendorPageShell({
  title,
  subtitle,
  icon,
  actions = [],
  stats = [],
  children,
}: VendorPageShellProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-950 to-emerald-800 p-5 text-white shadow-lg shadow-emerald-950/10 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              {icon}
              <span>Vendor Management</span>
            </div>
            <h1 className="mt-4 text-2xl font-bold leading-tight md:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-7 text-emerald-50/85 md:text-[15px]">{subtitle}</p> : null}
          </div>

          {actions.length > 0 ? (
            <div className="flex flex-wrap gap-2 md:justify-end">
              {actions.map(action => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                    action.primary
                      ? 'bg-white text-emerald-950 shadow-sm hover:bg-emerald-50'
                      : 'border border-white/15 bg-white/10 text-white hover:bg-white/15'
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {stats.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-emerald-100/80">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                  </div>
                  {stat.icon ? <div className="text-emerald-100">{stat.icon}</div> : null}
                </div>
                {stat.hint ? <p className="mt-2 text-xs leading-5 text-emerald-50/75">{stat.hint}</p> : null}
              </motion.div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm md:p-6">
        {children}
      </div>
    </div>
  );
}
