// Lógica pura de resolución de rol de acceso a un doc. Sin dependencias de BD
// para poder probarla aislada (el resto del flujo vive en actions/helpers.ts).

export type AccessRole = "owner" | "editor" | "viewer";

const ROLE_RANK: Record<AccessRole, number> = { viewer: 1, editor: 2, owner: 3 };

/**
 * Rol efectivo dado si el usuario es dueño y los grants heredados (de doc_shares
 * sobre el doc o sus ancestros). El dueño siempre gana; entre grants, el más
 * alto. Devuelve null si no hay acceso.
 */
export function pickAccessRole(
  isOwner: boolean,
  grantRoles: ("viewer" | "editor")[]
): AccessRole | null {
  if (isOwner) return "owner";
  let best: AccessRole | null = null;
  for (const r of grantRoles) {
    if (!best || ROLE_RANK[r] > ROLE_RANK[best]) best = r;
  }
  return best;
}
