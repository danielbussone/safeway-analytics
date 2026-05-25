import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="panel-title">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-stone-500">
      {label}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-stone-500">
      {message}
    </div>
  );
}
