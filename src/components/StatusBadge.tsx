import { statusTone } from "@/lib/auth";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusTone[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}
