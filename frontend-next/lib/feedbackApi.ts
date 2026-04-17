import type {
  FeedbackFormConfig,
  FeedbackQuestion,
} from "@/types/feedback";
import { getClientAuthToken } from "@/lib/authSession";
import { sanitizeMultilineText, TEXT_LIMITS } from "@/lib/textInput";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export type ApiFeedbackFormQuestion = {
  _id: string;
  question: string;
  type: "mcq" | "rating" | "text";
  order: number;
  allowMultipleSelections: boolean | null;
  rating: { ratingMin: number; ratingMax: number } | null;
  options: { _id: string; order: number; option: string }[];
};

export type ApiFeedbackForm = {
  _id: string;
  artworkId: string;
  createdBy: string;
  questions: ApiFeedbackFormQuestion[];
};

export type ApiFeedbackResponseQuestion = {
  _id: string;
  question: string;
  type: "mcq" | "rating" | "text";
  order: number;
  options: { _id: string; order: number; option: string; selected: boolean }[];
  selectedOptionOrders: number[];
  ratingSelection: number | null;
  textValue: string | null;
};

export type ApiFeedbackResponse = {
  _id: string;
  feedbackId: string;
  userId: string;
  username?: string | null;
  createdAt?: string;
  form: {
    questions: ApiFeedbackResponseQuestion[];
  };
};

function authHeaders(token: string | null): HeadersInit {
  const resolvedToken = token || getClientAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;
  return headers;
}

function authFetchOptions(token: string | null): RequestInit {
  return {
    headers: authHeaders(token),
    credentials: "include",
  };
}

export async function fetchFeedbackForm(
  formId: string,
  token: string | null
): Promise<ApiFeedbackForm> {
  const res = await fetch(`${API_URL}/api/feedbackForm/${formId}`, {
    ...authFetchOptions(token),
  });
  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
  } & Partial<ApiFeedbackForm>;

  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to load form"
    );
  }

  if (!data._id || !Array.isArray(data.questions)) {
    throw new Error("Invalid form response");
  }

  return data as ApiFeedbackForm;
}

/**
 * GET /api/feedbackForm?artworkId=<id>
 * Returns the most recent feedback form for the artwork, or null if none / auth fails.
 */
export async function fetchFeedbackFormByArtworkId(
  artworkId: string,
  token: string | null
): Promise<ApiFeedbackForm | null> {
  if (!artworkId) return null;
  try {
    const res = await fetch(
      `${API_URL}/api/feedbackForm?artworkId=${encodeURIComponent(artworkId)}`,
      authFetchOptions(token)
    );
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as unknown;
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0] as Partial<ApiFeedbackForm>;
    if (!first._id || !Array.isArray(first.questions)) return null;
    return first as ApiFeedbackForm;
  } catch {
    return null;
  }
}

export function mapApiFormToConfig(form: ApiFeedbackForm): FeedbackFormConfig {
  const sorted = [...form.questions].sort((a, b) => a.order - b.order);

  const questions: FeedbackQuestion[] = sorted.map((q) => {
    if (q.type === "rating") {
      const r = q.rating;
      const min = r?.ratingMin ?? 1;
      const max = r?.ratingMax ?? 5;
      return {
        id: String(q._id),
        type: "rating",
        label: q.question,
        required: true,
        min,
        max,
      };
    }

    if (q.type === "text") {
      return {
        id: String(q._id),
        type: "text",
        label: q.question,
        required: false,
      };
    }

    const opts = [...q.options].sort((a, b) => a.order - b.order);
    const options = opts.map((o) => ({
      value: String(o.order),
      label: o.option,
    }));

    const multi = q.allowMultipleSelections !== false;
    return {
      id: String(q._id),
      type: multi ? "checkbox" : "radio",
      label: q.question,
      required: !multi,
      options,
    };
  });

  return {
    schemaVersion: 1,
    title: "Feedback",
    description: undefined,
    questions,
  };
}

export type ResponseAnswerPayload = {
  questionId: string;
  ratingSelection?: number;
  optionSelections?: { selection: number }[];
  textValue?: string;
};

export function buildResponseAnswers(
  config: FeedbackFormConfig,
  answers: Record<string, string | string[]>
): ResponseAnswerPayload[] {
  const out: ResponseAnswerPayload[] = [];

  for (const q of config.questions) {
    const raw = answers[q.id];

    if (q.type === "rating") {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) continue;
      const n = Number(s);
      if (!Number.isInteger(n)) continue;
      out.push({ questionId: q.id, ratingSelection: n });
      continue;
    }

    if (q.type === "text") {
      const s =
        typeof raw === "string"
          ? sanitizeMultilineText(raw, TEXT_LIMITS.feedbackText).trim()
          : "";
      if (!s) continue;
      out.push({ questionId: q.id, textValue: s });
      continue;
    }

    if (q.type === "radio") {
      const s = typeof raw === "string" ? raw.trim() : "";
      if (!s) continue;
      const order = Number(s);
      if (!Number.isInteger(order)) continue;
      out.push({
        questionId: q.id,
        optionSelections: [{ selection: order }],
      });
      continue;
    }

    if (q.type === "checkbox") {
      const list = Array.isArray(raw) ? raw : [];
      if (list.length === 0) continue;
      const selections = list
        .map((v) => Number(String(v).trim()))
        .filter((n) => Number.isInteger(n))
        .map((selection) => ({ selection }));
      if (selections.length === 0) continue;
      out.push({ questionId: q.id, optionSelections: selections });
    }
  }

  return out;
}

/** Body shape for POST /api/feedbackForm (matches server controller) */
export type CreateFeedbackFormQuestion = {
  question: string;
  type: "mcq" | "rating" | "text";
  order: number;
  rating?: { ratingMin: number; ratingMax: number };
  ratingMin?: number;
  ratingMax?: number;
  allowMultipleSelections?: boolean;
  options?: { option: string; order: number; Option?: string }[];
  Options?: { option: string; order: number; Option?: string }[];
};

export function mapFeedbackQuestionsToCreatePayload(
  questions: FeedbackQuestion[]
): CreateFeedbackFormQuestion[] {
  return questions.map((q, index) => {
    const order = index + 1;
    if (q.type === "rating") {
      return {
        question: q.label,
        type: "rating",
        order,
        rating: {
          ratingMin: q.min ?? 1,
          ratingMax: q.max ?? 5,
        },
      };
    }
    if (q.type === "text") {
      return {
        question: q.label,
        type: "text",
        order,
      };
    }
    const opts = q.options.map((o, i) => ({
      option: o.label,
      order: i + 1,
    }));
    return {
      question: q.label,
      type: "mcq",
      order,
      allowMultipleSelections: q.type === "checkbox",
      options: opts,
    };
  });
}

export async function createFeedbackForm(
  artworkId: string,
  questions: CreateFeedbackFormQuestion[],
  token: string | null
): Promise<ApiFeedbackForm> {
  const res = await fetch(`${API_URL}/api/feedbackForm`, {
    method: "POST",
    ...authFetchOptions(token),
    body: JSON.stringify({
      artworkId: artworkId,
      questions,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
  } & Partial<ApiFeedbackForm>;

  if (!res.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to create form"
    );
  }

  if (!data._id) {
    throw new Error("Invalid create form response");
  }

  return data as ApiFeedbackForm;
}

export async function submitFeedbackResponse(
  feedbackFormId: string,
  answersPayload: ResponseAnswerPayload[],
  token: string | null
): Promise<unknown> {
  const res = await fetch(`${API_URL}/api/response`, {
    method: "POST",
    ...authFetchOptions(token),
    body: JSON.stringify({
      feedbackFormId: feedbackFormId,
      answers: answersPayload,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      typeof (data as { message?: string }).message === "string"
        ? (data as { message: string }).message
        : "Submit failed";
    throw new Error(msg);
  }

  return data;
}

export async function fetchReceivedFeedbackResponses(
  feedbackFormId: string,
  token: string | null
): Promise<ApiFeedbackResponse[]> {
  if (!feedbackFormId) {
    return [];
  }

  const res = await fetch(
    `${API_URL}/api/response?feedbackFormId=${encodeURIComponent(feedbackFormId)}&ownerView=true`,
    authFetchOptions(token)
  );

  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok || !Array.isArray(data)) {
    return [];
  }

  return data as ApiFeedbackResponse[];
}
