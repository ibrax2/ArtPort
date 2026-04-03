import UserProfileClient from "./UserProfileClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/api/users`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return [];
    }

    const users = (await res.json().catch(() => [])) as Array<{
      username?: string;
    }>;

    return users
      .map((user) => user.username?.trim())
      .filter((username): username is string => Boolean(username))
      .map((username) => ({ username }));
  } catch {
    return [];
  }
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <UserProfileClient usernameParam={username} />;
}
