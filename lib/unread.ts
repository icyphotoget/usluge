import { supabase } from "@/lib/supabaseBrowser";

export async function fetchUnreadCount(userId: string): Promise<number> {
  // 1) Dohvati sve razgovore gdje je user sudionik
  const conv1 = await supabase.from("conversations").select("id").eq("user1_id", userId);
  if (conv1.error) throw conv1.error;

  const conv2 = await supabase.from("conversations").select("id").eq("user2_id", userId);
  if (conv2.error) throw conv2.error;

  const convIds = [
    ...(conv1.data ?? []).map((x: any) => x.id),
    ...(conv2.data ?? []).map((x: any) => x.id),
  ];

  if (convIds.length === 0) return 0;

  // 2) Count nepročitanih poruka u tim razgovorima (poslane od drugih)
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convIds)
    .eq("is_read", false)
    .neq("sender_id", userId);

  if (error) throw error;

  return count ?? 0;
}
