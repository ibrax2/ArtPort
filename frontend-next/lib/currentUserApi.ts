import { apiFetch } from "@/lib/apiClient";
import { getClientAuthToken } from "@/lib/authSession";

export type CurrentUserProfile = {
  _id?: string;
  username?: string;
  email?: string;
  bio?: string;
  profilePictureUrl?: string;
  bannerPictureUrl?: string;
};

export async function fetchCurrentUser(
  token?: string | null
): Promise<CurrentUserProfile | null> {
  const authToken = token || getClientAuthToken();

  try {
    const res = await apiFetch("/api/users/me", {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json().catch(() => null)) as
      | CurrentUserProfile
      | null;
    if (!data || typeof data !== "object") {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
