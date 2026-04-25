"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import FeedbackQuestionSelect from "@/components/feedback/FeedbackQuestionSelect";
import {
  DEFAULT_FEEDBACK_TEMPLATE_ID,
  FEEDBACK_FORM_TEMPLATES,
} from "@/data/feedback-templates";

import styles from "../feedback.module.css";

export default function SelectArtworkParam() {
  const [templateId, setTemplateId] = useState(DEFAULT_FEEDBACK_TEMPLATE_ID);
  const config = useMemo(() => {
    return (
      FEEDBACK_FORM_TEMPLATES.find((t) => t.id === templateId)?.config ??
      FEEDBACK_FORM_TEMPLATES[0].config
    );
  }, [templateId]);

  const searchParams = useSearchParams();
  const fromQuery = searchParams.get("artworkId")?.trim() ?? "";

  return (
    <div className={styles.selectFlow}>
      <section className={styles.templateSection} aria-label="Form templates">
        <h2 className={styles.templateHeading}>Feedback form</h2>
        <p className={styles.templateIntro}>
          Select a predesigned feedback form or create a custom feedback form.
        </p>
        <fieldset className={styles.templateGrid} aria-label="Choose feedback template">
          {FEEDBACK_FORM_TEMPLATES.map((t) => (
            <label
              key={t.id}
              className={
                templateId === t.id
                  ? `${styles.templateCard} ${styles.templateCardActive}`
                  : styles.templateCard
              }
              htmlFor={`template-${t.id}`}
            >
              <input
                id={`template-${t.id}`}
                className={styles.templateRadio}
                type="radio"
                name="feedback-template"
                value={t.id}
                checked={templateId === t.id}
                onChange={() => setTemplateId(t.id)}
              />
              <span className={styles.templateName}>{t.name}</span>
              <span className={styles.templateBlurb}>{t.blurb}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <FeedbackQuestionSelect
        key={templateId}
        config={config}
        initialArtworkId={fromQuery}
      />
    </div>
  );
}
