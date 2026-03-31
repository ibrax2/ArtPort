import FeedbackFormCard from "@/components/feedback/FeedbackFormCard";
import feedbackConfig from "@/data/feedback-questions.json";
import type { FeedbackFormConfig } from "@/types/feedback";

import styles from "./feedback.module.css";

const config = feedbackConfig as FeedbackFormConfig;

export default function FeedbackPage() {
  return (
    <main className={styles.main}>
      <FeedbackFormCard config={config} />
    </main>
  );
}
