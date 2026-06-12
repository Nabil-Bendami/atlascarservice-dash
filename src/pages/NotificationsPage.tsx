import { useMemo, useState } from "react";
import { Bell, CheckCircle2, Mail, Phone, RefreshCw, Trash2 } from "lucide-react";
import { AsyncState } from "@/components/shared/AsyncState";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncData } from "@/hooks/useAsyncData";
import { contactMessageService } from "@/services/contactMessageService";
import type { ContactMessage } from "@/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusBadge(status: string) {
  if (status === "unread") return <Badge variant="destructive">unread</Badge>;
  if (status === "read") return <Badge variant="success">read</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export function NotificationsPage() {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const messagesQuery = useAsyncData(() => contactMessageService.listContactMessages(), []);

  const messages = messagesQuery.data ?? [];
  const unreadCount = useMemo(() => messages.filter((message) => message.status === "unread").length, [messages]);

  async function markAsRead(message: ContactMessage) {
    try {
      setUpdatingId(message.id);
      setActionError(null);
      await contactMessageService.markAsRead(message.id);
      await messagesQuery.reload();
      window.dispatchEvent(new Event("contact-messages:changed"));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to mark notification as read.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteMessage(message: ContactMessage) {
    try {
      setDeletingId(message.id);
      setActionError(null);
      await contactMessageService.deleteMessage(message.id);
      await messagesQuery.reload();
      window.dispatchEvent(new Event("contact-messages:changed"));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete notification.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contact inbox"
        title="Notifications"
        subtitle="Read and manage messages submitted from the public Atlas Drives contact form."
        actions={
          <Button variant="outline" onClick={() => void messagesQuery.reload()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <NotificationMetric label="All messages" value={messagesQuery.error ? null : messages.length} />
        <NotificationMetric label="Unread" value={messagesQuery.error ? null : unreadCount} tone="unread" />
        <NotificationMetric label="Read" value={messagesQuery.error ? null : messages.length - unreadCount} tone="read" />
      </div>

      {actionError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </div>
      ) : null}

      <AsyncState
        loading={messagesQuery.loading}
        error={messagesQuery.error}
        isEmpty={!messagesQuery.loading && messages.length === 0}
        emptyMessage="No contact messages have been submitted yet."
        onRetry={() => void messagesQuery.reload()}
      >
        {messages.length ? (
          <div className="space-y-4">
            {messages.map((message) => (
              <NotificationCard
                key={message.id}
                message={message}
                updating={updatingId === message.id}
                deleting={deletingId === message.id}
                onMarkAsRead={() => void markAsRead(message)}
                onDelete={() => void deleteMessage(message)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No notifications" description="Contact form messages will appear here." />
        )}
      </AsyncState>
    </div>
  );
}

function NotificationMetric({
  label,
  value,
  tone = "all",
}: {
  label: string;
  value: number | null;
  tone?: "all" | "unread" | "read";
}) {
  const toneClasses = {
    all: "bg-primary/10 text-primary",
    unread: "bg-rose-50 text-rose-600",
    read: "bg-emerald-50 text-emerald-600",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{value === null ? "—" : value}</p>
        </div>
        <div className={`rounded-2xl p-3 ${toneClasses}`}>
          <Bell className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationCard({
  message,
  updating,
  deleting,
  onMarkAsRead,
  onDelete,
}: {
  message: ContactMessage;
  updating: boolean;
  deleting: boolean;
  onMarkAsRead: () => void;
  onDelete: () => void;
}) {
  const isUnread = message.status === "unread";

  return (
    <Card className={isUnread ? "ring-2 ring-rose-200" : undefined}>
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {getStatusBadge(message.status)}
              <span className="text-sm text-muted-foreground">{formatDate(message.createdAt)}</span>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{message.fullName}</p>
              <h3 className="mt-2 text-xl font-extrabold text-slate-900">{message.subject || "No subject"}</h3>
            </div>

            <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{message.email || "Email not provided"}</span>
              </div>
              <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{message.phone || "Phone not provided"}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-slate-50 p-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{message.message}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
            <Button variant="outline" onClick={onMarkAsRead} disabled={!isUnread || updating}>
              <CheckCircle2 className="h-4 w-4" />
              {updating ? "Updating..." : "Mark as read"}
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
