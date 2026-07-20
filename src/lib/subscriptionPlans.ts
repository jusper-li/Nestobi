import { DEFAULT_SUBSCRIPTION_PERIODS, normalizeSubscriptionPeriodValue, type SubscriptionPlanMonths } from './subscriptionPeriods';

export interface SubscriptionPlan {
  months: SubscriptionPlanMonths;
  amount: number;
}

const DEFAULT_ORDER: SubscriptionPlanMonths[] = [...DEFAULT_SUBSCRIPTION_PERIODS];

function normalizePlanMonths(value: unknown): SubscriptionPlanMonths | null {
  return normalizeSubscriptionPeriodValue(value);
}

export function normalizeSubscriptionPlanAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount);
}

function uniqueOrderedMonths(periods: SubscriptionPlanMonths[]) {
  const normalized = periods
    .map((period) => normalizePlanMonths(period))
    .filter((period): period is SubscriptionPlanMonths => Boolean(period));

  const allowed = new Set(normalized);
  return DEFAULT_ORDER.filter((period) => allowed.has(period));
}

export function buildDefaultSubscriptionPlans(
  fallbackAmount = 0,
  periods: SubscriptionPlanMonths[] = DEFAULT_SUBSCRIPTION_PERIODS,
): SubscriptionPlan[] {
  const amount = normalizeSubscriptionPlanAmount(fallbackAmount);
  return uniqueOrderedMonths(periods).map((months) => ({ months, amount }));
}

export function normalizeSubscriptionPlans(
  plans: unknown,
  fallbackAmount = 0,
  fallbackPeriods: SubscriptionPlanMonths[] = DEFAULT_SUBSCRIPTION_PERIODS,
): SubscriptionPlan[] {
  const allowedPeriods = uniqueOrderedMonths(fallbackPeriods);
  const amountFallback = normalizeSubscriptionPlanAmount(fallbackAmount);

  if (!Array.isArray(plans) || plans.length === 0) {
    return buildDefaultSubscriptionPlans(amountFallback, allowedPeriods);
  }

  const planMap = new Map<SubscriptionPlanMonths, number>();

  for (const entry of plans) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as Record<string, unknown>;
    const months = normalizePlanMonths(candidate.months ?? candidate.period ?? candidate.value);
    if (!months) continue;
    const amount = normalizeSubscriptionPlanAmount(candidate.amount ?? candidate.price ?? candidate.period_amount ?? candidate.periodAmount);
    planMap.set(months, amount);
  }

  const normalized = allowedPeriods.map((months) => ({
    months,
    amount: planMap.has(months) ? (planMap.get(months) as number) : amountFallback,
  }));

  return normalized.length > 0 ? normalized : buildDefaultSubscriptionPlans(amountFallback, allowedPeriods);
}

export function extractPlanAmount(plans: unknown, months: SubscriptionPlanMonths): number | null {
  if (!Array.isArray(plans)) return null;
  const normalizedMonth = normalizePlanMonths(months);
  if (!normalizedMonth) return null;

  for (const entry of plans) {
    if (!entry || typeof entry !== 'object') continue;
    const candidate = entry as Record<string, unknown>;
    const entryMonths = normalizePlanMonths(candidate.months ?? candidate.period ?? candidate.value);
    if (entryMonths !== normalizedMonth) continue;
    return normalizeSubscriptionPlanAmount(candidate.amount ?? candidate.price ?? candidate.period_amount ?? candidate.periodAmount);
  }

  return null;
}

export function mergeSubscriptionPlans(
  periods: SubscriptionPlanMonths[],
  plans: SubscriptionPlan[],
  fallbackAmount = 0,
): SubscriptionPlan[] {
  const periodSet = uniqueOrderedMonths(periods);
  const planMap = new Map(plans.map((plan) => [plan.months, normalizeSubscriptionPlanAmount(plan.amount)] as const));
  const amountFallback = normalizeSubscriptionPlanAmount(fallbackAmount);

  return periodSet.map((months) => ({
    months,
    amount: planMap.has(months) ? (planMap.get(months) as number) : amountFallback,
  }));
}
