import { ValidationError } from 'class-validator';

/**
 * Turns class-validator errors into { "field.path": "first message" }.
 * Nested objects and arrays become dotted paths, e.g. "od.sphere" or "items.0.quantity".
 */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const error of errors) {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const firstMessage = Object.values(error.constraints ?? {})[0];
    if (firstMessage) fields[path] = firstMessage;
    if (error.children?.length) {
      Object.assign(fields, flattenValidationErrors(error.children, path));
    }
  }
  return fields;
}
