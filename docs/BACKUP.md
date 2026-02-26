# Estratégia de Backup - Genesis Vision AI

## Overview

Backups automáticos são críticos para proteção de dados.

## Supabase Automated Backups

O Supabase oferece backups automáticos:

### Configuração (Dashboard)

1. Ir para: https://app.supabase.com
2. Selecionar projeto
3. **Settings** → **Backups**
4. Verificar:
   - ✅ Daily backups: ATIVADO
   - ✅ Backup retention: 7-14 dias
   - ✅ Point-in-time recovery: ATIVADO

### Como Restaurar

**RECOMENDADO PARA DESASTRES APENAS**

1. Dashboard → Settings → Backups
2. Selecionar snapshot
3. Confirmar restauração
4. Esperar ~30 minutos

⚠️ **ATENÇÃO:** Restauração afeta toda a base!

### Backup Manual

Para backup específico de uma tabela:

```bash
# Exportar (usar connection string do Supabase)
supabase db dump --db-url "postgresql://..." > conversations_backup.sql

# Importar
psql "postgresql://..." < conversations_backup.sql
```

## Disaster Recovery Plan

### Se banco está corrompido

1. Não entre em pânico!
2. Restaurar backup mais recente via Supabase Dashboard
3. Se point-in-time: restaurar do snapshot
4. Testar em staging ANTES de prod

### Se dados foram deletados

1. Parar tudo - não continue deletando
2. Colocar em read-only se possível
3. Restaurar do backup mais recente
4. Verificar o que foi perdido
5. Avaliar se precisa backup anterior

### Se servidor está down

1. Verificar status Supabase: https://status.supabase.com
2. Se Supabase down: esperar recuperação
3. Se seu código: fazer rollback (`git revert`)
4. Se networking: verificar DNS/CDN

## Testes de Backup

Recomendado: Testar restauração 1x por mês

```bash
# 1. Criar backup de teste
supabase db dump --db-url "postgresql://..." > test_backup.sql

# 2. Restaurar em database de teste
psql "postgresql://test-db" < test_backup.sql

# 3. Validar dados
# SELECT COUNT(*) FROM conversations;
# SELECT COUNT(*) FROM council_results;

# 4. Confirmar sucesso
echo "✅ Backup test passed"
```

## Checklist

### Daily (Automático)

- [ ] Supabase backup automático rodando
- [ ] Logs de backup sem erros
- [ ] Retenção: 7-14 dias

### Weekly (Manual)

- [ ] Verificar dashboard backup status
- [ ] Confirmar que último backup tem dados recentes

### Monthly (Teste)

- [ ] Testar restauração de backup
- [ ] Validar integridade dos dados
- [ ] Documentar resultado

## Documentação do Último Backup

| Campo | Valor |
|-------|-------|
| Última backup manual | _______________ |
| Data | _______________ |
| Tamanho | _______________ |
| Restaurado com sucesso? | [ ] Sim [ ] Não |
| Notas | _______________________________ |

## Contatos de Emergência

- **Supabase Status:** https://status.supabase.com
- **Support:** https://supabase.com/support
- **On-call:** _______________
