import { Suspense } from "react";

import PostPageClient from "./PostPageClient";

export default async function PostPage({
  params,
}: {
  params: Promise<{ artworkid: string }>;
}) {
  const { artworkid } = await params;
  return (
    <Suspense
      fallback={
        <p style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>Loading…</p>
      }
    >
      <PostPageClient key={artworkid} segment={artworkid} />
    </Suspense>
  );
}
