
const API_URL = import.meta.env.VITE_CHATWOOT_API_URL;
const API_TOKEN = import.meta.env.VITE_CHATWOOT_API_TOKEN;
const ACCOUNT_ID = import.meta.env.VITE_CHATWOOT_ACCOUNT_ID;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'api_access_token': API_TOKEN,
});

async function chatwootFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const isDev = import.meta.env.MODE === 'development';
  const baseUrl = isDev ? `/api/chatwoot/api/v1/accounts/${ACCOUNT_ID}` : `${API_URL}/api/v1/accounts/${ACCOUNT_ID}`;
  const url = `${baseUrl}${endpoint}`;

  const headers = {
    ...getHeaders(),
    ...options?.headers,
  } as any;

  if (options?.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chatwoot API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

export interface ChatwootAgent {
  id: number;
  name: string;
  email: string;
  available_name: string;
  role: string;
}

export interface ChatwootLabel {
  id: number;
  name: string;
  description: string;
  color: string;
  show_on_sidebar: boolean;
}

export interface ChatwootConversation {
  id: number;
  contact_last_seen_at: number;
  unread_count: number;
  status: string;
  agent_last_seen_at: number;
  contact: {
    id: number;
    name: string;
    phone_number: string;
    thumbnail: string;
  };
  labels: string[];
  meta: {
    assignee: ChatwootAgent | null;
  };
}

export interface ChatwootMessage {
  id: number;
  content: string;
  message_type: number; // 0: incoming, 1: outgoing
  created_at: number;
  conversation_id: number;
  attachments?: any[];
  sender?: {
    id: number;
    name: string;
    type: string;
  };
}

export const chatwootAPI = {
  // Agents
  getAgents: () => chatwootFetch<ChatwootAgent[]>('/agents'),

  // Labels
  getLabels: () => chatwootFetch<ChatwootLabel[]>('/labels'),

  addLabel: (conversationId: number, labels: string[]) =>
    chatwootFetch(`/conversations/${conversationId}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels }),
    }),

  // Conversations
  getConversations: (params?: string) =>
    chatwootFetch<ChatwootConversation[]>(`/conversations?t=${Date.now()}${params ? `&${params}` : ''}`),

  getFilteredConversations: (payload: any) =>
    chatwootFetch<ChatwootConversation[]>('/conversations/filter', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  assignAgent: (conversationId: number, agentId: number) =>
    chatwootFetch(`/conversations/${conversationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ assignee_id: agentId }),
    }),

  updateStatus: (conversationId: number, status: string) =>
    chatwootFetch(`/conversations/${conversationId}/toggle_status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Messages
  getMessages: (conversationId: number) =>
    chatwootFetch<ChatwootMessage[]>(`/conversations/${conversationId}/messages?t=${Date.now()}`),

  markAsRead: (conversationId: number) =>
    chatwootFetch(`/conversations/${conversationId}/update_last_seen`, {
      method: 'POST',
    }),

  sendMessage: (conversationId: number, content: string, private_msg: boolean = false) =>
    chatwootFetch<ChatwootMessage>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        message_type: 'outgoing',
        private: private_msg,
      }),
    }),

  sendAttachment: (conversationId: number, file: File, content: string = '') => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('attachments[]', file, file.name || 'document.pdf');
    formData.append('message_type', 'outgoing');

    return chatwootFetch<ChatwootMessage>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: formData,
    });
  },
};
