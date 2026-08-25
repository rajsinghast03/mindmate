import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SERVICE_ROLE_MISSING, createServiceClient } from '@/lib/supabase/service';
import { isAdminEmail, isServiceRoleConfigured, isSupabaseConfigured } from '@/lib/config';
import { REPORT_STATUSES } from '@/lib/moderation';

/**
 * The moderation queue.
 *
 * Reads run on the service role because the reports SELECT policy is
 * own-reports-only by design — a moderator needs to see reports filed by other
 * people, and widening that policy would mean encoding "is an admin" in the
 * database, where it would sit on a table users can write to.
 *
 * Every response is 404 rather than 403 for a non-admin, so the route does not
 * confirm it exists to someone probing for it.
 */

const NOT_FOUND = NextResponse.json({ error: 'Not found' }, { status: 404 });

type ReportRow = {
  id: string;
  reporter_profile_id: string | null;
  reported_profile_id: string;
  category: string;
  reason: string;
  status: string;
  conversation_id: string | null;
  created_at: string;
};

async function requireAdmin() {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // getUser() validates against the auth server rather than trusting the cookie,
  // so the email compared here is one Supabase has verified.
  return user && isAdminEmail(user.email) ? user : null;
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NOT_FOUND;
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: SERVICE_ROLE_MISSING }, { status: 503 });
  }

  const status = req.nextUrl.searchParams.get('status');
  const service = createServiceClient();

  let query = service
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (status && REPORT_STATUSES.includes(status)) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as ReportRow[];

  // Names for both sides. Reports outlive profiles — reporter_profile_id is ON
  // DELETE SET NULL — so a missing name is expected, not an error.
  const ids = [
    ...new Set(rows.flatMap(r => [r.reporter_profile_id, r.reported_profile_id].filter(Boolean))),
  ] as string[];

  const { data: profiles } = ids.length
    ? await service.from('profiles').select('id, display_name, city_or_timezone').in('id', ids)
    : { data: [] };

  const nameById = new Map(
    (profiles ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name])
  );

  // How many reports this person has in total, across every status. A single
  // report and a tenth report are very different things to be looking at.
  const { data: allReported } = await service.from('reports').select('reported_profile_id');
  const totals = new Map<string, number>();
  for (const row of (allReported ?? []) as { reported_profile_id: string }[]) {
    totals.set(row.reported_profile_id, (totals.get(row.reported_profile_id) ?? 0) + 1);
  }

  const counts: Record<string, number> = { open: 0, reviewed: 0, actioned: 0, dismissed: 0 };
  const { data: statusRows } = await service.from('reports').select('status');
  for (const row of (statusRows ?? []) as { status: string }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }

  return NextResponse.json({
    counts,
    reports: rows.map(row => ({
      id: row.id,
      category: row.category,
      reason: row.reason,
      status: row.status,
      conversationId: row.conversation_id,
      createdAt: row.created_at,
      reporter: row.reporter_profile_id
        ? { id: row.reporter_profile_id, displayName: nameById.get(row.reporter_profile_id) ?? null }
        : null,
      reported: {
        id: row.reported_profile_id,
        displayName: nameById.get(row.reported_profile_id) ?? null,
        totalReports: totals.get(row.reported_profile_id) ?? 1,
      },
    })),
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) return NOT_FOUND;

  let id: string;
  let status: string;
  try {
    const body = await req.json();
    id = typeof body?.id === 'string' ? body.id : '';
    status = typeof body?.status === 'string' ? body.status : '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
  }

  if (!id || !REPORT_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 });
  }

  // No client policy grants UPDATE on reports at all, so this is the only write
  // path — which is what keeps a reported user from dismissing their own reports.
  const { error } = await createServiceClient()
    .from('reports')
    .update({ status })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
