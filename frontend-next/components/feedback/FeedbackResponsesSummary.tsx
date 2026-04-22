"use client";

import { useMemo } from "react";

import type { FeedbackFormConfig } from "@/types/feedback";
import type { ApiFeedbackResponseQuestion } from "@/lib/feedbackApi";
import {
  buildFeedbackSummaryBlocks,
  type FeedbackSummaryBlock,
} from "@/lib/feedbackResponseSummary";

import styles from "./FeedbackResponsesSummary.module.css";

const PIE_COLORS = [
  "#9a846a",
  "#f29f41",
  "#c9b297",
  "#7c9a6e",
  "#6b8cae",
  "#b87a9c",
  "#5a6d4a",
  "#d4a574",
];

type ResponseRow = {
  form: { questions: ApiFeedbackResponseQuestion[] };
};

export type FeedbackResponsesSummaryProps = {
  responses: ResponseRow[];
  feedbackConfig?: FeedbackFormConfig;
};

function conicFromFractions(
  parts: { color: string; fraction: number }[]
): string {
  let angle = 0;
  const stops: string[] = [];
  for (const p of parts) {
    if (p.fraction <= 0) continue;
    const start = angle;
    angle += p.fraction * 360;
    stops.push(`${p.color} ${start}deg ${angle}deg`);
  }
  if (stops.length === 0) return "#ede4d8";
  return `conic-gradient(${stops.join(", ")})`;
}

function PieChartCard({
  title,
  optionCounts,
}: {
  title: string;
  optionCounts: { label: string; order: number; count: number }[];
}) {
  const total = optionCounts.reduce((s, o) => s + o.count, 0);
  const withFrac = optionCounts
    .filter((o) => o.count > 0)
    .map((o, i) => ({
      ...o,
      color: PIE_COLORS[i % PIE_COLORS.length],
      fraction: total > 0 ? o.count / total : 0,
    }));

  const background =
    withFrac.length === 0
      ? "#ede4d8"
      : conicFromFractions(
          withFrac.map((o) => ({ color: o.color, fraction: o.fraction }))
        );

  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <p className={styles.chartSubtitle}>Share of answers (single choice)</p>
      {total === 0 ? (
        <p className={styles.pieEmpty}>No selections for this question yet.</p>
      ) : (
        <div className={styles.pieRow}>
          <div
            className={styles.pieDisk}
            style={{ background }}
            role="img"
            aria-label={`Pie chart for ${title}: ${withFrac
              .map((o) => `${o.label} ${Math.round(o.fraction * 100)}%`)
              .join(", ")}`}
          />
          <div className={styles.pieLegend}>
            {withFrac.map((o) => (
              <div key={o.order} className={styles.pieLegendItem}>
                <span
                  className={styles.pieSwatch}
                  style={{ background: o.color }}
                />
                <span>{o.label}</span>
                <span className={styles.piePct}>
                  {o.count} ({Math.round(o.fraction * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BarChartCard({
  title,
  subtitle,
  optionCounts,
  className,
}: {
  title: string;
  subtitle: string;
  optionCounts: { label: string; order: number; count: number }[];
  className?: string;
}) {
  const max = Math.max(1, ...optionCounts.map((o) => o.count));
  return (
    <div className={`${styles.chartCard} ${className ?? ""}`}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <p className={styles.chartSubtitle}>{subtitle}</p>
      <div className={styles.barRows}>
        {optionCounts.map((o) => (
          <div key={o.order} className={styles.barRow}>
            <p className={styles.barLabel}>{o.label}</p>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${(o.count / max) * 100}%` }}
              />
            </div>
            <span className={styles.barCount}>{o.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingBarsCard({ block }: { block: Extract<FeedbackSummaryBlock, { kind: "rating" }> }) {
  const entries: { value: number; count: number }[] = [];
  for (let v = block.min; v <= block.max; v += 1) {
    entries.push({ value: v, count: block.counts[v] ?? 0 });
  }
  const max = Math.max(1, ...entries.map((e) => e.count));
  return (
    <div className={`${styles.chartCard} ${styles.ratingBars}`}>
      <h3 className={styles.chartTitle}>{block.title}</h3>
      <p className={styles.chartSubtitle}>Number of responses per rating</p>
      <div className={styles.barRows}>
        {entries.map((e) => (
          <div key={e.value} className={styles.barRow}>
            <p className={styles.ratingTick}>{e.value}</p>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${(e.count / max) * 100}%` }}
              />
            </div>
            <span className={styles.barCount}>{e.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TextSummaryCard({
  block,
}: {
  block: Extract<FeedbackSummaryBlock, { kind: "text" }>;
}) {
  return (
    <div className={styles.chartCard}>
      <h3 className={styles.chartTitle}>{block.title}</h3>
      <p className={styles.chartSubtitle}>
        {block.values.length} written answer
        {block.values.length === 1 ? "" : "s"} (anonymous; not shown in charts)
      </p>
      {block.values.length === 0 ? (
        <p className={styles.pieEmpty}>No written answers yet.</p>
      ) : (
        <div className={styles.textBlock}>
          <div className={styles.textScroll}>
            <ul className={styles.textList}>
              {block.values.map((t, i) => (
                <li key={`${block.questionId}-t-${i}`}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function renderBlock(block: FeedbackSummaryBlock) {
  switch (block.kind) {
    case "rating":
      return <RatingBarsCard key={block.questionId} block={block} />;
    case "mcqPie":
      return (
        <PieChartCard
          key={block.questionId}
          title={block.title}
          optionCounts={block.optionCounts}
        />
      );
    case "mcqBars":
      return (
        <BarChartCard
          key={block.questionId}
          title={block.title}
          subtitle="Times each option was chosen (multi-select counts separately)"
          optionCounts={block.optionCounts}
        />
      );
    case "text":
      return <TextSummaryCard key={block.questionId} block={block} />;
    default:
      return null;
  }
}

export default function FeedbackResponsesSummary({
  responses,
  feedbackConfig,
}: FeedbackResponsesSummaryProps) {
  const blocks = useMemo(
    () => buildFeedbackSummaryBlocks(responses, feedbackConfig),
    [responses, feedbackConfig]
  );

  if (responses.length === 0 || blocks.length === 0) {
    return null;
  }

  return (
    <section className={styles.wrap} aria-label="Feedback summary">
      <p className={styles.intro}>
        <span className={styles.totalBadge}>
          {responses.length} response{responses.length === 1 ? "" : "s"}
        </span>{" "}
        — ratings and multiple-choice answers are combined below as charts.
        Checkbox-style questions use bar charts; single-choice questions use
        pie charts. Text answers are listed separately and are not tied to
        individual respondents.
      </p>
      {blocks.map(renderBlock)}
    </section>
  );
}
