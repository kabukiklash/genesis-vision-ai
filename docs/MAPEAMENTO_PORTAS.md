# Mapeamento de Portas - Genesis Vision AI

## Configuração no projeto

| Arquivo | Porta | Uso |
|---------|-------|-----|
| `vite.config.ts` | **8083** | Dev server (npm run dev) |
| `playwright.config.ts` | 8083 | E2E tests (baseURL, webServer) |

**strictPort: true** – Se 8083 estiver ocupada, o Vite falha em vez de usar outra porta.

---

## Porta fixa 8083

O dev server usa **somente** a porta **8083**. Com `strictPort: true`, se ela estiver ocupada o Vite falha em vez de usar outra porta.

---

## Se 8083 estiver ocupada

O Vite exibirá um erro. Para resolver:

1. **Encerrar instâncias duplicadas**
   - Fechar terminais extras com `npm run dev`
   - Ou, no PowerShell: `Get-NetTCPConnection -LocalPort 8083 | Select-Object OwningProcess` para achar o PID e encerrar

2. **Sempre usar só uma instância**
   - Manter aberto apenas um terminal com `npm run dev`
   - Conferir o que está rodando em segundo plano (Lovable, Cursor, etc.)

3. **Erro "Failed to fetch dynamically imported module"**
   - Geralmente causa: portas conflitantes (ex.: 8082 vs 8081) ou múltiplas instâncias do Vite
   - Solução: fechar todos os terminais, reiniciar `npm run dev` na porta 8083
   - Durante o loading do Council: evitar Backspace (pode disparar "voltar" do navegador)
