import { getN8NApiUrl, getN8NApiKey } from './n8n-config';

const MSG_URL_VAZIA =
  'URL do n8n não configurada. Defina VITE_N8N_API_URL no .env.local ou em Configurações Avançadas (para master).';

const N8N_FETCH_TIMEOUT = 15000; // 15s — evita loading infinito quando n8n não responde

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let API_URL = await getN8NApiUrl();
  if (!API_URL || API_URL.trim() === '') {
    API_URL = (import.meta.env.VITE_N8N_API_URL as string) || '';
  }
  if (!API_URL || API_URL.trim() === '') {
    console.error('❌', MSG_URL_VAZIA);
    throw new Error(MSG_URL_VAZIA);
  }

  const API_KEY = await getN8NApiKey();
  const url = `${API_URL}${endpoint}`;

  console.log('🚀 Chamando API:', { url, hasApiKey: !!API_KEY });

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` }),
    ...options?.headers,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), N8N_FETCH_TIMEOUT);

    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store', // Força não usar cache
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', { status: response.status, statusText: response.statusText, body: errorText });
      throw new Error(`API Error: ${response.status} ${response.statusText}${errorText ? ` — ${errorText}` : ''}`);
    }

    // Verificar se há conteúdo antes de fazer parse
    const contentType = response.headers.get('content-type');
    const text = await response.text();

    console.log('📡 Response text (raw):', text.substring(0, 200)); // Log dos primeiros 200 caracteres

    // Se a resposta estiver vazia, retornar array vazio para chats/messages
    if (!text || text.trim() === '') {
      console.warn('⚠️ Resposta vazia do servidor, retornando array vazio');
      return [] as T;
    }

    // Tentar fazer parse do JSON
    let data: T;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('📄 Texto recebido:', text);
      // Se for endpoint de chats ou messages, retornar array vazio
      if (endpoint.includes('chats') || endpoint.includes('messages')) {
        return [] as T;
      }
      throw new Error(`Invalid JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Debug: Log da resposta da API
    console.log('📡 API Response:', { endpoint, data, isArray: Array.isArray(data), type: typeof data });

    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('❌ Fetch Error (timeout):', error);
      throw new Error('A requisição ao n8n demorou demais. Verifique a URL do n8n e tente novamente.');
    }
    console.error('❌ Fetch Error:', error);
    throw error;
  }
}

export interface Chat {
  id: string;
  phone: string;
  client?: string;
  clientPhone?: string;
  WhatsApp?: string;
  pendente?: string;
  status: string;
  lastMessage?: string;
  lastMessageSender?: 'user' | 'agent';
  time?: string;
  unread?: number;
  attendant?: string;
  createdAt?: string;
  updatedAt?: string;
  labels?: string[];
  assigneeId?: number;
  escalationSummary?: string;
}

export interface Message {
  id: string;
  chatId: string;
  content?: string;
  sender: 'user' | 'agent' | 'activity';
  type?: 'text' | 'document' | 'audio' | 'image' | 'video';
  media?: {
    url: string;
    name: string;
  };
  timestamp: string;
  read?: boolean;
}

export interface SendMessagePayload {
  chatId: string;
  content: string;
  sender: 'user' | 'agent';
  labels?: string[];
}

export interface CreateChatPayload {
  phone: string;
  client?: string;
  clientPhone?: string;
  status?: string;
}

export const chatsAPI = {
  getAll: () => fetchAPI<Chat[]>('?endpoint=chats'),

  getById: async (id: string) => {
    const chats = await fetchAPI<Chat[]>('?endpoint=chats');
    return chats.find(chat => chat.id === id);
  },

  create: (data: CreateChatPayload) =>
    fetchAPI<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    fetchAPI<Chat>(`/chats/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  transfer: (id: string, attendantId: string) =>
    fetchAPI<Chat>(`/chats/${id}/transfer`, {
      method: 'PUT',
      body: JSON.stringify({ attendantId }),
    }),

  close: (id: string, reason?: string) =>
    fetchAPI<Chat>(`/chats/${id}/close`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    }),
};

export const messagesAPI = {
  getByChatId: (chatId: string) => {
    // Adicionar timestamp para evitar cache do navegador
    const timestamp = Date.now();
    return fetchAPI<Message[]>(`?endpoint=messages&chatId=${chatId}&t=${timestamp}`);
  },

  send: (data: SendMessagePayload) => {
    // Extrair apenas o número do telefone (remover @s.whatsapp.net se existir)
    const cleanChatId = data.chatId.replace('@s.whatsapp.net', '').replace('@c.us', '');

    // Criar payload conforme esperado pelo n8n
    const payload = {
      chatId: cleanChatId, // Apenas o número, sem @s.whatsapp.net
      content: data.content,
      sender: data.sender
    };

    return fetchAPI<Message>('/send-message', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  markAsRead: (chatId: string) =>
    fetchAPI<void>(`/messages/${chatId}/read`, {
      method: 'PUT',
    }),
};

