// Password policy — mirrors the Supabase Auth requirement
// ("Lowercase, uppercase letters, digits and symbols", min length 8).
// Keep this in sync with the project's Auth settings so client-side validation
// agrees with what the server will accept.
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'A lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'An uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'A number', test: (p) => /\d/.test(p) },
  { label: 'A symbol', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// Returns [{ label, ok }] for live checklist rendering.
export function checkPassword(pw = '') {
  return PASSWORD_RULES.map((r) => ({ label: r.label, ok: r.test(pw) }));
}

export function passwordValid(pw = '') {
  return PASSWORD_RULES.every((r) => r.test(pw));
}
