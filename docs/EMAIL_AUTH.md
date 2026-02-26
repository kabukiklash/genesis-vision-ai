# Configuração de E-mails de Autenticação - Genesis Vision AI

## Problema

Os e-mails de confirmação de cadastro (e outros) saem como **"Supabase Auth"**. Para usar o nome do app (**Genesis Vision AI**), é necessário configurar o envio de e-mail do projeto.

---

## Solução: Custom SMTP

O Supabase permite personalizar o remetente **apenas** ao usar um **Custom SMTP**. O SMTP padrão do Supabase não permite mudar o nome do remetente e tem limite de 2 e-mails/hora só para endereços autorizados.

### Passo a passo

1. **Criar conta em um provedor de e-mail** (gratuito para testes):
   - [Resend](https://resend.com) – recomendado, fácil e gratuito
   - [Brevo](https://www.brevo.com)
   - [SendGrid](https://sendgrid.com)
   - [Postmark](https://postmarkapp.com)

2. **Configurar no Supabase Dashboard**
   - Acesse: **Authentication** → **SMTP**  
     ou: https://supabase.com/dashboard/project/[SEU_PROJECT_REF]/auth/smtp

3. **Preencher os campos**
   - **Enable Custom SMTP**: ativar
   - **Sender email**: ex: `noreply@seudominio.com` ou o que o provedor fornecer
   - **Sender name**: **Genesis Vision AI** ← isto substitui "Supabase Auth"
   - **Host, Port, User, Password**: dados fornecidos pelo provedor

### Exemplo com Resend

1. Criar conta em [resend.com](https://resend.com)
2. Em **API Keys**, criar uma chave
3. Em **Domains**, adicionar o domínio (ou usar o domínio de teste)
4. No Supabase → Auth → SMTP:
   - Host: `smtp.resend.com`
   - Port: `465` (ou `587` se o provedor indicar)
   - User: `resend`
   - Password: sua API Key
   - Sender email: `onboarding@resend.dev` (domínio de teste) ou `noreply@seudominio.com`
   - **Sender name**: `Genesis Vision AI`

---

## Personalizar os templates de e-mail

Para mudar o texto e o assunto dos e-mails:

1. **Authentication** → **Email Templates**
2. Selecionar o template desejado (ex: **Confirm signup**)
3. Editar:
   - **Subject**: ex. "Confirme seu cadastro - Genesis Vision AI"
   - **Body (HTML)**: manter as variáveis `{{ .ConfirmationURL }}`, `{{ .Email }}` conforme necessário

Variáveis disponíveis: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`, `{{ .SiteURL }}`, `{{ .RedirectTo }}`, etc.

---

## Resumo

| O que muda | Onde configurar |
|------------|------------------|
| Nome do remetente ("Genesis Vision AI") | Auth → SMTP → **Sender name** |
| Assunto do e-mail | Auth → Email Templates |
| Conteúdo do e-mail | Auth → Email Templates |
| Endereço remetente (From) | Auth → SMTP → **Sender email** |

⚠️ **Importante**: o nome "Supabase Auth" só muda ao configurar **Custom SMTP** com um provedor externo.
