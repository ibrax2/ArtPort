import UserProfileClient from "./UserProfileClient";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <UserProfileClient usernameParam={username} />;
}
