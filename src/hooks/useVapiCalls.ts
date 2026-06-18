import { useQuery } from '@tanstack/react-query';
import { differenceInSeconds, isToday, parseISO } from 'date-fns';
import { voiceCallsApi, VoiceCall, VoiceCallDetail, ListCallsParams } from '@/lib/vapi-api';

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface VoiceCallStats {
  totalHoje: number;
  totalGeral: number;
  taxaResolucao: number;
  duracaoMedia: string;
}

const UNRESOLVED_REASONS = new Set([
  'silence-timed-out',
  'customer-did-not-answer',
  'no-answer',
  'failed',
  'busy',
  'customer-busy',
  'voicemail-detection-failure',
  'phone-call-provider-closed-websocket-unexpectedly',
]);

function calcDurationSeconds(call: VoiceCall): number {
  if (!call.createdAt || !call.updatedAt) return 0;
  const secs = differenceInSeconds(parseISO(call.updatedAt), parseISO(call.createdAt));
  return Math.max(0, secs);
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function calcStats(calls: VoiceCall[]): VoiceCallStats {
  const totalGeral = calls.length;
  const totalHoje = calls.filter(c => {
    try { return isToday(parseISO(c.createdAt)); } catch { return false; }
  }).length;

  const endedWithReason = calls.filter(c => c.status === 'ended' && c.endedReason);
  const resolved = endedWithReason.filter(c => !UNRESOLVED_REASONS.has(c.endedReason!));
  const taxaResolucao =
    endedWithReason.length > 0
      ? Math.round((resolved.length / endedWithReason.length) * 100)
      : 0;

  const durations = calls.map(calcDurationSeconds).filter(d => d > 0);
  const avgSeconds =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  return {
    totalHoje,
    totalGeral,
    taxaResolucao,
    duracaoMedia: formatDuration(avgSeconds),
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useVoiceCalls(params?: ListCallsParams) {
  const query = useQuery({
    queryKey: ['voice-calls', params],
    queryFn: () => voiceCallsApi.list({ limit: 100, ...params }),
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  const stats = query.data ? calcStats(query.data) : null;

  return { ...query, stats };
}

export function useVoiceCallDetail(id: string | null) {
  return useQuery<VoiceCallDetail>({
    queryKey: ['voice-call-detail', id],
    queryFn: () => voiceCallsApi.get(id!),
    enabled: !!id,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export { calcDurationSeconds, formatDuration };
