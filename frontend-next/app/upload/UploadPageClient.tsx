"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import UploadCard from "@/components/uploadcard";
import { apiFetch } from "@/lib/apiClient";
import { fetchCurrentUser } from "@/lib/currentUserApi";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";

export default function UploadPageClient() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser().then((user) => {
      if (cancelled || !user?._id) return;
      setUserId(String(user._id));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const onUpload = async (formData: FormData) => {
    const res = await apiFetch("/api/artworks", {
      method: "POST",
      body: formData,
    });
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      _id?: string;
    };
    if (!res.ok) {
      throw new Error(getApiErrorMessage(data, "Upload failed"));
    }
    const id = data._id;
    if (!id) {
      throw new Error("Upload succeeded but no artwork id was returned.");
    }
    router.push(
      `/feedback/select?artworkId=${encodeURIComponent(String(id))}`
    );
  };

  return (
    <main className="upload-route">
      <h1> Upload page </h1>
      <UploadCard onUpload={onUpload} userId={userId} />
    </main>
  );
}
