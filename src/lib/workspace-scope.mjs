/**
 * Keep the legacy library claim rule pure and testable. The database layer
 * applies this decision atomically before creating an isolated workspace.
 */
export function workspaceClaimDecision({ userId, email, legacyOwnerEmail, currentOwnerId }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedLegacy = String(legacyOwnerEmail || '').trim().toLowerCase();
  if (!currentOwnerId && normalizedLegacy && normalizedEmail === normalizedLegacy) {
    return 'claim-legacy';
  }
  return 'create-isolated';
}

