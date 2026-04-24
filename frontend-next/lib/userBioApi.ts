import { apiFetch } from "@/lib/apiClient";
import { getClientAuthToken } from "@/lib/authSession";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";

export async function patchUserBio(
  userId: string,
  bio: string,
  token?: string | null
): Promise<{ bio?: string }> {
  const auth = token ?? getClientAuthToken();
  const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: auth ? { Authorization: `Bearer ${auth}` } : {},
    body: JSON.stringify({ bio }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    message?: string;
    bio?: string;
  };

  if (!res.ok) {
    throw new Error(getApiErrorMessage(data, "Could not save bio"));
  }

  return data;
}
