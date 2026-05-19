import { supabase } from './supabase';

type AuditDetails = Record<string, unknown>;

export async function logAdminAction(
  action: string,
  entityType: string,
  entityId?: string | null,
  details: AuditDetails = {}
) {
  try {
    const { error } = await supabase.from('admin_activity_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details,
    });
    if (error) console.warn('Admin audit log was not recorded:', error);
  } catch (error) {
    console.warn('Admin audit log was not recorded:', error);
  }
}
