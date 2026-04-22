"use client";

import { usePathname } from "next/navigation";

import Navbar from "@/components/Navbar";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideNavbar = pathname === "/login";

  return (
    <>
      {!hideNavbar ? <Navbar /> : null}
      <main style={{ paddingTop: !hideNavbar ? '60px' : '0' }}>
        {children}
      </main>
    </>
  );
}
