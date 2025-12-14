import { supabase } from "@/lib/supabaseBrowser";

type Pair = [string, string];

// Probamo više mogućih naziva kolona u conversations tablici.
// (ti realno imaš neki od ovih parova)
const CANDIDATE_PAIRS: Pair[] = [
  ["user1_id", "user2_id"],
  ["user_a_id", "user_b_id"],
  ["user_id_1", "user_id_2"],
  ["participant1_id", "participant2_id"],
  ["buyer_id", "seller_id"],
];

async function tryConversationIds(userId: string, pair: Pair): Promise<string[] | null> {
  const [colA, colB] = pair;

  // Ako kolona ne postoji, Supabase vrati error (42703)
  const a = await supabase.from("conversations").select("id").eq(colA, userId);
  if (a.error) return null;

  const b = await supabase.from("conversations").select("id").eq(colB, userId);
  if (b.error) return null;

  const ids = [
    ...(a.data ?? []).map((x: any) => x.id),
    ...(b.data ?? []).map((x: any) => x.id),
  ];

  return ids;
}

async function getConversationIdsForUser(userId: string): Promise<string[]> {
  // pokušaj parove dok ne nađemo validne kolone
  for (const pair of CANDIDATE_PAIRS) {
    const ids = await tryConversationIds(userId, pair);
    if (ids) return Array.from(new Set(ids));
  }
  return [];
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  try {
    const convIds = await getConversationIdsForUser(userId);
    if (convIds.length === 0) return 0;

    // Unread = is_read=false AND sender_id != user
    const res = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .eq("is_read", false)
      .neq("sender_id", userId);

    if (res.error) return 0;
    return res.count ?? 0;
  } catch {
    return 0;
  }
}
