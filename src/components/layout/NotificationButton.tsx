import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { contactMessageService } from "@/services/contactMessageService";
import { cn } from "@/lib/utils";

export function NotificationButton({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadUnreadCount() {
      try {
        setUnreadCount(await contactMessageService.getUnreadCount());
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("CONTACT_MESSAGES_UNREAD_COUNT_FAILED", error);
        }
      }
    }

    void loadUnreadCount();
    window.addEventListener("contact-messages:changed", loadUnreadCount);

    return () => {
      window.removeEventListener("contact-messages:changed", loadUnreadCount);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate("/dashboard/notifications")}
      className={cn(
        "relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-foreground shadow-sm transition hover:border-primary/30 hover:text-primary",
        className,
      )}
      aria-label="Open notifications"
      title="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white shadow-soft">
          {unreadCount}
        </span>
      ) : null}
    </button>
  );
}
