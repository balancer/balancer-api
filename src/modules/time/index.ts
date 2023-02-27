import { MAX_VALID_TO_EPOCH } from "@/constants";

export function calculateDeadlineExpiry(deadlineInMinutes: number): number {
  const now = Date.now() / 1000;
  const validTo = Math.floor(deadlineInMinutes * 60 + now);

  return Math.min(validTo, MAX_VALID_TO_EPOCH);
}