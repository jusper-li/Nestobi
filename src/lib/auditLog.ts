import { supabase } from './supabase';
import { APP_BUILD_LABEL, APP_COMMIT_SHA } from './appVersion';

type AuditDetails = Record<string, unknown>;
type AuditRecordType = 'change' | 'check' | 'baseline';
type AuditStatus = 'pending' | 'completed' | 'failed';

type AuditMeta = {
  recordType?: AuditRecordType;
  status?: AuditStatus;
  summary?: string | null;
  route?: string | null;
  versionLabel?: string | null;
  commitSha?: string | null;
  completedAt?: string | null;
};

function getBaselineStorageKey(label: string) {
  return `superadmin-baseline:${label}`;
}

function getBrowserStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

async function insertAuditRecord(payload: Record<string, unknown>) {
  const { error } = await supabase.from('admin_activity_logs').insert(payload);
  if (error) throw error;
}

function buildLegacyAuditPayload(payload: Record<string, unknown>) {
  return {
    action: payload.action,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id,
    details: payload.details || {},
  };
}

async function insertWithFallback(payload: Record<string, unknown>) {
  try {
    await insertAuditRecord(payload);
  } catch (error: any) {
    const fallback = buildLegacyAuditPayload(payload);
    const shouldFallback = fallback.action && (
      String(error?.message || '').toLowerCase().includes('column') ||
      String(error?.message || '').toLowerCase().includes('does not exist') ||
      String(error?.code || '') === '42703'
    );

    if (!shouldFallback) throw error;

    await insertAuditRecord(fallback);
  }
}

async function hasActiveSession() {
  const { data } = await supabase.auth.getSession();
  return Boolean(data.session?.user?.id);
}

function buildAuditPayload(
  action: string,
  entityType: string,
  entityId: string | null | undefined,
  details: AuditDetails,
  meta: AuditMeta = {}
) {
  return {
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    details,
    record_type: meta.recordType || 'change',
    status: meta.status || 'completed',
    summary: meta.summary || action,
    route: meta.route || null,
    version_label: meta.versionLabel || APP_BUILD_LABEL,
    commit_sha: meta.commitSha || APP_COMMIT_SHA,
    completed_at: meta.completedAt || new Date().toISOString(),
  };
}

export async function logAdminAction(
  action: string,
  entityType: string,
  entityId?: string | null,
  details: AuditDetails = {},
  meta: AuditMeta = {}
) {
  try {
    if (!(await hasActiveSession())) return;
    await insertWithFallback(buildAuditPayload(action, entityType, entityId, details, {
      ...meta,
      recordType: meta.recordType || 'change',
      status: meta.status || 'completed',
    }));
  } catch (error) {
    console.warn('Admin audit log was not recorded:', error);
  }
}

export async function logSystemCheck(
  scope: string,
  details: AuditDetails = {},
  meta: Pick<AuditMeta, 'route' | 'summary' | 'versionLabel' | 'commitSha'> = {}
) {
  try {
    if (!(await hasActiveSession())) return;
    await insertWithFallback(buildAuditPayload(
      'system_check',
      'system',
      scope,
      details,
      {
        ...meta,
        recordType: 'check',
        status: 'completed',
        summary: meta.summary || `system check: ${scope}`,
      }
    ));
  } catch (error) {
    console.warn('System check log was not recorded:', error);
  }
}

export async function recordVersionBaseline(
  label: string,
  details: AuditDetails = {},
  meta: Pick<AuditMeta, 'route' | 'summary' | 'versionLabel' | 'commitSha'> = {}
) {
  const storage = getBrowserStorage();
  const storageKey = getBaselineStorageKey(label);

  try {
    if (!(await hasActiveSession())) return;
    if (storage) {
      const current = storage.getItem(storageKey);
      if (current === '1' || current === 'pending') return;
      storage.setItem(storageKey, 'pending');
    }

    await insertWithFallback(buildAuditPayload(
      'version_baseline',
      'system',
      label,
      details,
      {
        ...meta,
        recordType: 'baseline',
        status: 'completed',
        summary: meta.summary || `version baseline: ${label}`,
      }
    ));
    if (storage) storage.setItem(storageKey, '1');
  } catch (error: any) {
    if (storage) storage.removeItem(storageKey);
    if (error?.code === '23505') return;
    console.warn('Version baseline was not recorded:', error);
  }
}
