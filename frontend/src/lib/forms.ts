import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError, errorMessage } from "./api";

/**
 * Puts server-side field errors onto the matching inputs. Returns a message for the toast when the error
 * isn't tied to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): string | null {
  if (error instanceof ApiError && error.fieldErrors.length > 0) {
    let unmatched = false;
    for (const fe of error.fieldErrors) {
      if (fields.includes(fe.field)) setError(fe.field as Path<T>, { message: fe.message });
      else unmatched = true;
    }
    return unmatched ? error.message : null;
  }
  return errorMessage(error);
}

/** "" from an empty input becomes undefined, so optional fields are omitted from the request. */
export function blankToUndefined<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? undefined : v])) as T;
}
