export type SubscriptionPlanMonths = 3 | 6 | 12 | 'NE';

export const DEFAULT_SUBSCRIPTION_PERIODS: SubscriptionPlanMonths[] = [3, 6, 12, 'NE'];
export const SUBSCRIPTION_SPEC_NAME = '訂閱期數';

const isSubscriptionSpecName = (name: string) => {
  const normalized = name.trim().toLowerCase();
  return (
    normalized === SUBSCRIPTION_SPEC_NAME.toLowerCase() ||
    normalized === 'subscription periods' ||
    normalized === 'subscription_periods' ||
    normalized === 'periods' ||
    normalized === 'period'
  );
};

export function normalizeSubscriptionPeriodValue(value: unknown): SubscriptionPlanMonths | null {
  const text = String(value ?? '').trim().toUpperCase();
  if (!text) return null;
  if (['NE', 'M', 'MONTHLY', 'MONTH', 'MONTHS', '每月'].includes(text)) return 'NE';

  const months = Number.parseInt(text, 10);
  if (months === 3 || months === 6 || months === 12) return months;

  return null;
}

export function extractSubscriptionPeriods(specifications: unknown): SubscriptionPlanMonths[] {
  if (!Array.isArray(specifications)) return [...DEFAULT_SUBSCRIPTION_PERIODS];

  const values = specifications.flatMap((spec) => {
    if (!spec || typeof spec !== 'object') return [];
    const entry = spec as {
      name?: unknown;
      options?: unknown;
      value?: unknown;
    };

    if (!isSubscriptionSpecName(String(entry.name ?? ''))) return [];

    if (Array.isArray(entry.options)) {
      return entry.options
        .map((option) => normalizeSubscriptionPeriodValue(option))
        .filter((option): option is SubscriptionPlanMonths => Boolean(option));
    }

    if (entry.value !== undefined && entry.value !== null) {
      const normalized = normalizeSubscriptionPeriodValue(entry.value);
      return normalized ? [normalized] : [];
    }

    return [];
  });

  const unique = Array.from(new Set(values));
  return unique.length > 0 ? unique : [...DEFAULT_SUBSCRIPTION_PERIODS];
}

export function buildSubscriptionSpecification(periods: SubscriptionPlanMonths[]) {
  return {
    name: SUBSCRIPTION_SPEC_NAME,
    options: Array.from(
      new Set(
        periods
          .map((period) => normalizeSubscriptionPeriodValue(period))
          .filter((period): period is SubscriptionPlanMonths => Boolean(period))
      )
    ),
  };
}
