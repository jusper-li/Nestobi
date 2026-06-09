const MEMBER_QR_PREFIX = 'nestobi:member:';

export function buildMemberQrPayload(userId: string) {
  return `${MEMBER_QR_PREFIX}${userId}`;
}

export function parseMemberQrPayload(rawValue: string) {
  const value = rawValue.trim();
  if (!value) return null;

  if (value.startsWith(MEMBER_QR_PREFIX)) {
    const userId = value.slice(MEMBER_QR_PREFIX.length).trim();
    return userId || null;
  }

  if (value.startsWith('{')) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const userId = typeof parsed.user_id === 'string'
        ? parsed.user_id
        : typeof parsed.userId === 'string'
          ? parsed.userId
          : typeof parsed.member_id === 'string'
            ? parsed.member_id
            : typeof parsed.memberId === 'string'
              ? parsed.memberId
              : '';
      if (userId.trim()) return userId.trim();
    } catch {
      // Ignore malformed JSON and continue with the fallback patterns below.
    }
  }

  try {
    const url = new URL(value);
    const candidates = [
      url.searchParams.get('user_id'),
      url.searchParams.get('userId'),
      url.searchParams.get('member_id'),
      url.searchParams.get('memberId'),
    ].filter(Boolean) as string[];
    const userId = candidates[0]?.trim();
    if (userId) return userId;
  } catch {
    // Not a URL, fall through to text pattern matching.
  }

  const uuidMatch = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  if (uuidMatch?.[0]) return uuidMatch[0];

  return null;
}
