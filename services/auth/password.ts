import { hash, verify } from "@node-rs/argon2";

const argonOptions = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

export function hashPassword(password: string) {
  return hash(password, argonOptions);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password, argonOptions);
}
