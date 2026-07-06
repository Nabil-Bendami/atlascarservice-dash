import { useMemo, useState } from "react";
import { Bell, Check, CheckCircle2, Clock3, Inbox, Mail, Phone, RefreshCw, Search, Trash2 } from "lucide-react";
import { AsyncState } from "@/components/shared/AsyncState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  const [query, setQuery] = useState("");
  const messagesQuery = useAsyncData(() => contactMessageService.listContactMessages(), []);

  const messages = messagesQuery.data ?? [];
  const unreadCount = useMemo(() => messages.filter((message) => message.status === "unread").length, [messages]);
  const filteredMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return messages;

    return messages.filter((message) => {
      return [message.fullName, message.email, message.phone, message.subject, message.message]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [messages, query]);

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
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <span className="font-medium text-slate-700">Notifications</span>
          </div>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Read and manage messages submitted from the public Atlas Cars contact form.
          </p>
        </div>

        <Button
          className="h-12 rounded-xl bg-rose-600 px-5 shadow-lg shadow-rose-600/15 hover:bg-rose-700"
          onClick={() => void messagesQuery.reload()}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <NotificationMetric label="All messages" value={messagesQuery.error ? null : messages.length} icon={Inbox} />
        <NotificationMetric label="Unread" value={messagesQuery.error ? null : unreadCount} tone="unread" icon={Bell} />
        <NotificationMetric label="Read" value={messagesQuery.error ? null : messages.length - unreadCount} tone="read" icon={CheckCircle2} />
      </div>

      {actionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {actionError}
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-xl border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">Contact inbox</h2>
              <p className="mt-1 text-sm text-slate-500">
                {filteredMessages.length} of {messages.length} messages shown
              </p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 shadow-none"
                placeholder="Search names, emails, subjects..."
              />
            </div>
          </div>

          <AsyncState
            loading={messagesQuery.loading}
            error={messagesQuery.error}
            isEmpty={!messagesQuery.loading && messages.length === 0}
            emptyMessage="No contact messages have been submitted yet."
            onRetry={() => void messagesQuery.reload()}
          >
            {filteredMessages.length ? (
              <div className="divide-y divide-slate-200/80">
                {filteredMessages.map((message) => (
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
              <div className="p-6">
                <EmptyState title="No matching notifications" description="Try another name, email, phone number, or subject." />
              </div>
            )}
          </AsyncState>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationMetric({
  label,
  value,
  icon: Icon,
  tone = "all",
}: {
  label: string;
  value: number | null;
  icon: typeof Bell;
  tone?: "all" | "unread" | "read";
}) {
  const toneClasses = {
    all: "bg-indigo-50 text-indigo-600",
    unread: "bg-rose-50 text-rose-600",
    read: "bg-emerald-50 text-emerald-600",
  }[tone];

  return (
    <Card className="rounded-xl border-slate-200/80 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-950">{value === null ? "-" : value}</p>
        </div>
        <div className={`rounded-xl p-3 ${toneClasses}`}>
          <Icon className="h-5 w-5" />
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
    <article className={`relative bg-white p-5 transition hover:bg-slate-50/70 ${isUnread ? "shadow-[inset_4px_0_0_rgb(225,29,72)]" : ""}`}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {getStatusBadge(message.status)}
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDate(message.createdAt)}
            </span>
          </div>

          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-rose-600">{message.fullName}</p>
            <h3 className="mt-2 text-xl font-extrabold text-slate-950">{message.subject || "No subject"}</h3>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Mail className="h-4 w-4 shrink-0 text-rose-600" />
              <span className="truncate">{message.email || "Email not provided"}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Phone className="h-4 w-4 shrink-0 text-rose-600" />
              <span className="truncate">{message.phone || "Phone not provided"}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{message.message}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col">
          <Button className="rounded-xl" variant="outline" onClick={onMarkAsRead} disabled={!isUnread || updating}>
            <Check className="h-4 w-4" />
            {updating ? "Updating..." : "Mark as read"}
          </Button>
          <Button className="rounded-xl bg-rose-600 hover:bg-rose-700" variant="destructive" onClick={onDelete} disabled={deleting}>
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </article>
  );
}
