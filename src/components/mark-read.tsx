"use client";

import { useEffect } from "react";
import { markRead } from "@/app/familia/actions";

export function MarkRead({ id }: { id: string }) {
  useEffect(() => {
    markRead(id).catch(() => {});
  }, [id]);
  return null;
}
