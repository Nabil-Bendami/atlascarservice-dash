import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";

export function AsyncState({
  loading,
  error,
  isEmpty,
  emptyMessage,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  isEmpty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <EmptyState title="Something went wrong" description={error} actionLabel={onRetry ? "Retry" : undefined} onAction={onRetry} />;
  }

  if (isEmpty) {
    return <EmptyState title="No data yet" description={emptyMessage ?? "No records available."} />;
  }

  return <>{children}</>;
}
