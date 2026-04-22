import RequireAuth from "@/components/RequireAuth";
import UploadPageClient from "./UploadPageClient";

export default function UploadPage() {
  return (
    <RequireAuth>
      <UploadPageClient />
    </RequireAuth>
  );
}
