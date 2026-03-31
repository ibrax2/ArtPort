"use client";

import styles from "./QuestionHelpButton.module.css";

export type QuestionHelpButtonProps = {
  expanded: boolean;
  onToggle: () => void;
  controlsId: string;
  "aria-label"?: string;
};

export default function QuestionHelpButton({
  expanded,
  onToggle,
  controlsId,
  "aria-label": ariaLabel = "Show question details",
}: QuestionHelpButtonProps) {
  return (
    <button
      type="button"
      className={styles.helpButton}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={ariaLabel}
    >
      <span className={styles.mark} aria-hidden>
        ?
      </span>
    </button>
  );
}
