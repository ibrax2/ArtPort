"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearAuthSession,
  getClientAuthToken,
  setAuthTokenCookie,
} from "@/lib/authSession";

type StoredUser = {
  _id?: string;
};

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return true;
    const payloadJson = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function getAuthenticatedUserIdFromStorage(): string | null {
  try {
    const token = getClientAuthToken();
    const rawUser = localStorage.getItem("user");

    if (!token || !rawUser || isJwtExpired(token)) {
      return null;
    }

    const user = JSON.parse(rawUser) as StoredUser;
    if (!user._id) {
      return null;
    }

    return String(user._id);
  } catch {
    return null;
  }
}

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      let shouldRedirect = false;

      const token = getClientAuthToken();
      const rawUser = localStorage.getItem("user");

      if (!token || !rawUser) {
        shouldRedirect = true;
      } else {
        const user = JSON.parse(rawUser) as StoredUser;
        if (!user._id || isJwtExpired(token)) {
          shouldRedirect = true;
        } else {
          setAuthTokenCookie(token);
        }
      }

      if (shouldRedirect) {
        clearAuthSession();
        setIsAuthed(false);
        setIsLoading(false);
        router.replace("/login");
        return;
      }

      setIsAuthed(true);
      setIsLoading(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  if (isLoading) {
    return null;
  }

  if (!isAuthed) {
    return null;
  }

  return <>{children}</>;
}
