export type FeedbackOption = {
  value: string;
  label: string;
};

type FeedbackQuestionBase = {
  id: string;
  label: string;
  detail?: string;
  required?: boolean;
};

export type FeedbackQuestionRating = FeedbackQuestionBase & {
  type: "rating";
  min?: number;
  max?: number;
  stepLabels?: string[];
};

export type FeedbackQuestionCheckbox = FeedbackQuestionBase & {
  type: "checkbox";
  options: FeedbackOption[];
};

export type FeedbackQuestionRadio = FeedbackQuestionBase & {
  type: "radio";
  options: FeedbackOption[];
};

export type FeedbackQuestion =
  | FeedbackQuestionRating
  | FeedbackQuestionCheckbox
  | FeedbackQuestionRadio;

export type FeedbackFormConfig = {
  schemaVersion: number;
  title: string;
  description?: string;
  questions: FeedbackQuestion[];
};
