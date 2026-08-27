import { verifyPassword } from "./password";

export async function verifyLoginCredential(input: { userStatus?: string; passwordHash?: string | null; password: string }): Promise<boolean> {
  if (input.userStatus !== "ACTIVE" || !input.passwordHash) return false;
  return verifyPassword(input.passwordHash, input.password);
}
