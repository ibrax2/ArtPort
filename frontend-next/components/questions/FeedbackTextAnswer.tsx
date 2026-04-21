"use client";

import { TEXT_LIMITS, sanitizeMultilineText } from "@/lib/textInput";

import styles from "./FeedbackTextAnswer.module.css";

export type FeedbackTextAnswerProps = {
  id?: string;
  value: string;
  onChange?: (value: string) => void;
  maxLength?: number;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  showCounter?: boolean;
  className?: string;
  ariaHidden?: boolean;
  placeholder?: string;
};

export default function FeedbackTextAnswer({
  id,
  value,
  onChange,
  maxLength = TEXT_LIMITS.feedbackTextAnswer,
  rows = 3,
  required = false,
  disabled = false,
  readOnly = false,
  showCounter = true,
  className,
  ariaHidden,
  placeholder,
}: FeedbackTextAnswerProps) {
  const safeMax = Math.max(1, maxLength);

  return (
    <div className={className}>
      <textarea
        id={id}
        className={styles.textArea}
        rows={rows}
        value={value}
        readOnly={readOnly}
        disabled={disabled}
        aria-hidden={ariaHidden === true ? true : undefined}
        aria-required={required}
        maxLength={safeMax}
        placeholder={placeholder}
        onChange={
          onChange
            ? (ev) =>
                onChange(sanitizeMultilineText(ev.target.value, safeMax))
            : undefined
        }
      />
      {showCounter ? (
        <p className={styles.charCount} aria-live="polite">
          {value.length} / {safeMax}
        </p>
      ) : null}
    </div>
  );
}
