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
        <h2 className={styles.templateHeading}>Start from a template</h2>
        <p className={styles.templateIntro}>
          Pick a preset, then include or exclude questions, add custom text
          fields, and create the form — all in the browser.
        </p>
        <div className={styles.templateGrid}>
          {FEEDBACK_FORM_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={
                templateId === t.id
                  ? `${styles.templateCard} ${styles.templateCardActive}`
                  : styles.templateCard
              }
              onClick={() => setTemplateId(t.id)}
            >
              <span className={styles.templateName}>{t.name}</span>
              <span className={styles.templateBlurb}>{t.blurb}</span>
            </button>
          ))}
        </div>
      </section>

      <FeedbackQuestionSelect
        key={templateId}
        config={config}
        initialArtworkId={fromQuery}
      />
    </div>
  );
}
