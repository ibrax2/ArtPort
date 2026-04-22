"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import QuestionField from "@/components/questions/QuestionField";
import CheckboxOption from "@/components/questions/CheckboxOption";
import RadioOption from "@/components/questions/RadioOption";
import RatingScale from "@/components/questions/RatingScale";
import FeedbackTextAnswer from "@/components/questions/FeedbackTextAnswer";
import type {
  FeedbackFormConfig,
  FeedbackQuestion,
  FeedbackQuestionText,
} from "@/types/feedback";
import {
  createFeedbackForm,
  fetchFeedbackFormByArtworkId,
  mapFeedbackQuestionsToCreatePayload,
} from "@/lib/feedbackApi";
import { getClientAuthToken } from "@/lib/authSession";
import {
  sanitizeMultilineText,
  sanitizeSingleLineText,
  TEXT_LIMITS,
} from "@/lib/textInput";

import styles from "./FeedbackQuestionSelect.module.css";

type Props = {
  config: FeedbackFormConfig;
  initialArtworkId?: string;
};

export default function FeedbackQuestionSelect({
  config,
  initialArtworkId = "",
}: Props) {
  const router = useRouter();
  const [customTextQuestions, setCustomTextQuestions] = useState<
    FeedbackQuestionText[]
  >([]);

  const [draftLabel, setDraftLabel] = useState("");
  const [draftHelp, setDraftHelp] = useState("");
  const [draftRequired, setDraftRequired] = useState(false);

  const mergedQuestions = useMemo(
    () => [...config.questions, ...customTextQuestions],
    [config.questions, customTextQuestions]
  );

  const customIds = useMemo(
    () => new Set(customTextQuestions.map((q) => q.id)),
    [customTextQuestions]
  );

  const [included, setIncluded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const q of config.questions) init[q.id] = true;
    return init;
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdFormId, setCreatedFormId] = useState<string | null>(null);

  const trimmedArtworkId = initialArtworkId.trim();

  const toggleInclude = (id: string, checked: boolean) => {
    setIncluded((prev) => ({ ...prev, [id]: checked }));
    setError("");
    setCreatedFormId(null);
  };

  const addCustomTextQuestion = () => {
    const label = sanitizeSingleLineText(
      draftLabel,
      TEXT_LIMITS.feedbackQuestionLabel
    ).trim();
    if (!label) {
      setError("Enter the question text for your custom text field.");
      return;
    }
    const helpRaw = sanitizeMultilineText(
      draftHelp,
      TEXT_LIMITS.feedbackQuestionHelp
    ).trim();
    const detail = helpRaw || undefined;
    const id = `custom-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
    const q: FeedbackQuestionText = {
      id,
      type: "text",
      label,
      detail,
      required: draftRequired,
    };
    setCustomTextQuestions((prev) => [...prev, q]);
    setIncluded((prev) => ({ ...prev, [id]: true }));
    setDraftLabel("");
    setDraftHelp("");
    setDraftRequired(false);
    setError("");
    setCreatedFormId(null);
  };

  const removeCustomQuestion = (id: string) => {
    setCustomTextQuestions((prev) => prev.filter((q) => q.id !== id));
    setIncluded((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCreatedFormId(null);
  };

  const selectedQuestions = useMemo(() => {
    return mergedQuestions.filter((q) => included[q.id]);
  }, [mergedQuestions, included]);

  const hasArtworkContext = trimmedArtworkId.length > 0;

  const handleCreate = async () => {
    setError("");
    setCreatedFormId(null);

    const token = getClientAuthToken();
    if (!token) {
      setError("Please log in first.");
      return;
    }

    if (!trimmedArtworkId) {
      setError(
        "This step needs an artwork from upload. Use Upload, then you will land here automatically."
      );
      return;
    }

    if (selectedQuestions.length === 0) {
      setError("Select at least one question to include.");
      return;
    }

    const payload = mapFeedbackQuestionsToCreatePayload(selectedQuestions);

    try {
      setSubmitting(true);
      const existingForm = await fetchFeedbackFormByArtworkId(
        trimmedArtworkId,
        token
      );
      if (existingForm?._id) {
        const existingId = String(existingForm._id);
        setCreatedFormId(existingId);
        try {
          localStorage.setItem(`artport_form_for_${trimmedArtworkId}`, existingId);
        } catch {}
        router.replace(`/post/${encodeURIComponent(trimmedArtworkId)}`);
        return;
      }

      const created = await createFeedbackForm(trimmedArtworkId, payload, token);
      const createdId = String(created._id);
      setCreatedFormId(createdId);
      try {
        localStorage.setItem(`artport_form_for_${trimmedArtworkId}`, createdId);
      } catch {}
      router.replace(`/post/${encodeURIComponent(trimmedArtworkId)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not create form.");
    } finally {
      setSubmitting(false);
    }
  };

  const pageTitle =
    config.selectPageTitle ?? "Customize your feedback form";
  const answerCap = TEXT_LIMITS.feedbackTextAnswer;
  return (
    <div>
      <h1 className={styles.pageTitle}>{pageTitle}</h1>

      <section className={styles.customBuilder} aria-label="Add custom text question">
        <h2 className={styles.customBuilderTitle}>Add a custom text question</h2>
        <p className={styles.customBuilderHint}>
          Define the question and optional help text. Respondents get a text box
          with a {answerCap}-character limit.
        </p>
        <div className={styles.customBuilderFields}>
          <label className={styles.fieldLabel}>
            Question
            <input
              type="text"
              className={styles.fieldInput}
              value={draftLabel}
              maxLength={TEXT_LIMITS.feedbackQuestionLabel}
              onChange={(e) =>
                setDraftLabel(
                  sanitizeSingleLineText(
                    e.target.value,
                    TEXT_LIMITS.feedbackQuestionLabel
                  )
                )
              }
              placeholder="e.g. What stands out to you first?"
              autoComplete="off"
            />
          </label>
          <label className={styles.fieldLabel}>
            Help <span className={styles.optionalMark}>(optional)</span>
            <textarea
              className={styles.fieldTextarea}
              value={draftHelp}
              rows={3}
              maxLength={TEXT_LIMITS.feedbackQuestionHelp}
              onChange={(e) =>
                setDraftHelp(
                  sanitizeMultilineText(
                    e.target.value,
                    TEXT_LIMITS.feedbackQuestionHelp
                  )
                )
              }
              placeholder="Shown in the help panel next to the question"
            />
          </label>
          <label className={styles.requiredRow}>
            <input
              type="checkbox"
              className={styles.requiredCheckbox}
              checked={draftRequired}
              onChange={(e) => setDraftRequired(e.target.checked)}
            />
            <span>Required answer</span>
          </label>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={addCustomTextQuestion}
          >
            Add text question
          </button>
        </div>
      </section>

      <div className={styles.questions}>
        {mergedQuestions.map((q) => (
          <QuestionPreviewRow
            key={q.id}
            q={q}
            included={included[q.id] !== false}
            onIncludedChange={(checked) => toggleInclude(q.id, checked)}
            onRemove={
              customIds.has(q.id)
                ? () => removeCustomQuestion(q.id)
                : undefined
            }
            answerCharLimit={answerCap}
          />
        ))}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      {createdFormId ? (
        <p className={styles.success} role="status">
          Form created.{" "}
          <Link href={`/feedback?formId=${createdFormId}`}>
            Open feedback page for this form
          </Link>
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={submitting || !hasArtworkContext}
          onClick={handleCreate}
        >
          {submitting ? "Creating…" : "Create feedback form"}
        </button>
      </div>
    </div>
  );
}

function QuestionPreviewRow({
  q,
  included,
  onIncludedChange,
  onRemove,
  answerCharLimit,
}: {
  q: FeedbackQuestion;
  included: boolean;
  onIncludedChange: (checked: boolean) => void;
  onRemove?: () => void;
  answerCharLimit: number;
}) {
  return (
    <div
      className={`${styles.questionBox} ${!included ? styles.questionBoxMuted : ""}`}
    >
      <div className={styles.includeCol}>
        <label className={styles.includeLabel}>
          <input
            type="checkbox"
            className={styles.includeCheckbox}
            checked={included}
            onChange={(e) => onIncludedChange(e.target.checked)}
            aria-label={`Include: ${q.label}`}
          />
        </label>
      </div>
      <div className={styles.previewCol}>
        <QuestionPreview q={q} answerCharLimit={answerCharLimit} />
      </div>
      {onRemove ? (
        <div className={styles.removeCol}>
          <button
            type="button"
            className={styles.removeBtn}
            onClick={onRemove}
            aria-label={`Remove custom question: ${q.label}`}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}

function QuestionPreview({
  q,
  answerCharLimit,
}: {
  q: FeedbackQuestion;
  answerCharLimit: number;
}) {
  if (q.type === "rating") {
    return (
      <QuestionField label={q.label} detail={q.detail} required={q.required}>
        <RatingScale
          name={`preview-${q.id}`}
          value=""
          onChange={() => {}}
          min={q.min ?? 1}
          max={q.max ?? 5}
          stepLabels={q.stepLabels}
          disabled
        />
      </QuestionField>
    );
  }

  if (q.type === "checkbox") {
    return (
      <QuestionField label={q.label} detail={q.detail} required={q.required}>
        {q.options.map((opt) => (
          <CheckboxOption
            key={opt.value}
            id={`preview-${q.id}-${opt.value}`}
            name={`preview-${q.id}`}
            value={opt.value}
            label={opt.label}
            checked={false}
            onChange={() => {}}
            disabled
          />
        ))}
      </QuestionField>
    );
  }

  if (q.type === "radio") {
    return (
      <QuestionField label={q.label} detail={q.detail} required={q.required}>
        {q.options.map((opt) => (
          <RadioOption
            key={opt.value}
            id={`preview-${q.id}-${opt.value}`}
            name={`preview-${q.id}`}
            value={opt.value}
            label={opt.label}
            checked={false}
            onChange={() => {}}
            disabled
          />
        ))}
      </QuestionField>
    );
  }

  if (q.type === "text") {
    return (
      <QuestionField label={q.label} detail={q.detail} required={q.required}>
        <FeedbackTextAnswer
          value=""
          readOnly
          disabled
          maxLength={answerCharLimit}
          showCounter={false}
          ariaHidden
          placeholder={`Answer (max ${answerCharLimit} characters)`}
        />
        <p className={styles.previewTextHint}>
          Answers are limited to {answerCharLimit} characters.
        </p>
      </QuestionField>
    );
  }

  return null;
}
