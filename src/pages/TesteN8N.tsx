import { useState } from 'react';
import { chatsAPI } from '../lib/api';

export default function TesteN8N() {
  const [resultado, setResultado] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_N8N_API_URL;
  const API_KEY = import.meta.env.VITE_N8N_API_KEY;

  const testarConexao = async () => {
    setLoading(true);
    setResultado('Testando conexão...');
    
    try {
      console.log('Testando conexão com n8n...');
      const chats = await chatsAPI.getAll();
      console.log('Resposta:', chats);
      setResultado(`✅ Conexão OK! Retornou ${chats.length} chats.\n\n${JSON.stringify(chats, null, 2)}`);
    } catch (error) {
      console.error('Erro na conexão:', error);
      setResultado(`❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Teste de Integração n8n</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuração</h2>
          
          {!API_URL || !API_KEY ? (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded p-4 mb-4">
              ⚠️ URL e API Key não configuradas!
              <br />
              <br />
              Configure o arquivo <code className="bg-red-100 px-2 py-1 rounded">.env.local</code> na raiz do projeto com:
              <pre className="bg-red-100 p-2 rounded mt-2 text-xs">
                VITE_N8N_API_URL=https://seu-n8n.com/webhook/api-frontend
                <br />
                VITE_N8N_API_KEY=sua_api_key
              </pre>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <strong>URL:</strong> 
                <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-sm">{API_URL}</code>
              </div>
              <div>
                <strong>API Key:</strong> 
                <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-sm">
                  {API_KEY.substring(0, 20)}...
                </code>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Testar Conexão</h2>
          
          <button
            onClick={testarConexao}
            disabled={loading || !API_URL || !API_KEY}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              loading || !API_URL || !API_KEY
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Testando...' : 'Testar Conexão com n8n'}
          </button>

          {resultado && (
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Resultado:</h3>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto max-h-96 text-sm">
                {resultado}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

