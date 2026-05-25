const LEGACY_AVATAR_SEGMENT = "/uploads/avatars/";
const PROFILE_IMAGE_SEGMENT = "/uploads/profile_images/";

/**
 * Some PHP payloads still return legacy avatar URLs under `/uploads/avatars/`.
 * Normalize those URLs to `/uploads/profile_images/` before embedding them in JWT claims.
 */
export function normalizeAvatarUrl(avatar: string | null): string | null {
  if (!avatar) return avatar;
  if (!avatar.includes(LEGACY_AVATAR_SEGMENT)) return avatar;

  try {
    const parsed = new URL(avatar);
    parsed.pathname = parsed.pathname.replace(
      LEGACY_AVATAR_SEGMENT,
      PROFILE_IMAGE_SEGMENT,
    );
    return parsed.toString();
  } catch {
    return avatar.replace(LEGACY_AVATAR_SEGMENT, PROFILE_IMAGE_SEGMENT);
  }
}
