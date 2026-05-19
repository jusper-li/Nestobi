import { useEffect, useMemo, useRef, useState } from 'react';

interface ProgressiveListOptions {
  initialCount?: number;
  increment?: number;
  rootMargin?: string;
}

export function useProgressiveList<T>(
  items: T[],
  { initialCount = 12, increment = 12, rootMargin = '640px' }: ProgressiveListOptions = {}
) {
  const [visibleCount, setVisibleCount] = useState(initialCount);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(initialCount);
  }, [items, initialCount]);

  const hasMore = visibleCount < items.length;
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const loadMore = () => setVisibleCount(count => Math.min(items.length, count + increment));

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) loadMore();
      },
      { rootMargin }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, increment, items.length, rootMargin]);

  return { visibleItems, visibleCount, hasMore, sentinelRef, loadMore };
}
