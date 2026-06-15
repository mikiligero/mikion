"use client";

import { useEffect, useState } from "react";
import { TemplatesDialog } from "./templates-dialog";

export const OPEN_TEMPLATES_EVENT = "mikion:templates";

export function TemplatesHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener(OPEN_TEMPLATES_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_TEMPLATES_EVENT, onOpen);
  }, []);
  return <TemplatesDialog open={open} onOpenChange={setOpen} />;
}
