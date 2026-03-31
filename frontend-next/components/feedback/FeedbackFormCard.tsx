"use client";

import { useMemo, useState } from "react";
import type { ComponentProps } from "react";

import QuestionField from "@/components/questions/QuestionField";
import CheckboxOption from "@/components/questions/CheckboxOption";
import RadioOption from "@/components/questions/RadioOption";
import RatingScale from "@/components/questions/RatingScale";
import type {
  FeedbackFormConfig,
  FeedbackQuestion,
} from "@/types/feedback";

import styles from "./FeedbackFormCard.module.css";

function emptyAnswers(questions: FeedbackQuestion[]) {
  const initial: Record<string, string | string[]> = {};
  for (const q of questions) {
    if (q.type === "checkbox") initial[q.id] = [];
    else initial[q.id] = "";
  }
  return initial;
}

export type FeedbackFormCardProps = {
  config: FeedbackFormConfig;
};

type FormOnSubmit = NonNullable<ComponentProps<"form">["onSubmit"]>;

function isQuestionAnswered(
  q: FeedbackQuestion,
  value: string | string[] | undefined
) {
  if (q.type === "checkbox") {
    return Array.isArray(value) && value.length > 0;
  }
  return typeof value === "string" && value.trim().length > 0;
}

export default function FeedbackFormCard({ config }: FeedbackFormCardProps) {
  const [answers, setAnswers] = useState(() =>
    emptyAnswers(config.questions)
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const setRating = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setSubmitError("");
  };

  const setRadio = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setSubmitError("");
  };

  const toggleCheckbox = (id: string, value: string, checked: boolean) => {
    setAnswers((prev) => {
      const cur = prev[id];
      const list = Array.isArray(cur) ? [...cur] : [];
      if (checked) {
        if (!list.includes(value)) list.push(value);
      } else {
        const i = list.indexOf(value);
        if (i >= 0) list.splice(i, 1);
      }
      setSubmitError("");
      return { ...prev, [id]: list };
    });
  };

  const payload = useMemo(
    () => ({
      schemaVersion: config.schemaVersion,
      answers,
    }),
    [config.schemaVersion, answers]
  );

  const handleSubmit: FormOnSubmit = (e) => {
    e.preventDefault();
    const missingRequired = config.questions.filter((q) => {
      if (!q.required) return false;
      return !isQuestionAnswered(q, answers[q.id]);
    });
    if (missingRequired.length > 0) {
      setSubmitError("Please answer all required questions before submitting.");
      return;
    }

    try {
      localStorage.setItem(
        "artport_feedback_last",
        JSON.stringify(payload)
      );
    } catch {
      /* ignore */
    }
    console.log("Feedback submission", payload);
    setSubmitted(true);
  };

  const handleReset = () => {
    setAnswers(emptyAnswers(config.questions));
    setSubmitted(false);
    setSubmitError("");
  };

  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <h1 className={styles.title}>{config.title}</h1>
        {config.description ? (
          <p className={styles.description}>{config.description}</p>
        ) : null}
      </header>

      {submitted ? (
        <div className={styles.thanks} role="status">
          <p className={styles.thanksText}>Thanks — your feedback was saved locally.</p>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleReset}
          >
            Answer again
          </button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.questions}>
            {config.questions.map((q) => {
              if (q.type === "rating") {
                const v = answers[q.id];
                const value = typeof v === "string" ? v : "";
                return (
                  <QuestionField
                    key={q.id}
                    label={q.label}
                    detail={q.detail}
                    required={q.required}
                  >
                    <RatingScale
                      name={q.id}
                      value={value}
                      onChange={(next) => setRating(q.id, next)}
                      min={q.min ?? 1}
                      max={q.max ?? 5}
                      stepLabels={q.stepLabels}
                    />
                  </QuestionField>
                );
              }

              if (q.type === "checkbox") {
                const v = answers[q.id];
                const selected = Array.isArray(v) ? v : [];
                return (
                  <QuestionField
                    key={q.id}
                    label={q.label}
                    detail={q.detail}
                    required={q.required}
                  >
                    {q.options.map((opt) => (
                      <CheckboxOption
                        key={opt.value}
                        id={`${q.id}-${opt.value}`}
                        name={q.id}
                        value={opt.value}
                        label={opt.label}
                        checked={selected.includes(opt.value)}
                        onChange={(checked, val) =>
                          toggleCheckbox(q.id, val, checked)
                        }
                      />
                    ))}
                  </QuestionField>
                );
              }

              if (q.type === "radio") {
                const v = answers[q.id];
                const selected = typeof v === "string" ? v : "";
                return (
                  <QuestionField
                    key={q.id}
                    label={q.label}
                    detail={q.detail}
                    required={q.required}
                  >
                    {q.options.map((opt) => (
                      <RadioOption
                        key={opt.value}
                        id={`${q.id}-${opt.value}`}
                        name={q.id}
                        value={opt.value}
                        label={opt.label}
                        checked={selected === opt.value}
                        onChange={(val) => setRadio(q.id, val)}
                      />
                    ))}
                  </QuestionField>
                );
              }

              return null;
            })}
          </div>
          {submitError ? (
            <p style={{ color: "#b91c1c", margin: "0 0 8px" }}>{submitError}</p>
          ) : null}

          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn}>
              Submit feedback
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
