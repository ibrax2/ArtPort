import LoginCard from "../../components/logincard";

function safeReturnPath(next: string | undefined): string | undefined {
  if (!next || typeof next !== "string") return undefined;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return undefined;
  return t;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="login-page-main">
      <LoginCard redirectAfterLogin={safeReturnPath(next)} />
    </main>
  );
}
