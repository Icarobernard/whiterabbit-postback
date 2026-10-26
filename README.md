# 🐇 WhiteRabbit — Postback Receiver

Plataforma para receber, armazenar e visualizar webhooks de vendas do **Hotmart** e **Kiwify**.  
Construída com Next.js 14 (App Router), TypeScript, Prisma 7 e SQLite.

---

## 🚀 Como Rodar

### Pré-requisitos

- Node.js 18+
- npm 9+

### 1. Clone e instale

```bash
git clone <repo-url>
cd whiterabbit
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="sua-chave-secreta-aqui-mude-em-producao"
NEXTAUTH_URL="http://localhost:3000"
```

> **Em produção (Vercel):** `NEXTAUTH_URL` deve ser a URL pública da sua aplicação, ex: `https://whiterabbit.vercel.app`

### 3. Gere o Prisma e o banco

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Rode em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 📱 Rodando no Android (Termux)

```bash
pkg update && pkg install nodejs npm python3 build-essential
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

> O app ficará disponível em `http://localhost:3000` e também acessível na sua rede local via o IP do celular.

---

## 📡 API Reference

### POST — Receber Postback

```bash
# Hotmart
curl -X POST "http://localhost:3000/api/postback/hotmart?configId=SEU_CONFIG_ID&hottok=SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "abc-123",
    "event": "PURCHASE_APPROVED",
    "version": "2.0.0",
    "data": {
      "buyer": {
        "name": "João Silva",
        "email": "joao@exemplo.com"
      },
      "product": {
        "name": "Curso de Node.js"
      },
      "purchase": {
        "price": { "value": 297, "currency_value": "BRL" },
        "status": "APPROVED",
        "transaction": "HP123456789"
      }
    }
  }'

# Resposta esperada:
# { "received": true, "tokenValid": true }
```

```bash
# Kiwify
curl -X POST "http://localhost:3000/api/postback/kiwify?configId=SEU_CONFIG_ID" \
  -H "Content-Type: application/json" \
  -H "x-kiwify-token: SEU_TOKEN" \
  -d '{
    "order_id": "7f7e2b76-6339-49af-8788-e753e76b61c1",
    "order_status": "paid",
    "payment_method": "credit_card",
    "Product": {
      "product_id": "abc",
      "product_name": "Mentoria Premium"
    },
    "Customer": {
      "full_name": "Maria Santos",
      "email": "maria@exemplo.com"
    },
    "Commissions": {
      "charge_amount": "29700"
    }
  }'
```

---

### GET — Relatório de Vendas

```bash
# Listar todos os postbacks (autenticado)
curl "http://localhost:3000/api/report" \
  -H "Cookie: next-auth.session-token=SEU_TOKEN"

# Com filtros
curl "http://localhost:3000/api/report?platform=hotmart&page=1&limit=20&from=2024-01-01&to=2024-12-31"

# Resposta:
# {
#   "data": [...],
#   "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 },
#   "summary": {
#     "totalRevenue": 12450.50,
#     "totalLogs": 42,
#     "byEvent": [{ "event": "PURCHASE_APPROVED", "count": 38 }],
#     "byPlatform": [{ "platform": "hotmart", "count": 30, "revenue": 9000 }]
#   }
# }
```

**Parâmetros do GET `/api/report`:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `platform` | `hotmart` \| `kiwify` | Filtrar por plataforma |
| `from` | ISO date | Data inicial |
| `to` | ISO date | Data final |
| `configId` | string | Filtrar por webhook config |
| `page` | number | Página (default: 1) |
| `limit` | number | Itens por página (default: 20, max: 100) |
| `tokenValid` | `true` \| `false` | Filtrar por validade do token |

---

## 🏗️ Arquitetura

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts  → NextAuth handler
│   │   │   └── register/route.ts       → Criação de conta
│   │   ├── postback/[platform]/route.ts → Recebe webhooks (POST)
│   │   ├── report/route.ts             → Relatório de vendas (GET)
│   │   ├── webhooks/route.ts           → CRUD de configs
│   │   └── test-webhook/route.ts       → Dispara postback de teste
│   ├── dashboard/
│   │   ├── page.tsx                    → Listagem de postbacks
│   │   └── config/page.tsx             → Gerenciamento de webhooks
│   ├── login/page.tsx
│   └── register/page.tsx
├── lib/
│   ├── auth.ts                         → NextAuth config
│   ├── prisma.ts                       → Singleton PrismaClient
│   └── parsers/
│       ├── hotmart.ts                  → Normaliza payload Hotmart
│       └── kiwify.ts                   → Normaliza payload Kiwify
prisma/
├── schema.prisma                       → Modelos: User, WebhookConfig, PostbackLog
└── migrations/                         → Migrações geradas
```

---

## 🧠 Premissas e Decisões

### ✅ O que foi feito e por quê

**Next.js App Router (monolito serverless)**  
Escolhido para manter tudo em um único processo — sem servidor Express separado. As API Routes rodam no mesmo processo do frontend, simplificando o deploy e o desenvolvimento. Funciona perfeitamente na Vercel e em Node.js local (Termux, VPS).

**SQLite + Prisma 7 com `better-sqlite3`**  
SQLite é zero-config e perfeito para rodar em um celular Android via Termux. O Prisma 7 exige um driver adapter explícito — usamos `@prisma/adapter-better-sqlite3`. Toda a configuração de conexão está em `prisma.config.ts` (novo padrão do Prisma 7).

**NextAuth v5 com JWT sessions**  
Sessions JWT são stateless — não precisam de tabela de sessão no banco, reduzindo queries. Simplifica o deploy e funciona bem para este volume de uso.

**Multi-usuário isolado**  
Cada usuário só vê seus próprios webhooks e postbacks. O isolamento é feito no nível da API (`userId` em todos os filtros).

**Token inválido: aceitar + salvar com flag**  
Em vez de rejeitar HTTP 401 (que impede auditoria), o sistema aceita o postback mas salva `tokenValid: false`. Isso permite investigar discrepâncias entre a plataforma e a configuração local sem perder dados.

**Parsers por plataforma**  
Hotmart e Kiwify têm payloads muito diferentes. Os parsers em `src/lib/parsers/` normalizam ambos para os mesmos campos (`buyerName`, `amount`, `event`, etc.), permitindo que o resto do sistema seja agnóstico à plataforma.

**Suporte a Hotmart `hottok` e Kiwify `x-kiwify-token`**  
Hotmart usa um query param (`?hottok=...`). Kiwify usa um header HTTP (`x-kiwify-token`). Ambos são validados por config, e o valor esperado é armazenado criptografado... *aguarda*... em plaintext (decisão consciente: a segurança aqui é feita pelo token da plataforma + HTTPS, não por criptografia local).

**Payload salvo como string JSON**  
SQLite não tem tipo `JSON` nativo. O payload bruto é salvo como `String` e deserializado quando necessário. Isso preserva 100% dos dados originais para auditoria.

### ❌ O que foi decidido NÃO fazer e por quê

**Turso/libSQL como padrão**  
Foi considerado (Vercel tem filesystem efêmero), mas adicionaria complexidade e dependência de serviço externo. A decisão foi manter SQLite local como padrão e documentar Turso como alternativa. Para a Vercel, o banco pode ser apontado para um Turso via a mesma variável `DATABASE_URL`.

**Webhook signature verification (HMAC)**  
Hotmart suporta verificação HMAC da assinatura do payload (além do `hottok`). Decidimos não implementar nesta versão — o `hottok` cobre o caso de uso básico. A signature HMAC pode ser adicionada como enhancement sem breaking changes.

**WebSockets / Server-Sent Events para live updates**  
Um painel com atualização em tempo real seria ótimo, mas adiciona complexidade de infra. A solução atual tem um botão "Atualizar" manual. O usuário pode usar um refresh automático via `useEffect` com interval se precisar.

**Relatórios em PDF/Excel**  
Fora do escopo inicial. A API de relatório retorna JSON estruturado que pode ser consumido por qualquer ferramenta de visualização (Metabase, Power BI, etc).

**Rate limiting**  
Não implementado nesta versão para manter a simplicidade. Em produção, adicionar `@upstash/ratelimit` ou middleware de rate limit no edge seria recomendado, especialmente para `/api/postback`.

**Testes automatizados**  
O escopo foi mantido pequeno conforme o briefing. A arquitetura de parsers isolados facilita adicionar testes unitários no futuro.

---

## 🌐 Deploy na Vercel

1. Faça push do código para um repositório Git
2. Importe na Vercel
3. Configure as variáveis de ambiente:
   - `NEXTAUTH_SECRET`: string aleatória longa
   - `NEXTAUTH_URL`: URL pública da sua aplicação
   - `DATABASE_URL`: URL do Turso (`libsql://...`) — instale também `@prisma/adapter-libsql`
4. Configure o build command: `npx prisma generate && next build`

---

## 📦 Tech Stack

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 14 | Framework fullstack |
| TypeScript | 5 | Type safety |
| Prisma | 7 | ORM |
| SQLite / better-sqlite3 | — | Banco de dados |
| NextAuth.js | v5 beta | Autenticação |
| bcryptjs | — | Hash de senhas |
| Zod | — | Validação de schema |
