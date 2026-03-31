"use client";

import styles from "./RadioOption.module.css";

export type RadioOptionProps = {
  id: string;
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function RadioOption({
  id,
  name,
  value,
  label,
  checked,
  onChange,
  disabled = false,
}: RadioOptionProps) {
  return (
    <label className={styles.row} htmlFor={id}>
      <input
        id={id}
        className={styles.input}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
      />
      <span className={styles.labelText}>{label}</span>
    </label>
  );
}
