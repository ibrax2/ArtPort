import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
  <main>
    <h1> ArtPort </h1>
    <p> version1 of website </p>
    
    <Link href = "/user_profile">
      <button> Go to User Profile </button>
    </Link>
  </main>
  );
}
