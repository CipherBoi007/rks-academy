import type { ChangeEvent } from "react";
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

/**
 * An Indian mobile number as typed or pasted, cleaned to at most 10 digits. Spaces, dashes and brackets are
 * dropped, and a pasted "+91 98765 43210" or "09876543210" loses its prefix. A prefix is only removed when the
 * full prefixed form was entered, so typing an 11th digit never mangles a number that starts with 91.
 */
export function mobileDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}

/** Digits only, at most `max` of them: PINs (6 to 12 digits) and one-time codes. */
export function digitsOnly(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

/**
 * Wraps a react-hook-form `register(...)` result so the input only ever holds cleaned text, whether typed or
 * pasted. Use instead of maxLength on fields that accept pasted, formatted values (maxLength would cut a pasted
 * "+91 …" number short before it could be cleaned).
 */
export function cleaned<T extends { onChange: (event: ChangeEvent<HTMLInputElement>) => unknown }>(
  field: T,
  clean: (value: string) => string,
): T {
  return {
    ...field,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      event.target.value = clean(event.target.value);
      return field.onChange(event);
    },
  };
}

/** Ready-made cleaners for `cleaned(...)`. */
export const MOBILE = mobileDigits;
export const PIN = (value: string) => digitsOnly(value, 12);
