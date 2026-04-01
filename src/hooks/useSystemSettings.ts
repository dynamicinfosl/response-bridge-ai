import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface SystemSettings {
  n8n_api_url: string;
  n8n_api_key: string;
  n8n_webhook_chats?: string;
  n8n_webhook_messages?: string;
  n8n_webhook_send_message?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  n8n_api_url: import.meta.env.VITE_N8N_API_URL || '',
  n8n_api_key: import.meta.env.VITE_N8N_API_KEY || '',
};

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar configurações do banco
  const loadSettings = async () => {
    try {
      setLoading(true);
      
      // Buscar do banco
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['n8n_api_url', 'n8n_api_key', 'n8n_webhook_chats', 'n8n_webhook_messages', 'n8n_webhook_send_message']);

      if (error) {
        console.error('Erro ao buscar configurações:', error);
        // Se der erro, usa valores do .env como fallback
        setSettings(DEFAULT_SETTINGS);
        return;
      }

      // Converter array para objeto
      const settingsMap: Partial<SystemSettings> = {};
      if (data) {
        data.forEach(item => {
          const key = item.key as keyof SystemSettings;
          settingsMap[key] = item.value || '';
        });
      }

      // Usar valores do banco se existirem, senão usar .env
      const finalSettings: SystemSettings = {
        n8n_api_url: settingsMap.n8n_api_url || DEFAULT_SETTINGS.n8n_api_url,
        n8n_api_key: settingsMap.n8n_api_key || DEFAULT_SETTINGS.n8n_api_key,
        n8n_webhook_chats: settingsMap.n8n_webhook_chats || '',
        n8n_webhook_messages: settingsMap.n8n_webhook_messages || '',
        n8n_webhook_send_message: settingsMap.n8n_webhook_send_message || '',
      };

      setSettings(finalSettings);
      console.log('✅ Configurações carregadas:', finalSettings);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  // Salvar configurações no banco
  const saveSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const updates = Object.entries(newSettings).map(([key, value]) => ({
        key,
        value: value || '',
      }));

      // Usar upsert para inserir ou atualizar
      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' });

      if (error) {
        console.error('Erro ao salvar configurações:', error);
        toast({
          title: 'Erro ao salvar',
          description: 'Não foi possível salvar as configurações.',
          variant: 'destructive',
        });
        return false;
      }

      // Atualizar estado local
      setSettings(prev => ({ ...prev, ...newSettings }));
      
      toast({
        title: 'Configurações salvas!',
        description: 'As URLs do n8n foram atualizadas com sucesso.',
      });

      console.log('✅ Configurações salvas:', newSettings);
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar as configurações.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Carregar ao montar
  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    loadSettings,
    saveSettings,
  };
}

