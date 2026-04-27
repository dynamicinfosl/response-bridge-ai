import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  user_email: string;
  user_role: string;
  user_area: string;
  category: string;
  resource_id: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export function useAuditLogs() {
  const [data, setData] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setIsLoading(true);
        const { data: logs, error: supabaseError } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (supabaseError) throw supabaseError;
        setData(logs || []);
      } catch (err) {
        console.error('Erro ao buscar logs de auditoria:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
  }, []);

  return { data, isLoading, error };
}
