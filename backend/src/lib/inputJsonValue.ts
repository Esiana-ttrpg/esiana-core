import { Prisma } from '@prisma/client';

/** Cast structured app types to Prisma JSON columns without per-call assertions. */
export function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export function toNullableInputJsonValue(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) return Prisma.JsonNull;
  return toInputJsonValue(value);
}
