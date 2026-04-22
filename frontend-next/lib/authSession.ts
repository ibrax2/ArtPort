const TOKEN_COOKIE_NAME = "artport_token";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

type StoredUser = {
  _id?: string;
  username?: string;
  email?: string;
};

function cookieSuffix(): string {
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return "; Secure";
  }
  return "";
}

export function setAuthTokenCookie(token: string): void {
  if (!token || typeof document === "undefined") {
    return;
  }

  document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${THIRTY_DAYS_SECONDS}; SameSite=Lax${cookieSuffix()}`;
}

export function clearAuthTokenCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax${cookieSuffix()}`;
}

export function getAuthTokenFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const prefix = `${TOKEN_COOKIE_NAME}=`;
  const raw = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!raw) {
    return null;
  }

  try {
    return decodeURIComponent(raw.slice(prefix.length));
  } catch {
    return null;
  }
}

export function getClientAuthToken(): string | null {
  if (typeof window !== "undefined") {
    const fromStorage = localStorage.getItem("token");
    if (fromStorage) {
      return fromStorage;
    }
  }

  return getAuthTokenFromCookie();
}

export function persistAuthSession(token: string, user: StoredUser): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem("token", token);
  localStorage.setItem(
    "user",
    JSON.stringify({
      _id: user._id,
      username: user.username,
      email: user.email,
    })
  );
  setAuthTokenCookie(token);
}

export function clearAuthSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
  clearAuthTokenCookie();
}
