import type { FeedbackFormConfig } from "@/types/feedback";

import classicJson from "./feedback-questions.json";

export type FeedbackTemplateOption = {
  id: string;
  name: string;
  blurb: string;
  config: FeedbackFormConfig;
};

const classic = classicJson as FeedbackFormConfig;

const quickPoll: FeedbackFormConfig = {
  schemaVersion: 1,
  title: "quick poll",
  description: "Fast feedback with ratings and one short text.",
  selectPageTitle: "Customize your feedback form",
  selectPageHint:
    "Select a predesigned feedback form or create a custom feedback form.",
  questions: [
    {
      id: "qp_overall",
      type: "rating",
      label: "Overall, how much do you like this piece?",
      detail: "1 = not for me, 5 = love it",
      required: true,
      min: 1,
      max: 5,
      stepLabels: ["1", "2", "3", "4", "5"],
    },
    {
      id: "qp_would_share",
      type: "radio",
      label: "Would you recommend this to a friend?",
      required: false,
      options: [
        { value: "yes", label: "Yes" },
        { value: "maybe", label: "Maybe" },
        { value: "no", label: "No" },
      ],
    },
    {
      id: "qp_one_word",
      type: "text",
      label: "One word to describe it?",
      detail: "Max 140 characters.",
      required: false,
    },
  ],
};

const deepCritique: FeedbackFormConfig = {
  schemaVersion: 1,
  title: "critique",
  description: "Structured critique for serious feedback sessions.",
  selectPageTitle: "Customize your feedback form",
  selectPageHint:
    "Select a predesigned feedback form or create a custom feedback form.",
  questions: [
    {
      id: "crit_strength",
      type: "checkbox",
      label: "What is working well?",
      required: false,
      options: [
        { value: "concept", label: "Concept / idea" },
        { value: "technique", label: "Technique" },
        { value: "palette", label: "Color / value" },
        { value: "composition", label: "Composition" },
      ],
    },
    {
      id: "crit_priority",
      type: "radio",
      label: "Biggest area to push next?",
      required: true,
      options: [
        { value: "refs", label: "Reference & observation" },
        { value: "fundamentals", label: "Fundamentals" },
        { value: "finish", label: "Finish & presentation" },
      ],
    },
    {
      id: "crit_notes",
      type: "text",
      label: "Concrete suggestion (optional)",
      detail: "140 characters.",
      required: false,
    },
  ],
};

const minimal: FeedbackFormConfig = {
  schemaVersion: 1,
  title: "minimal",
  description: "Just a rating and a short comment.",
  selectPageTitle: "Customize your feedback form",
  selectPageHint:
    "Select a predesigned feedback form or create a custom feedback form.",
  questions: [
    {
      id: "min_rating",
      type: "rating",
      label: "Rate this artwork",
      required: true,
      min: 1,
      max: 5,
    },
    {
      id: "min_comment",
      type: "text",
      label: "Anything else?",
      required: false,
    },
  ],
};

export const FEEDBACK_FORM_TEMPLATES: FeedbackTemplateOption[] = [
  {
    id: "classic",
    name: "Full artwork feedback",
    blurb: "Ratings, checkboxes, choices, and short text — the default set.",
    config: classic,
  },
  {
    id: "quick",
    name: "Quick poll",
    blurb: "One overall rating, yes/maybe/no, and a one-line text.",
    config: quickPoll,
  },
  {
    id: "critique",
    name: "Critique",
    blurb: "Strengths, priority focus, and a short suggestion.",
    config: deepCritique,
  },
  {
    id: "minimal",
    name: "Minimal",
    blurb: "Only a star-style rating and optional comment.",
    config: minimal,
  },
];

export const DEFAULT_FEEDBACK_TEMPLATE_ID = FEEDBACK_FORM_TEMPLATES[0].id;
