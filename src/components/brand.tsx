import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/dashboard" aria-label="My Path to Code">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>MY PATH</strong>
          <small>TO CODE</small>
        </span>
      )}
    </Link>
  );
}
