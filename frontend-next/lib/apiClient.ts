import { apiUrl } from "@/lib/apiConfig";
import { getClientAuthToken } from "@/lib/authSession";

export type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch(
  path: string,
  init: ApiFetchOptions = {}
): Promise<Response> {
  const { auth = true, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders ?? undefined);

  if (auth) {
    const token = getClientAuthToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const body = rest.body;
  if (
    !headers.has("Content-Type") &&
    typeof body === "string" &&
    body.length > 0
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(apiUrl(path), {
    ...rest,
    headers,
    credentials: rest.credentials ?? "include",
  });
}
