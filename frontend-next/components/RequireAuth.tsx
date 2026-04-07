"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let shouldRedirect = false;

    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");

    if (!token || !rawUser) {
      shouldRedirect = true;
    } else {
      const user = JSON.parse(rawUser) as StoredUser;
      if (!user._id || isJwtExpired(token)) {
        shouldRedirect = true;
      }
    }

    if (shouldRedirect) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setIsAuthed(false);
      setIsLoading(false);
      router.replace("/login");
      return;
    }

    setIsAuthed(true);
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return null;
  }

  if (!isAuthed) {
    return null;
  }

  return <>{children}</>;
}
