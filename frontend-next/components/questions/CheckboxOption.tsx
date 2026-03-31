"use client";

import styles from "./CheckboxOption.module.css";

export type CheckboxOptionProps = {
  id: string;
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean, value: string) => void;
  disabled?: boolean;
};

export default function CheckboxOption({
  id,
  name,
  value,
  label,
  checked,
  onChange,
  disabled = false,
}: CheckboxOptionProps) {
  return (
    <label className={styles.row} htmlFor={id}>
      <input
        id={id}
        className={styles.input}
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked, value)}
      />
      <span className={styles.labelText}>{label}</span>
    </label>
  );
}
