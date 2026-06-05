import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type FavoriteTargetType = 'product' | 'blog_post' | 'room' | 'hotel';

export function useMemberFavorite(userId: string | undefined, targetType: FavoriteTargetType, targetId: string | undefined) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchFavorite = async () => {
      if (!userId || !targetId) {
        setIsFavorite(false);
        return;
      }
      const { data } = await supabase
        .from('member_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .maybeSingle();
      if (!cancelled) setIsFavorite(Boolean(data));
    };
    void fetchFavorite();
    return () => {
      cancelled = true;
    };
  }, [targetId, targetType, userId]);

  const toggleFavorite = async () => {
    if (!userId || !targetId || loading) return false;
    setLoading(true);
    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('member_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('target_type', targetType)
          .eq('target_id', targetId);
        if (error) throw error;
        setIsFavorite(false);
      } else {
        const { error } = await supabase
          .from('member_favorites')
          .upsert({ user_id: userId, target_type: targetType, target_id: targetId }, { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true });
        if (error) throw error;
        setIsFavorite(true);
      }
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { isFavorite, loading, toggleFavorite };
}
