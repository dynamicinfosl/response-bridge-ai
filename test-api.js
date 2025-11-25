// Script de teste para verificar a conexão com o n8n
// Execute com: node test-api.js

const API_URL = process.env.VITE_N8N_API_URL || 'https://n8n-n8n.pjp6ko.easypanel.host/webhook/api-frontend';
const API_KEY = process.env.VITE_N8N_API_KEY || '';

console.log('🔍 Testando conexão com n8n...\n');
console.log('URL:', API_URL);
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 20)}...` : '(não configurada)');
console.log('\n---\n');

async function testarConexao() {
  try {
    const url = `${API_URL}?endpoint=chats`;
    console.log('📡 Fazendo requisição para:', url);
    
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
      console.log('🔑 Usando API Key no header Authorization');
    } else {
      console.log('⚠️  Sem API Key - requisição sem autenticação');
    }
    
    console.log('\n---\n');
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    console.log('📊 Status:', response.status, response.statusText);
    console.log('📋 Headers da resposta:');
    response.headers.forEach((value, key) => {
      console.log(`  ${key}: ${value}`);
    });
    
    const text = await response.text();
    console.log('\n📄 Resposta (texto):');
    console.log(text);
    
    if (response.ok) {
      try {
        const json = JSON.parse(text);
        console.log('\n✅ Resposta JSON válida:');
        console.log(JSON.stringify(json, null, 2));
        
        if (Array.isArray(json)) {
          console.log(`\n✅ Sucesso! Retornou ${json.length} chat(s)`);
        } else if (typeof json === 'object') {
          console.log('\n⚠️  Retornou um objeto ao invés de array');
          console.log('Chaves do objeto:', Object.keys(json));
        }
      } catch (e) {
        console.log('\n⚠️  Resposta não é JSON válido');
      }
    } else {
      console.log('\n❌ Erro na requisição');
      if (response.status === 401) {
        console.log('🔑 Erro 401: API Key pode estar incorreta ou ausente');
      } else if (response.status === 404) {
        console.log('🔗 Erro 404: Webhook não encontrado - verifique se o workflow está ativo');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Erro ao fazer requisição:');
    console.error(error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('🌐 Erro de DNS - verifique se a URL está correta');
    }
  }
}

testarConexao();

