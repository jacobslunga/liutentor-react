const LIU_EMAIL_REGEX = /^[a-z]{5}\d{3}@student\.liu\.se$/;

export function validateLiuEmail(email: string): string {
  if (!email) return "E-post krävs";
  if (!LIU_EMAIL_REGEX.test(email.toLowerCase())) {
    return "Måste vara en giltig LiU-adress, t.ex. abcde123@student.liu.se";
  }
  return "";
}

export function validatePassword(password: string): string {
  if (!password) return "Lösenord krävs";
  if (password.length < 8) return "Minst 8 tecken krävs";
  return "";
}

export function validateName(name: string, label: string): string {
  if (!name.trim()) return `${label} krävs`;
  if (name.trim().length < 2) return `${label} måste vara minst 2 tecken`;
  return "";
}
