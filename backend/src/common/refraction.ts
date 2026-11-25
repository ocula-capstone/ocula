import { ValidateBy, ValidationOptions } from 'class-validator';

/**
 * Refraction values in minus-cylinder form. One place for the ranges and steps, used by the DTOs
 * (`@IsRefraction`) and by the services (axis rule on the merged values).
 */
export const REFRACTION_RULES = {
  sphere: { min: -30, max: 30, step: 0.25, decimals: 2 },
  cylinder: { min: -10, max: 0, step: 0.25, decimals: 2 },
  add: { min: 0.75, max: 4, step: 0.25, decimals: 2 },
  pd: { min: 50, max: 75, step: 0.1, decimals: 1 },
} as const;

export type RefractionKind = keyof typeof REFRACTION_RULES;

export const AXIS_MIN = 1;
export const AXIS_MAX = 180;
export const VA_MAX_LENGTH = 20;

const signed = (n: number, decimals: number) =>
  `${n > 0 ? '+' : ''}${n.toFixed(decimals)}`;

/** "Use -30.00 to +30.00 in 0.25 steps." */
export function refractionMessage(kind: RefractionKind): string {
  const r = REFRACTION_RULES[kind];
  const unit = kind === 'pd' ? ' mm' : '';
  return `Use ${signed(r.min, r.decimals)} to ${signed(r.max, r.decimals)}${unit} in ${r.step} steps.`;
}

/** True when the value is a finite number inside the range and on the step (float-safe). */
export function isRefractionValue(
  value: unknown,
  kind: RefractionKind,
): boolean {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const r = REFRACTION_RULES[kind];
  if (value < r.min - 1e-9 || value > r.max + 1e-9) return false;
  const steps = value / r.step;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

/** DTO decorator. Use with `@IsOptional()` so null or a missing value means "empty". */
export function IsRefraction(
  kind: RefractionKind,
  options?: ValidationOptions,
): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isRefraction',
      constraints: [kind],
      validator: {
        validate: (value: unknown) => isRefractionValue(value, kind),
        defaultMessage: () => refractionMessage(kind),
      },
    },
    options,
  );
}

type Num = number | null | undefined;

export interface EyeValues {
  odCylinder?: Num;
  odAxis?: Num;
  osCylinder?: Num;
  osAxis?: Num;
}

/**
 * The axis rule for both eyes: required when the cylinder is non-zero, and must be empty when the
 * cylinder is empty. Returns `{ odAxis: "..." }`-style field errors (empty when valid).
 */
export function axisErrors(values: EyeValues): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const eye of ['od', 'os'] as const) {
    const cylinder = values[`${eye}Cylinder`];
    const axis = values[`${eye}Axis`];
    const hasCylinder = cylinder !== null && cylinder !== undefined;
    const hasAxis = axis !== null && axis !== undefined;
    if (hasCylinder && cylinder !== 0 && !hasAxis) {
      fields[`${eye}Axis`] = 'Enter the axis (1–180) for this cylinder.';
    } else if (!hasCylinder && hasAxis) {
      fields[`${eye}Axis`] = 'Leave the axis empty when there is no cylinder.';
    }
  }
  return fields;
}
