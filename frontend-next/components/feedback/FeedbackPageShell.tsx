"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import FeedbackFormCard from "@/components/feedback/FeedbackFormCard";
import feedbackConfig from "@/data/feedback-questions.json";
import {
  fetchFeedbackForm,
  mapApiFormToConfig,
} from "@/lib/feedbackApi";
import { getClientAuthToken } from "@/lib/authSession";
import type { FeedbackFormConfig } from "@/types/feedback";

import styles from "@/app/feedback/feedback.module.css";

const staticConfig = feedbackConfig as FeedbackFormConfig;

function FeedbackPageLoader({ formId }: { formId: string }) {
  const initialLoading = Boolean(formId);

  const [apiConfig, setApiConfig] = useState<FeedbackFormConfig | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(initialLoading);

  useEffect(() => {
    if (!formId) {
      return;
    }

    let cancelled = false;

    const token = getClientAuthToken();

    fetchFeedbackForm(formId, token)
      .then((form) => {
        if (cancelled) return;
        setApiConfig(mapApiFormToConfig(form));
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message || "Could not load form");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formId]);

  if (formId && loading) {
    return (
      <main className={styles.main}>
        <p>Loading feedback form…</p>
      </main>
    );
  }

  if (formId && loadError) {
    return (
      <main className={styles.main}>
        <p style={{ color: "#b91c1c" }}>{loadError}</p>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.8 }}>
          You must be logged in as the form owner to load this form for now, or
          check the form id. Open{" "}
          <code style={{ fontSize: 13 }}>/feedback</code> without{" "}
          <code style={{ fontSize: 13 }}>formId</code> to use the local demo
          form.
        </p>
      </main>
    );
  }

  if (formId && apiConfig) {
    return (
      <main className={styles.main}>
        <FeedbackFormCard config={apiConfig} remoteFormId={formId} />
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <FeedbackFormCard config={staticConfig} />
    </main>
  );
}

function FeedbackPageInner() {
  const searchParams = useSearchParams();
  const formId = searchParams.get("formId")?.trim() || "";

  return <FeedbackPageLoader key={formId || "local"} formId={formId} />;
}

export default function FeedbackPageShell() {
  return (
    <Suspense
      fallback={
        <main className={styles.main}>
          <p>Loading…</p>
        </main>
      }
    >
      <FeedbackPageInner />
    </Suspense>
  );
}
