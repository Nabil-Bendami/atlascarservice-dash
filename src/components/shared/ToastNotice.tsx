import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastNoticeProps = {
  message: string;
  tone: "success" | "error";
};

export function ToastNotice({ message, tone }: ToastNoticeProps) {
  const isSuccess = tone === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        "fixed right-6 top-6 z-50 flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg",
        isSuccess ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-rose-100 bg-rose-50 text-rose-700",
      )}
      role="status"
      aria-live="polite"
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
