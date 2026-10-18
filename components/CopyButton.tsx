"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cls } from "@/lib/ui";

export default function CopyButton({ text, label = "Salin", small }: { text: string; label?: string; small?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard diblokir browser
    }
  }

  const title = copied ? "Tersalin" : label;
  const size = small ? 16 : 18;
  return (
    <button type="button" className={cls("icon-btn", small && "icon-btn-sm")} onClick={copy} aria-label={title} title={title}>
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}
