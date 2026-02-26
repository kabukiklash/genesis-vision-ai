#!/usr/bin/env node
/**
 * Script para testar conexão com Supabase
 * Uso: node scripts/test-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.error('❌ Arquivo .env não encontrado na raiz do projeto');
    process.exit(1);
  }
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const idx = line.indexOf('=');
    if (idx > 0 && !line.trim().startsWith('#')) {
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      env[key] = value;
    }
  }
  return env;
}

async function testSupabase() {
  console.log('🔍 Testando conexão com Supabase...\n');

  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Faltam VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY no .env');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // Teste 1: Database - intent_examples (tabela pública)
  console.log('1️⃣ Testando tabela intent_examples...');
  try {
    const { data, error } = await supabase.from('intent_examples').select('id, title').limit(3);
    if (error) {
      console.log('   ⚠️', error.message);
      if (error.code === 'PGRST116') {
        console.log('   ℹ️  Tabela pode não existir ainda - execute as migrations');
      }
    } else {
      console.log('   ✅ OK -', data?.length ?? 0, 'registros encontrados');
      if (data?.length) console.log('   Exemplo:', data[0].title);
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  // Teste 2: Auth - health check
  console.log('\n2️⃣ Testando Auth...');
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.log('   ⚠️', error.message);
    } else {
      console.log('   ✅ Auth OK -', session ? 'sessão ativa' : 'sem sessão (normal)');
    }
  } catch (err) {
    console.log('   ❌ Erro:', err.message);
  }

  // Teste 3: REST API raw
  console.log('\n3️⃣ Testando REST API...');
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.ok || res.status === 200) {
      console.log('   ✅ REST API respondendo');
    } else {
      console.log('   ⚠️ Status:', res.status);
    }
  } catch (err) {
    console.log('   ❌ Erro de rede:', err.message);
  }

  console.log('\n✅ Teste concluído.');
}

testSupabase().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
