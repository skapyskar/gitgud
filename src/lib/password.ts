export interface PasswordRule {
  key: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { key: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { key: "symbol", label: "One symbol", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** Returns an error message, or null if the password satisfies every rule. */
export function validatePassword(password: string): string | null {
  const failed = PASSWORD_RULES.filter((r) => !r.test(password));
  if (failed.length === 0) return null;
  return `Password needs: ${failed.map((r) => r.label.toLowerCase()).join(", ")}.`;
}
