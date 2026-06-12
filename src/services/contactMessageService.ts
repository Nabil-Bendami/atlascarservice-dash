import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { ContactMessage } from "@/types";

interface ContactMessageRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  subject: string | null;
  message: string;
  status: string;
  created_at: string;
}

function mapContactMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function listContactMessages(): Promise<ContactMessage[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ContactMessageRow[]).map(mapContactMessage);
}

async function getUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured) return 0;

  const { count, error } = await supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "unread");

  if (error) throw error;
  return count ?? 0;
}

async function markAsRead(messageId: string): Promise<ContactMessage> {
  const { data, error } = await supabase
    .from("contact_messages")
    .update({ status: "read" })
    .eq("id", messageId)
    .select("*")
    .single();

  if (error) throw error;
  return mapContactMessage(data as ContactMessageRow);
}

async function deleteMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from("contact_messages").delete().eq("id", messageId);
  if (error) throw error;
}

export const contactMessageService = {
  listContactMessages,
  getUnreadCount,
  markAsRead,
  deleteMessage,
};
