/**
 * Server-only helper to trigger explanation reset whenever a user's role is changed/assigned.
 */
export async function triggerRoleChangeExplanationReset(userId: string) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();

    // Check if user has an existing explanation record
    const { data: existing } = await supabaseAdmin
      .from("master_explanations")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("master_explanations")
        .update({
          needs_explanation: true,
          role_changed_at: nowIso,
          explanation_done_at: null,
          explanation_done_by_id: null,
          explanation_done_by_name: null,
          updated_at: nowIso,
        })
        .eq("user_id", userId);
    } else {
      await supabaseAdmin.from("master_explanations").upsert({
        id: `expl-${userId}`,
        user_id: userId,
        needs_explanation: true,
        role_changed_at: nowIso,
        explanation_done_at: null,
        explanation_done_by_id: null,
        explanation_done_by_name: null,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    // Check if there is a configured explanation group
    const { data: masterSettings } = await supabaseAdmin
      .from("master_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();

    if (masterSettings?.explanation_group_id) {
      const { data: group } = await supabaseAdmin
        .from("telegram_groups")
        .select("*")
        .eq("id", masterSettings.explanation_group_id)
        .maybeSingle();

      const { data: userProfile } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (group && userProfile) {
        const handle = userProfile.telegram_handle
          ? userProfile.telegram_handle.replace(/^@/, "").trim()
          : "";
        const username = (userProfile.username || "").trim();

        const currentExceptions: string[] = group.allowed_exceptions || [];
        const updatedExceptions = [...currentExceptions];

        if (
          handle &&
          !updatedExceptions.includes(`@${handle}`) &&
          !updatedExceptions.includes(handle)
        ) {
          updatedExceptions.push(`@${handle}`);
        }
        if (username && !updatedExceptions.includes(username)) {
          updatedExceptions.push(username);
        }

        await supabaseAdmin
          .from("telegram_groups")
          .update({
            allowed_exceptions: updatedExceptions,
            allowed_handles: updatedExceptions,
            updated_at: nowIso,
          })
          .eq("id", group.id);
      }
    }
  } catch (err) {
    console.error("Error triggering role change explanation reset:", err);
  }
}
