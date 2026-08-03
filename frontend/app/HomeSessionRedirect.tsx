"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getRememberedLoginRedirectPath } from "@/lib/session";

export default function HomeSessionRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectPath = getRememberedLoginRedirectPath();
    if (redirectPath) {
      router.replace(redirectPath);
    }
  }, [router]);

  return null;
}
