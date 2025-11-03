const API_URL = import.meta.env.VITE_N8N_API_URL;
const API_KEY = import.meta.env.VITE_N8N_API_KEY;

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  console.log('🚀 Chamando API:', { url, hasApiKey: !!API_KEY });
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` }),
    ...options?.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store', // Força não usar cache
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', { status: response.status, statusText: response.statusText, body: errorText });
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Debug: Log da resposta da API
    console.log('📡 API Response:', { endpoint, data, isArray: Array.isArray(data), type: typeof data });
    
    return data;
  } catch (error) {
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
  time?: string;
  unread?: number;
  attendant?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  chatId: string;
  content: string;
  sender: 'user' | 'agent';
  timestamp: string;
  read?: boolean;
}

export interface SendMessagePayload {
  chatId: string;
  content: string;
  sender: 'user' | 'agent';
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
  getByChatId: (chatId: string) =>
    fetchAPI<Message[]>(`?endpoint=messages&chatId=${chatId}`),
  
  send: (data: SendMessagePayload) =>
    fetchAPI<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  markAsRead: (chatId: string) =>
    fetchAPI<void>(`/messages/${chatId}/read`, {
      method: 'PUT',
    }),
};

