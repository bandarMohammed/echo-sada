"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

/**
 * Submit button that reflects the form's pending state, so a click on
 * "Enter as Patient/Doctor" gives immediate feedback (disabled + spinner)
 * while the server action runs and the navigation completes.
 */
export function SubmitButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border border-border bg-card text-card-foreground hover:bg-muted";
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl px-8 font-semibold transition disabled:cursor-progress disabled:opacity-70 sm:w-auto ${styles}`}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
