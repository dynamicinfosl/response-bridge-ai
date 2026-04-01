// Script para verificar se o Supabase está configurado
// Execute: node check-supabase.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://erydxufihxdyhzklpjza.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyeWR4dWZpaHhkeWh6a2xwanphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwNDAxOTIsImV4cCI6MjA3OTYxNjE5Mn0.4gshSrkP8i-Su0XOgwjy3OK0PRZgggTYgA3mUp-Tts0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSupabase() {
  try {
    console.log('🔍 Verificando conexão com Supabase...');
    
    // Testar conexão
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erro ao conectar:', error.message);
      if (error.message.includes('relation "public.users" does not exist')) {
        console.log('💡 Tabela users não existe. Execute o SQL supabase-setup.sql');
      }
    } else {
      console.log('✅ Conexão OK');
    }
    
    // Verificar usuários existentes
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('❌ Erro ao listar usuários:', usersError.message);
    } else {
      console.log(`👥 Usuários encontrados: ${users.users.length}`);
      users.users.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

checkSupabase();









