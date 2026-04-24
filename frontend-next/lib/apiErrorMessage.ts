type ApiErrorPayload = {
  code?: string;
  message?: string;
};

const CODE_TO_MESSAGE: Record<string, string> = {
  USERNAME_ASCII_ONLY:
    "Username must use English letters, numbers, and underscores only.",
  USERNAME_PROFANITY:
    "Username contains inappropriate language. Please choose a different one.",
  BIO_PROFANITY:
    "Bio contains inappropriate language. Please rephrase it.",
  ARTWORK_TITLE_PROFANITY:
    "Title contains inappropriate language. Please rephrase it.",
  ARTWORK_DESCRIPTION_PROFANITY:
    "Description contains inappropriate language. Please rephrase it.",
  FOLDER_NAME_PROFANITY:
    "Folder name contains inappropriate language. Please rephrase it.",
  FEEDBACK_QUESTION_PROFANITY:
    "A feedback question contains inappropriate language. Please rephrase it.",
  FEEDBACK_DETAIL_PROFANITY:
    "A feedback help text contains inappropriate language. Please rephrase it.",
  FEEDBACK_OPTION_PROFANITY:
    "A feedback option contains inappropriate language. Please rephrase it.",
  FEEDBACK_TEXT_PROFANITY:
    "Your feedback text contains inappropriate language. Please rephrase it.",
};

export function getApiErrorMessage(
  payload: ApiErrorPayload | null | undefined,
  fallback: string,
): string {
  if (!payload) {
    return fallback;
  }

  const code =
    typeof payload.code === "string" ? payload.code.trim().toUpperCase() : "";

  if (code && CODE_TO_MESSAGE[code]) {
    return CODE_TO_MESSAGE[code];
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
}
