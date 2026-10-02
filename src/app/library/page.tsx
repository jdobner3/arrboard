"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Opens whichever library was used last.
export default function LibraryIndex() {
  const router = useRouter();
  useEffect(() => {
    let kind = "shows";
    try {
      const saved = localStorage.getItem("library-kind");
      if (saved === "movies" || saved === "music") kind = saved;
    } catch {}
    router.replace(`/library/${kind}`);
  }, [router]);
  return null;
}
