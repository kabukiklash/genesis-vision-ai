# Deploy das Edge Functions - Resolver "Gerar Código"

Quando o botão **Gerar Código** retorna erro de CORS ou "Failed to send a request to the Edge Function", significa que a Edge Function `process-intent` **não está deployada** no seu projeto Supabase.

## Passo a passo

### 1. Instalar Supabase CLI (se ainda não tiver)

**Importante:** `npm install -g supabase` não é mais suportado. Use uma das opções:

**Opção A – Dev dependency (recomendado):**
```bash
npm i supabase --save-dev
```
Depois use `npx supabase` em todos os comandos abaixo.

**Opção B – Scoop (Windows):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2. Fazer login no Supabase

```bash
npx supabase login
```

> Se instalou via Scoop, use só `supabase` (sem npx).

Isso abrirá o navegador para autenticação.

### 3. Vincular ao projeto correto

No diretório do projeto:

```bash
npx supabase link --project-ref zquhibncpluvnqcdlipg
```

(Use o **Project ID** do seu `.env` - `VITE_SUPABASE_PROJECT_ID`)

### 4. Configurar o secret LOVABLE_API_KEY

A função usa a API Lovable para gerar código. Configure o secret:

```bash
npx supabase secrets set LOVABLE_API_KEY=sua_chave_aqui
```

**Onde obter a chave:** https://lovable.dev → conta → API / Integrations.

### 5. Deploy da função process-intent

```bash
npx supabase functions deploy process-intent
```

### 6. (Opcional) Deploy da função generate-app

Se usar a geração de app completo:

```bash
npx supabase functions deploy generate-app
```

---

## Verificar se funcionou

1. Supabase Dashboard → **Edge Functions** → verificar se `process-intent` aparece como deployada
2. Testar novamente o botão **Gerar Código** no app
3. Conferir logs: **Edge Functions** → `process-intent` → **Logs**

---

## Se ainda der CORS

- Confirme que o `project-ref` usado no `supabase link` é o mesmo do `.env`
- Reinicie o servidor de desenvolvimento (`npm run dev`) após o deploy
- Limpe o cache do navegador ou teste em aba anônima
