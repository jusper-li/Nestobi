import type { ReactNode } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import PageShell, { type PageShellAction, type PageShellStat } from '../ui/PageShell';

interface VendorPageShellProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: PageShellAction[];
  stats?: PageShellStat[];
  children: ReactNode;
}

export default function VendorPageShell(props: VendorPageShellProps) {
  const { t } = useLanguage();

  return (
    <PageShell
      {...props}
      eyebrow={t('backoffice.vendor', '廠商管理')}
      tone="emerald"
    />
  );
}
