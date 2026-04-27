import { supabase } from './supabase';

export type AuditAction =
    | 'login'
    | 'logout'
    | 'chat_transfer'
    | 'chat_intervene'
    | 'chat_takeover'
    | 'chat_reactivate_ai'
    | 'chat_close_manual'
    | 'user_create'
    | 'user_update'
    | 'user_delete'
    | 'user_change_password'
    | 'settings_update'
    | 'mk_query';

export interface AuditLogDetails {
    [key: string]: any;
}

export async function logAuditAction(
    action: AuditAction,
    details: AuditLogDetails = {},
    targetType?: string,
    targetId?: string
): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
            console.warn('[audit] Tentativa de log sem usuário autenticado:', action);
            return;
        }

        // Buscar role/area do usuário logado
        let userRole: string | null = null;
        let userArea: string | null = null;
        try {
            const { data: profile } = await supabase
                .from('users')
                .select('role, area')
                .eq('id', user.id)
                .single();
            userRole = profile?.role || null;
            userArea = profile?.area || null;
        } catch {
            // fallback para metadata
            userRole = user.user_metadata?.role || null;
        }

        const payload = {
            user_id: user.id,
            user_email: user.email,
            user_role: userRole,
            user_area: userArea,
            action,
            details,
            target_type: targetType || null,
            target_id: targetId || null,
        };

        const { error } = await supabase.from('audit_logs').insert(payload);
        if (error) {
            console.error('[audit] Erro ao inserir log:', error.message);
        }
    } catch (err) {
        console.error('[audit] Exceção ao logar ação:', err);
    }
}
