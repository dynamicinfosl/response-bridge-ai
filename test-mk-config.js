// Script para testar a configuração MK no Supabase
// Execute: node test-mk-config.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar .env.local
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
const mkBaseUrlEnv = envVars.VITE_MK_BASE_URL;
const mkTokenEnv = envVars.VITE_MK_TOKEN;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 TESTE DE CONFIGURAÇÃO MK');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 Variáveis de ambiente (.env.local):');
console.log(`  VITE_SUPABASE_URL: ${supabaseUrl || '❌ NÃO DEFINIDA'}`);
console.log(`  VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Definida' : '❌ NÃO DEFINIDA'}`);
console.log(`  VITE_MK_BASE_URL: ${mkBaseUrlEnv || '❌ NÃO DEFINIDA'}`);
console.log(`  VITE_MK_TOKEN: ${mkTokenEnv ? `✅ ${mkTokenEnv.substring(0, 20)}...` : '❌ NÃO DEFINIDA'}`);
console.log('');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Erro: Configuração do Supabase incompleta!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMKConfig() {
  try {
    console.log('🔍 Buscando configuração MK no Supabase...');
    console.log('   Query: SELECT key, value FROM system_settings WHERE key IN (\'mk_base_url\', \'mk_token\')');
    console.log('');

    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['mk_base_url', 'mk_token']);

    if (error) {
      console.error('❌ Erro ao consultar Supabase:', error.message);
      if (error.code === '42P01') {
        console.error('💡 Tabela system_settings não existe. Execute supabase-system-settings.sql primeiro.');
      }
      return false;
    }

    console.log('✅ Query executada com sucesso!');
    console.log('');
    console.log('📊 Resultado da busca:');
    if (!data || data.length === 0) {
      console.log('   ⚠️  Nenhuma linha encontrada!');
      console.log('');
      console.log('💡 Execute este SQL no Supabase para criar as configurações:');
      console.log('');
      console.log('INSERT INTO system_settings (key, value, description)');
      console.log('VALUES');
      console.log('  (\'mk_base_url\', \'http://186.219.120.50:8080\', \'URL base da API MK\'),');
      console.log(`  ('mk_token', '${mkTokenEnv || 'SEU_TOKEN_AQUI'}', 'Token MK')`)
      console.log('ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;');
      return false;
    }

    const map = Object.fromEntries(data.map(r => [r.key, r.value || '']));
    
    console.log(`   • mk_base_url: ${map.mk_base_url ? `✅ ${map.mk_base_url}` : '❌ VAZIO'}`);
    console.log(`   • mk_token: ${map.mk_token ? `✅ ${map.mk_token.substring(0, 30)}...` : '❌ VAZIO'}`);
    console.log('');

    const baseUrl = map.mk_base_url?.trim() || mkBaseUrlEnv;
    const token = map.mk_token?.trim() || mkTokenEnv;

    console.log('🔧 Configuração final (após fallback .env):');
    console.log(`   • Base URL: ${baseUrl || '❌ AUSENTE'}`);
    console.log(`   • Token: ${token ? `✅ ${token.substring(0, 30)}...` : '❌ AUSENTE'}`);
    console.log('');

    if (!baseUrl || !token) {
      console.error('❌ Configuração incompleta!');
      console.log('');
      console.log('💡 Soluções:');
      console.log('   1. Preencha mk_base_url e mk_token no Supabase (system_settings), OU');
      console.log('   2. Adicione VITE_MK_BASE_URL e VITE_MK_TOKEN no .env.local');
      return false;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 Testando chamada à API MK...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testUrl = new URL('/mk/WSMKConsultaClientes.rule', baseUrl);
    testUrl.searchParams.set('sys', 'MK0');
    testUrl.searchParams.set('token', token);
    testUrl.searchParams.set('nome_cliente', 'diogo');

    console.log('📤 Requisição:');
    console.log(`   URL: ${testUrl.toString()}`);
    console.log('');

    const response = await fetch(testUrl.toString());
    console.log(`📥 Resposta: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ Erro HTTP ${response.status}`);
      return false;
    }

    const text = await response.text();
    console.log(`   Tamanho: ${text.length} bytes`);

    try {
      const json = JSON.parse(text);
      const results = Array.isArray(json) ? json : (json.clientes || json.data || json.resultado || []);
      console.log(`   Resultados: ${results.length} cliente(s)`);
      if (results.length > 0) {
        console.log('');
        console.log('✅ Primeiro resultado:');
        console.log(JSON.stringify(results[0], null, 2));
      }
    } catch {
      console.log('   ⚠️  Resposta não é JSON válido');
      console.log('   Primeiros 200 chars:', text.substring(0, 200));
    }

    console.log('');
    console.log('✅ TESTE COMPLETO! A configuração está funcionando.');
    return true;

  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    return false;
  }
}

testMKConfig().then(success => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(success ? 0 : 1);
});
