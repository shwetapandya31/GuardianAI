export interface PasswordRequirements {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  hasVowel: boolean;
}

export function validatePassword(password: string): PasswordRequirements {
  return {
    minLength: password.length >= 6,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^a-zA-Z0-9]/.test(password),
    hasVowel: /[aeiouAEIOU]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  const reqs = validatePassword(password);
  return (
    reqs.minLength &&
    reqs.hasLetter &&
    reqs.hasNumber &&
    reqs.hasSpecialChar &&
    reqs.hasVowel
  );
}

export function getPasswordError(password: string): string | null {
  const reqs = validatePassword(password);
  if (!reqs.minLength) return "Password must be at least 6 characters long.";
  if (!reqs.hasLetter) return "Password must contain at least one letter (a-z).";
  if (!reqs.hasVowel) return "Password must contain at least one vowel (a, e, i, o, u).";
  if (!reqs.hasNumber) return "Password must contain at least one number (0-9).";
  if (!reqs.hasSpecialChar) return "Password must contain at least one special character (e.g. !@#$%).";
  return null;
}
