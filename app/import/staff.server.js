// Who is signed in, for the record of an import. An online session names the person; without
// one (an offline session) only the ID in the session token is known.

/** Returns { id, name }: id as text or null, name as text or null. */
export function staffFrom(session, sessionToken) {
  const user = session?.onlineAccessInfo?.associated_user;
  const id = user?.id ?? sessionToken?.sub ?? null;
  const name =
    [user?.first_name, user?.last_name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") ||
    user?.email?.trim() ||
    null;
  return { id: id === null ? null : String(id), name };
}
