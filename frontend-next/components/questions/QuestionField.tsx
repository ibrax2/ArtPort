"use client";

import { useId, useState } from "react";

import QuestionHelpButton from "./QuestionHelpButton";
import styles from "./QuestionField.module.css";

export type QuestionFieldProps = {
  label: string;
  detail?: string;
  required?: boolean;
  children: React.ReactNode;
};

export default function QuestionField({
  label,
  detail,
  required = false,
  children,
}: QuestionFieldProps) {
  const reactId = useId();
  const detailId = `question-detail-${reactId.replace(/:/g, "")}`;
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        <span className={styles.legendText}>
          {label}
          {required ? (
            <span className={styles.required} aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </span>
        {detail ? (
          <QuestionHelpButton
            expanded={detailOpen}
            onToggle={() => setDetailOpen((v) => !v)}
            controlsId={detailId}
            aria-label="Show or hide extra details for this question"
          />
        ) : null}
      </legend>

      {detail ? (
        <div
          id={detailId}
          className={styles.detail}
          hidden={!detailOpen}
          role="region"
        >
          {detail}
        </div>
      ) : null}

      <div className={styles.body}>{children}</div>
    </fieldset>
  );
}
