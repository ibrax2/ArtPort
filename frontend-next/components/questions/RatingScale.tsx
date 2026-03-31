"use client";

import { useId } from "react";

import styles from "./RatingScale.module.css";

export type RatingScaleProps = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  stepLabels?: string[];
  disabled?: boolean;
};

export default function RatingScale({
  name,
  value,
  onChange,
  min = 1,
  max = 5,
  stepLabels,
  disabled = false,
}: RatingScaleProps) {
  const baseId = useId().replace(/:/g, "");
  const steps: number[] = [];
  for (let n = min; n <= max; n += 1) {
    steps.push(n);
  }

  if (stepLabels && stepLabels.length !== steps.length) {
    console.warn(
      "RatingScale: stepLabels length should match the number of steps (max - min + 1)."
    );
  }

  return (
    <div className={styles.root}>
      {steps.map((n, index) => {
        const id = `${baseId}-rating-${n}`;
        const str = String(n);
        const labelUnder = stepLabels?.[index];
        return (
          <div key={n} className={styles.cell}>
            <input
              id={id}
              className={styles.input}
              type="radio"
              name={name}
              value={str}
              checked={value === str}
              disabled={disabled}
              onChange={() => onChange(str)}
            />
            <label className={styles.numberLabel} htmlFor={id}>
              {n}
            </label>
            {stepLabels ? (
              <span className={styles.stepCaption}>
                {labelUnder?.trim() ? labelUnder : "\u00A0"}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
