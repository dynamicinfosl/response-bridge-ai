import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CHATWOOT_URL = Deno.env.get("CHATWOOT_API_URL") ?? "";
const CHATWOOT_TOKEN = Deno.env.get("CHATWOOT_API_TOKEN") ?? "";
const CHATWOOT_ACCOUNT_ID = Deno.env.get("CHATWOOT_ACCOUNT_ID") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY") ?? "";
const FETCH_TIMEOUT_MS = 10000;
const DATE_SCAN_PAGES_PER_REQUEST = 12;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function toTs(val: any): number | null {
  if (!val) return null;
  if (typeof val === "number") return Math.abs(val) < 10_000_000_000 ? val * 1000 : val;
  const t = Date.parse(val);
  return isNaN(t) ? null : t;
}

function toDayTs(value: string | null, endOfDay = false): number | null {
  if (!value) return null;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return isNaN(date.getTime()) ? null : date.getTime();
}

function getConversationTs(conv: any): number | null {
  return toTs(conv.last_activity_at ?? conv.updated_at ?? conv.created_at);
}

function matchesDate(conv: any, fromTs: number | null, toTsValue: number | null) {
  const ts = getConversationTs(conv);
  if (!ts) return false;
  if (fromTs && ts < fromTs) return false;
  if (toTsValue && ts > toTsValue) return false;
  return true;
}

async function fetchChatwootPage(page: number, status: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations?status=${encodeURIComponent(status)}&page=${page}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: { "api_access_token": CHATWOOT_TOKEN, "Content-Type": "application/json" },
      signal: controller.signal,
    });
    if (!resp.ok) {
      console.error(`[history] Chatwoot page ${page} -> HTTP ${resp.status}`);
      return { items: [], failed: true } as const;
    }
    const json = await resp.json();
    const payload = json?.data?.payload ?? json?.payload ?? (Array.isArray(json) ? json : []);
    return { items: Array.isArray(payload) ? payload : [], failed: false } as const;
  } catch (e) {
    console.error(`[history] Chatwoot page ${page} failed:`, (e as Error).message);
    return { items: [], failed: true } as const;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDateWindow(startPage: number, status: string, fromTs: number | null, toTsValue: number | null) {
  const found: any[] = [];
  let currentPage = startPage;
  let lastPageWithItems = startPage;
  let reachedEnd = false;
  let oldestTs: number | null = null;

  for (let i = 0; i < DATE_SCAN_PAGES_PER_REQUEST; i++) {
    const { items, failed } = await fetchChatwootPage(currentPage, status);
    if (failed || items.length === 0) {
      reachedEnd = true;
      break;
    }

    lastPageWithItems = currentPage;
    for (const conv of items) {
      const ts = getConversationTs(conv);
      if (ts && (!oldestTs || ts < oldestTs)) oldestTs = ts;
      if (matchesDate(conv, fromTs, toTsValue)) found.push(conv);
    }

    if (fromTs && oldestTs && oldestTs < fromTs) {
      reachedEnd = true;
      break;
    }

    currentPage += 1;
  }

  return {
    items: found,
    nextPage: reachedEnd ? null : lastPageWithItems + 1,
    scannedFrom: startPage,
    scannedTo: lastPageWithItems,
    oldestTs,
  };
}

async function upsertHistory(items: any[]) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !items.length) return;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const rows = items.map((conv: any) => ({
    conversation_id: Number(conv.id),
    account_id: Number(conv.account_id ?? conv.meta?.account_id ?? 0) || null,
    inbox_id: Number(conv.inbox_id ?? conv.meta?.inbox_id ?? 0) || null,
    status: String(conv.status || "").toLowerCase() || null,
    assignee_id: Number(conv.assignee_id ?? conv.meta?.assignee_id ?? 0) || null,
    labels: Array.isArray(conv.labels) ? conv.labels : [],
    meta: conv.meta ?? null,
    raw: conv,
    created_at_ts: toTs(conv.created_at),
    updated_at_ts: toTs(conv.updated_at),
    last_activity_at_ts: toTs(conv.last_activity_at ?? conv.updated_at ?? conv.created_at),
    cached_at: new Date().toISOString(),
  }));
  try {
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from("conversas_history_cache").upsert(rows.slice(i, i + 200), { onConflict: "conversation_id" });
      if (error) console.error("[history] upsert error:", error.message);
    }
  } catch (e) {
    console.error("[history] upsert exception:", (e as Error).message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!CHATWOOT_URL || !CHATWOOT_TOKEN || !CHATWOOT_ACCOUNT_ID) {
      return new Response(JSON.stringify({ error: "CHATWOOT envs missing" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
    const status = (url.searchParams.get("status") || "all").toLowerCase();
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");
    const fromTs = toDayTs(dateFrom, false);
    const toTsValue = toDayTs(dateTo, true);
    const hasDateFilter = Boolean(fromTs || toTsValue);

    if (hasDateFilter) {
      const result = await fetchDateWindow(page, status, fromTs, toTsValue);
      await upsertHistory(result.items);
      return new Response(JSON.stringify({
        items: result.items,
        page,
        nextPage: result.nextPage,
        source: "history_date_scan",
        scannedFrom: result.scannedFrom,
        scannedTo: result.scannedTo,
        oldestTs: result.oldestTs,
      }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { items, failed } = await fetchChatwootPage(page, status);
    await upsertHistory(items);
    return new Response(JSON.stringify({
      items,
      page,
      nextPage: items.length > 0 ? page + 1 : null,
      source: failed ? "history_partial" : "history",
    }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e) {
    console.error("[history] unhandled:", (e as Error).message);
    return new Response(JSON.stringify({ items: [], page: 1, nextPage: null, source: "history_error", message: (e as Error).message }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});
