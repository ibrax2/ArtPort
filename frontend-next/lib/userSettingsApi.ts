import { apiFetch } from "@/lib/apiClient";
import { getClientAuthToken } from "@/lib/authSession";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";

export type AccountSettingsUpdate = {
  username?: string;
  showEmailOnProfile?: boolean;
  isPrivate?: boolean;
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
};

export async function patchUserSettings(
  userId: string,
  payload: AccountSettingsUpdate,
  token?: string | null,
): Promise<Record<string, unknown>> {
  const auth = token ?? getClientAuthToken();
  const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
  } & Record<string, unknown>;

  if (!res.ok) {
    throw new Error(getApiErrorMessage(data, "Could not save settings"));
  }

  return data;
}