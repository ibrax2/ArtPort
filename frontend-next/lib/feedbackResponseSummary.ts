import type { ApiFeedbackResponseQuestion } from "@/lib/feedbackApi";
import type { FeedbackFormConfig } from "@/types/feedback";

export type RatingSummaryBlock = {
  kind: "rating";
  questionId: string;
  title: string;
  min: number;
  max: number;
  counts: Record<number, number>;
};

export type McqPieSummaryBlock = {
  kind: "mcqPie";
  questionId: string;
  title: string;
  optionCounts: { label: string; order: number; count: number }[];
};

export type McqBarsSummaryBlock = {
  kind: "mcqBars";
  questionId: string;
  title: string;
  optionCounts: { label: string; order: number; count: number }[];
};

export type TextSummaryBlock = {
  kind: "text";
  questionId: string;
  title: string;
  values: string[];
};

export type FeedbackSummaryBlock =
  | RatingSummaryBlock
  | McqPieSummaryBlock
  | McqBarsSummaryBlock
  | TextSummaryBlock;

type ResponseRow = {
  form: { questions: ApiFeedbackResponseQuestion[] };
};

function sortedTemplateQuestions(first: ResponseRow): ApiFeedbackResponseQuestion[] {
  return [...first.form.questions].sort((a, b) => a.order - b.order);
}

function configQuestionFor(
  config: FeedbackFormConfig | undefined,
  questionId: string
) {
  return config?.questions.find((q) => q.id === questionId);
}

export function buildFeedbackSummaryBlocks(
  responses: ResponseRow[],
  feedbackConfig?: FeedbackFormConfig
): FeedbackSummaryBlock[] {
  if (responses.length === 0) return [];

  const template = sortedTemplateQuestions(responses[0]);
  const blocks: FeedbackSummaryBlock[] = [];

  for (const tq of template) {
    if (tq.type === "rating") {
      const counts: Record<number, number> = {};
      let min = Infinity;
      let max = -Infinity;
      for (const r of responses) {
        const q = r.form.questions.find((x) => x._id === tq._id);
        const val = q?.ratingSelection;
        if (typeof val !== "number" || !Number.isFinite(val)) continue;
        counts[val] = (counts[val] ?? 0) + 1;
        min = Math.min(min, val);
        max = Math.max(max, val);
      }
      if (min === Infinity) continue;
      blocks.push({
        kind: "rating",
        questionId: tq._id,
        title: tq.question,
        min,
        max,
        counts,
      });
      continue;
    }

    if (tq.type === "text") {
      const values: string[] = [];
      for (const r of responses) {
        const q = r.form.questions.find((x) => x._id === tq._id);
        const t = q?.textValue?.trim();
        if (t) values.push(t);
      }
      blocks.push({
        kind: "text",
        questionId: tq._id,
        title: tq.question,
        values,
      });
      continue;
    }

    if (tq.type === "mcq") {
      const optionCounts = new Map<
        number,
        { label: string; order: number; count: number }
      >();
      let anyMulti = false;

      for (const r of responses) {
        const q = r.form.questions.find((x) => x._id === tq._id);
        if (!q) continue;
        const selected = q.options.filter((o) => o.selected);
        if (selected.length > 1) anyMulti = true;
        for (const o of selected) {
          const cur = optionCounts.get(o.order) ?? {
            label: o.option,
            order: o.order,
            count: 0,
          };
          cur.count += 1;
          optionCounts.set(o.order, cur);
        }
      }

      for (const o of tq.options) {
        if (!optionCounts.has(o.order)) {
          optionCounts.set(o.order, {
            label: o.option,
            order: o.order,
            count: 0,
          });
        }
      }

      const arr = [...optionCounts.values()].sort((a, b) => a.order - b.order);
      const cfgQ = configQuestionFor(feedbackConfig, tq._id);
      const useBars =
        cfgQ?.type === "checkbox" ||
        anyMulti ||
        (cfgQ == null && anyMulti);

      if (useBars) {
        blocks.push({
          kind: "mcqBars",
          questionId: tq._id,
          title: tq.question,
          optionCounts: arr,
        });
      } else {
        blocks.push({
          kind: "mcqPie",
          questionId: tq._id,
          title: tq.question,
          optionCounts: arr,
        });
      }
    }
  }

  return blocks;
}
