// BMI and waist measures with the cut-offs used for Asian Indians (lower than the WHO
// cut-offs for Europeans): overweight from BMI 23, obesity from 25; waist ≥ 90 cm (men)
// or ≥ 80 cm (women); waist-to-height ratio ≥ 0.5.

import type { Classification } from './labs';
import type { Sex } from './profile';

export type WaistEntry = { id: number; date: Date; cm: number };

export const ASIAN_BMI = { underweight: 18.5, overweight: 23, obese: 25 } as const;
export const WAIST_HIGH_CM: Record<Sex, number> = { male: 90, female: 80 };
export const WHTR_HIGH = 0.5;

export function bmi(kg: number, heightCm: number): number {
  const m = heightCm / 100;
  return kg / (m * m);
}

export function classifyBmi(value: number): Classification {
  if (value < ASIAN_BMI.underweight) return { label: 'Underweight', tone: 'warn' };
  if (value < ASIAN_BMI.overweight) return { label: 'Healthy', tone: 'good' };
  if (value < ASIAN_BMI.obese) return { label: 'Overweight', tone: 'warn' };
  return { label: 'Obese', tone: 'bad' };
}

/** Weights (kg) that keep BMI in the healthy Asian range for this height. */
export function healthyWeightRange(heightCm: number): { min: number; max: number } {
  const m2 = (heightCm / 100) ** 2;
  return { min: ASIAN_BMI.underweight * m2, max: ASIAN_BMI.overweight * m2 - 0.1 };
}

/** null when sex isn't known, since the threshold depends on it. */
export function classifyWaist(cm: number, sex: Sex | null): Classification | null {
  if (!sex) return null;
  return cm >= WAIST_HIGH_CM[sex]
    ? { label: `High (${WAIST_HIGH_CM[sex]} cm or more)`, tone: 'bad' }
    : { label: `Below ${WAIST_HIGH_CM[sex]} cm`, tone: 'good' };
}

export function waistToHeight(waistCm: number, heightCm: number): number {
  return waistCm / heightCm;
}

export function classifyWaistToHeight(ratio: number): Classification {
  return ratio >= WHTR_HIGH
    ? { label: 'High (0.5 or more)', tone: 'bad' }
    : { label: 'Below 0.5', tone: 'good' };
}

export function validateWaist(cm: number): string | null {
  return cm >= 40 && cm <= 200 ? null : 'Waist should be between 40 and 200 cm.';
}
