"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import UploadCard from "@/components/uploadcard";
import { apiFetch } from "@/lib/apiClient";
import { fetchCurrentUser } from "@/lib/currentUserApi";
import { getApiErrorMessage } from "@/lib/apiErrorMessage";
import { fetchUserFolderTree } from "@/lib/folderApi";

type UploadFolderOption = {
  id: string;
  label: string;
  isPublic: boolean;
};

const normalizeFolderName = (value: string) => value.trim().toLowerCase();

function flattenFolderOptions(
  node: {
    _id: string;
    folderName: string;
    isPublic: boolean;
    subfolders: Array<{
      _id: string;
      folderName: string;
      isPublic: boolean;
      subfolders: unknown[];
    }>;
  },
  depth = 0,
): UploadFolderOption[] {
  const next: UploadFolderOption[] = [];
  for (const child of node.subfolders || []) {
    if (normalizeFolderName(child.folderName) !== "bookmarks") {
      next.push({
        id: String(child._id),
        label: `${"  ".repeat(depth)}${child.folderName}`,
        isPublic: Boolean(child.isPublic),
      });
    }

    next.push(
      ...flattenFolderOptions(
        {
          _id: String(child._id),
          folderName: child.folderName,
          isPublic: Boolean(child.isPublic),
          subfolders: Array.isArray(child.subfolders)
            ? (child.subfolders as Array<{
                _id: string;
                folderName: string;
                isPublic: boolean;
                subfolders: unknown[];
              }>)
            : [],
        },
        depth + 1,
      ),
    );
  }
  return next;
}

export default function UploadPageClient() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [folderOptions, setFolderOptions] = useState<UploadFolderOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser().then((user) => {
      if (cancelled || !user?._id) return;
      const id = String(user._id);
      setUserId(id);

      fetchUserFolderTree(id)
        .then((tree) => {
          if (cancelled || !tree) return;
          setFolderOptions(flattenFolderOptions(tree));
        })
        .catch(() => {
          if (!cancelled) setFolderOptions([]);
        });
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
      <UploadCard onUpload={onUpload} userId={userId} folderOptions={folderOptions} />
    </main>
  );
}
