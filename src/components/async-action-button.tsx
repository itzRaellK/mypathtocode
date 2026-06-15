"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

type Result = { ok: boolean; message: string; href?: string };

export function AsyncActionButton({
  action,
  label,
  pendingLabel = "Gerando...",
  icon = "sparkles",
  className = "button button-primary",
  onSuccess,
}: {
  action: () => Promise<Result>;
  label: string;
  pendingLabel?: string;
  icon?: "sparkles" | "refresh";
  className?: string;
  onSuccess?: (result: Result) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const router = useRouter();
  const Icon = icon === "refresh" ? RefreshCw : Sparkles;
  return (
    <div className="action-button-wrap">
      <button className={className} type="button" disabled={pending} onClick={() => startTransition(async () => {
        const next = await action();
        setResult(next);
        if (next.ok) onSuccess?.(next);
        if (next.href) router.push(next.href);
        else if (next.ok) router.refresh();
      })}>
        <Icon size={15} className={pending ? "spin-icon" : ""} /> {pending ? pendingLabel : label}
      </button>
      {result && <small className={result.ok ? "action-success" : "action-error"}>{result.message}</small>}
    </div>
  );
}
