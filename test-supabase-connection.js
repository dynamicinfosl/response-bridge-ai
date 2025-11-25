// Script para testar a conexão com o Supabase
// Execute: node test-supabase-connection.js

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis do .env.local
const envFile = readFileSync(join(__dirname, '.env.local'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas!');
  console.error('Verifique se .env.local existe e contém:');
  console.error('  VITE_SUPABASE_URL=...');
  console.error('  VITE_SUPABASE_ANON_KEY=...');
  process.exit(1);
}

console.log('🔍 Testando conexão com Supabase...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
console.log('');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Teste 1: Verificar se consegue conectar
    console.log('📡 Teste 1: Verificando conexão...');
    const { data: healthData, error: healthError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (healthError && healthError.code !== 'PGRST116') {
      console.error('❌ Erro na conexão:', healthError.message);
      if (healthError.code === '42P01') {
        console.error('💡 Dica: A tabela "users" não existe ainda!');
        console.error('   Execute o script supabase-setup.sql no SQL Editor do Supabase.');
      }
      return false;
    }
    
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log('');
    
    // Teste 2: Verificar se a tabela users existe
    console.log('📊 Teste 2: Verificando tabela users...');
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .limit(5);
    
    if (error) {
      console.error('❌ Erro ao consultar tabela:', error.message);
      if (error.code === '42P01') {
        console.error('💡 Dica: A tabela "users" não existe!');
        console.error('   Execute o script supabase-setup.sql no SQL Editor do Supabase.');
      }
      return false;
    }
    
    console.log('✅ Tabela "users" encontrada!');
    console.log(`   Total de usuários: ${data ? data.length : 0}`);
    if (data && data.length > 0) {
      console.log('   Usuários encontrados:');
      data.forEach(user => {
        console.log(`   - ${user.full_name || user.email} (${user.role || 'user'})`);
      });
    }
    console.log('');
    
    // Teste 3: Verificar autenticação
    console.log('🔐 Teste 3: Verificando autenticação...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.log('ℹ️  Nenhuma sessão ativa (normal se ainda não fez login)');
    } else if (authData.session) {
      console.log('✅ Sessão de autenticação ativa!');
      console.log(`   Usuário: ${authData.session.user.email}`);
    } else {
      console.log('ℹ️  Nenhuma sessão ativa (normal se ainda não fez login)');
    }
    console.log('');
    
    console.log('✅ Todos os testes passaram! Sistema configurado corretamente.');
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('   1. Execute o script supabase-setup.sql no SQL Editor do Supabase');
    console.log('   2. Crie um usuário admin no Authentication > Users');
    console.log('   3. Faça login no sistema com suas credenciais');
    
    return true;
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});

