# Observabilidade - Genesis Vision AI

## Visão Geral

Sistema de observabilidade com 3 pilares:

1. **Logs** – O que aconteceu (estruturado)
2. **Metrics** – Performance (throughput, latência)
3. **Traces** – Fluxo completo de requisição

## 1. Logging

### Níveis

- `DEBUG` – Detalhes de desenvolvimento (dev only)
- `INFO` – Eventos importantes (login, criação, etc)
- `WARN` – Algo anormal mas app continua
- `ERROR` – Erro que afeta usuário

### Uso

```typescript
import { logger } from '@/lib/logger';

// Debug: informações de desenvolvimento
logger.debug('MyComponent', 'Render started', { props });

// Info: evento importante
logger.info('AuthContext', 'User logged in', { userId: '123' });

// Warn: comportamento inesperado
logger.warn('API', 'Slow response', { duration: 5000, endpoint: '/api/x' });

// Error: falha crítica (também envia para Sentry)
logger.error('Payment', 'Payment failed', { orderId: '456', reason: 'timeout' });
```

### Formato

```
[2026-02-26T15:30:45.123Z] [ERROR] [Payment] Payment failed {"orderId":"456","reason":"timeout"}
```

## 2. Error Tracking (Sentry)

### Painel Sentry

Ir para: https://sentry.io → seu-projeto

- **Issues:** Erros únicos agrupados
- **Performance:** Transações lentas
- **Releases:** Erros por versão

### O que o Sentry captura

- ✅ Uncaught errors
- ✅ Console errors
- ✅ Network errors
- ✅ Performance issues
- ✅ Replay de sessão (em erros)

### Configuração

Variáveis em `.env`:

```
VITE_SENTRY_DSN=https://key@sentry.ingest.sentry.io/project-id
VITE_SENTRY_ENABLED=false   # true em produção
VITE_APP_VERSION=0.1.0
```

## 3. Performance Monitoring

### Métricas (Sentry)

- **LCP** (Largest Contentful Paint): Quando conteúdo principal carrega
- **FID** (First Input Delay): Latência de resposta
- **CLS** (Cumulative Layout Shift): Estabilidade visual

### Objetivos

- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

### Alertas

Configurar em Sentry → Alerts:

1. **Erro novo:** When an error is new → email/Slack
2. **Aumento de erros:** When error frequency increases 100% in 1h
3. **Performance:** When transaction duration > 10s

## Checklist

### Setup Inicial

- [ ] Conta Sentry criada
- [ ] DSN configurado em .env
- [ ] Sentry integrado em main.tsx
- [ ] Logger implementado
- [ ] Primeiro erro capturado em Sentry

### Operacional

- [ ] Revisar Sentry 1x por dia
- [ ] Resolver errors críticos ASAP
- [ ] Testar alertas 1x por mês

### Produção

- [ ] Sentry ativado (VITE_SENTRY_ENABLED=true)
- [ ] Alertas configurados
- [ ] Backups rodando
