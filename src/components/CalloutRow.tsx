import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { PairRecord } from "@/lib/ratings";

export function CalloutRow({
  title,
  record,
  name,
  tone,
  href,
}: {
  title: string;
  record: PairRecord;
  name: string | null;
  tone: "positive" | "negative";
  href?: string;
}) {
  const total = record.wins + record.losses;
  const pips = record.results.slice(-10);
  const statsText =
    total > 10
      ? `last 10 · ${record.wins} won · ${record.losses} lost`
      : `${record.wins} won · ${record.losses} lost`;

  const body = (
    <>
      <Avatar name={name ?? "?"} size={40} />
      <div className="callout-text">
        <div className="callout-title">{title}</div>
        <div className="callout-name">{name ? shortName(name) : "Unknown"}</div>
      </div>
      <div className="callout-meta">
        <div className="callout-pips" aria-hidden>
          {pips.map((won, i) => (
            <span key={i} className={`callout-pip${won ? " filled" : ""}`} />
          ))}
        </div>
        <div className="callout-stats">{statsText}</div>
      </div>
    </>
  );

  const className = `callout-row ${tone}`;
  return href ? (
    <Link className={className} href={href}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}
