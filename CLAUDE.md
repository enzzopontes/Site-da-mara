# CLAUDE.md – Batata Top Delivery (BATATOP)

Documentação técnica oficial do projeto **BATATOP** (Batata Top Delivery), uma plataforma de delivery de batatas recheadas e macarrão na cidade de Iacanga - SP, Brasil.

---

## 1. Overview
O projeto é uma plataforma de e-commerce e gerenciamento de pedidos (delivery e retirada) focada no restaurante **BATATOP**.
- **Domínio de Negócio**: Food Delivery / Fast Food (foco em batatas recheadas e massas com opcionais/adicionais).
- **Público-Target**: Clientes finais na região de Iacanga-SP (interface de compras) e operadores da loja (painel de administração).
- **Estágio do Projeto**: Produção / MVP Ativo (banco de dados conectado, pagamentos reais integrados, simulação de fluxo de pedidos em tempo real e notificações ativas).

---

## 2. Tech Stack
Tecnologias e versões reais extraídas das configurações do projeto:
- **Core Runtime & Framework**: React `19.2.0`, Next.js `16.0.10` (App Router).
- **Linguagem**: TypeScript `^5`.
- **Estilização**: Tailwind CSS `^4.1.9` (utilizando a nova sintaxe do Tailwind v4 com `@import "tailwindcss"` e diretiva `@theme` no CSS), `tw-animate-css` `1.3.3`, `tailwindcss-animate` `^1.0.7`.
- **Banco de Dados & Auth**: Supabase (via `@supabase/supabase-js` e `@supabase/ssr` `0.8.0`), banco relacional PostgreSQL com políticas de Row Level Security (RLS) habilitadas.
- **Integração de Pagamentos**: Mercado Pago API (Pix, pagamentos via cartão, criação de preferência de checkout e salvamento de cartão do cliente).
- **Notificações**: 
  - CallMeBot API (notificações via WhatsApp de novos pedidos).
  - Expo Push Notification API (push notifications para dispositivos móveis dos administradores).
- **Impressão Térmica**: Protocolo ESC/POS nativo via APIs de navegador **Web Bluetooth** e **WebUSB** (otimizado para o modelo Kapbom KA-1445 de 58mm).
- **Hospedagem & CI/CD**: Vercel (deploy contínuo automático via integração com GitHub).

---

## 3. Project Structure
Árvore de diretórios comentada detalhando a responsabilidade de cada módulo:

```text
Site-da-mara/
├── app/                            # Rotas e Páginas (Next.js App Router)
│   ├── admin/                      # Painel administrativo (pedidos, produtos, cupons, configurações)
│   ├── ajuda/                      # Central de ajuda e FAQs
│   ├── api/                        # Serverless API Routes
│   │   ├── images/                 # Gestão e exibição de imagens do banco
│   │   │   └── [id]/
│   │   │       ├── notify-order/   # Disparo de notificações de pedido (WhatsApp CallMeBot)
│   │   │       └── test-notify/    # Testes de envio de notificações
│   │   ├── mercadopago/            # Fluxos de checkout, webhook e cartões (Mercado Pago)
│   │   └── notify-new-order/       # Disparo de Expo Push Notifications para admins
│   ├── auth/                       # Callback de autenticação do Supabase
│   ├── cadastro/                   # Página de registro de novos usuários
│   ├── cardapio/                   # Menu de produtos (busca, filtros por categoria)
│   ├── carrinho/                   # Visualização do carrinho de compras
│   ├── checkout/                   # Fluxo de finalização de pedido e pagamento
│   ├── contato/                    # Informações de contato e formulário
│   ├── login/                      # Tela de login (e-mail/senha e Google OAuth)
│   ├── meus-dados/                 # Informações cadastrais do cliente
│   ├── pedidos/                    # Histórico e acompanhamento de status do cliente
│   ├── perfil/                     # Tela do perfil do cliente
│   ├── reset-password/             # Redefinição de senha de usuários
│   ├── seguranca/                  # Informações de segurança
│   ├── setup-required/             # Página exibida caso faltem variáveis do Supabase
│   ├── sobre/                      # Sobre o restaurante (História)
│   ├── globals.css                 # Importação do Tailwind CSS v4 e variáveis de cores/tema (oklch)
│   ├── layout.tsx                  # Layout raiz com Providers globais (Auth, Cart, Theme, Sonner)
│   └── page.tsx                    # Landing page com destaques ordenados por ranking
├── components/                     # Componentes React reutilizáveis
│   ├── ui/                         # Componentes básicos do shadcn/ui (Button, Input, Dialog, etc.)
│   ├── header.tsx                  # Cabeçalho principal com busca, carrinho e verificação de admin
│   ├── footer.tsx                  # Rodapé contendo dados comerciais da loja de Iacanga-SP
│   ├── hero.tsx                    # Hero da home exibindo o produto mais pedido e status da loja
│   ├── thermal-printer.tsx         # Componente/utilitário de interface para conexão bluetooth/USB
│   └── ...                         # Modais de endereço, feedbacks, status e cards de produtos
├── hooks/                          # Custom Hooks do React (use-toast, use-mobile)
├── lib/                            # Lógica de negócio, conexões e utilitários
│   ├── supabase/                   # Configuração dos clientes do Supabase (client, server, admin)
│   ├── addresses-manager.ts        # Gerenciamento de endereços de entrega dos usuários
│   ├── adicionais-manager.ts       # Gerenciamento de adicionais (ex: queijo, bacon) com fallback local
│   ├── auth-context.tsx            # Contexto global de autenticação e OAuth
│   ├── cart-context.tsx            # Contexto do carrinho com persistência no localStorage
│   ├── cupons-manager.ts           # Validação e aplicação de cupons de desconto
│   ├── image-upload-manager.ts     # Upload de imagens convertidas em base64 no Supabase
│   ├── orders-manager.ts           # Criação de pedidos e progressão automática de status
│   ├── store-status-manager.ts     # Controle de horário de funcionamento e cálculo de fila
│   ├── push-notifications.ts       # Geração e disparo de payload do Expo Push
│   ├── thermal-printer.ts          # Driver ESC/POS para impressão Web Bluetooth/WebUSB
│   └── validation.ts               # Sanitização de strings e validação de telefones, e-mails e pedidos
├── public/                         # Arquivos estáticos (imagens de produtos, logos)
├── scripts/                        # Scripts SQL de criação de tabelas e políticas RLS no Supabase
├── styles/                         # CSS global adicional
├── components.json                 # Configuração do shadcn/ui
├── next.config.mjs                 # Configuração do Next.js (com ignoreBuildErrors: false)
├── middleware.ts                   # Middleware de proteção de rotas (admin e usuário) e refresh de sessão
└── tsconfig.json                   # Configurações do TypeScript e aliases de caminhos (@/*)
```

---

## 4. Setup & Commands
Comandos baseados na configuração real do `package.json`:

### Instalação de Dependências
```bash
npm install
```

### Executar em Modo de Desenvolvimento
```bash
npm run dev
```

### Build e Inicialização de Produção
```bash
npm run build
npm run start
```

### Executar Linter
```bash
npm run lint
```

### Banco de Dados (Supabase/PostgreSQL)
Não há um CLI de ORM (como Prisma ou Drizzle) configurado. As tabelas, triggers e RLS são criados rodando os scripts SQL da pasta `/scripts` sequencialmente no editor SQL do console do Supabase:
1. `001_create_tables.sql`
2. `002_create_rls_policies.sql`
3. `003_create_functions.sql`
4. ... seguindo até `010_fix_rls_for_anonymous_orders.sql`.
5. `011_add_admin_roles_and_triggers.sql` (configuração da coluna `role` e triggers automáticos de privilégio de administrador).

---

## 5. Environment Variables
Variáveis de ambiente necessárias para o funcionamento local e de produção (configuradas no `.env.local` localmente e nas variáveis de ambiente da Vercel/Supabase):

| Variável | Escopo | Descrição |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Público | URL do projeto do Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público | Chave pública do Supabase (Anon Key) usada no client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Privado | Chave secreta de administração (bypass de RLS), usada em rotas de API. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Privado | Token de produção/sandbox da API do Mercado Pago. |
| `SISTER_WHATSAPP_NUMBER` | Privado | Número de telefone WhatsApp que receberá os pedidos via CallMeBot (formato: `55...`). |
| `CALLMEBOT_API_KEY` | Privado | Chave de API de autenticação do CallMeBot para disparar mensagens. |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Público | Lista de e-mails de administradores separados por vírgula. |
| `NEXT_PUBLIC_SITE_URL` | Público | URL base do site (fallback para redirecionamento de OAuth/senha). |

---

## 6. Architecture & Design Decisions

### Fluxo de Dados e Comunicação
1. **Frontend para Backend**: O frontend consome rotas serverless do Next.js sob `/app/api/*` para integrações externas (Mercado Pago, CallMeBot, Expo Push) e interage diretamente com o Supabase usando o cliente browser (`getSupabaseBrowserClient`) para buscar dados públicos e gerenciar dados de usuário.
2. **Camada de Dados (Managers)**: O acesso aos dados é encapsulado em classes singleton no diretório `/lib` (ex: `ordersManager`, `storeStatusManager`). Elas realizam as validações de segurança e as chamadas ao Supabase.

### Decisões de Design Importantes
- **Simulação da Progressão de Pedidos & Serverless**: O fluxo avança automaticamente de `pending` -> `preparing` -> `ready` -> `delivered`. Para mitigar o descarte de temporizadores em funções serverless da Vercel (que finalizam a execução após a resposta HTTP), foi integrado um mecanismo de *catch-up* reativo (`catchUpOrderProgression`) no `ordersManager`. Sempre que os pedidos são consultados nas rotas da API ou painéis do cliente/admin, a diferença de tempo (`Date.now() - created_at`) é avaliada e o status é sincronizado no banco de dados. Timers locais em Node.js continuam ativos para atualização em tempo real no ambiente local de desenvolvimento.
- **Cálculo Fila e Tempo de Espera**: O tempo de espera estimado é calculado de forma dinâmica pelo `StoreStatusManager`. O tempo base é somado a 5 minutos adicionais para cada pedido criado nos últimos 10 minutos (fila ativa).
- **Armazenamento de Imagens**: Para simplificar a infraestrutura e evitar dependência de buckets S3 ou Supabase Storage, as imagens enviadas pelos administradores/clientes são convertidas para strings Base64 no cliente e armazenadas no PostgreSQL na tabela `uploaded_images`. A rota `/api/images/[id]` converte a string Base64 de volta para um buffer binário e serve como uma imagem comum com headers de cache eficientes.
- **Segurança (Middleware, Rate Limiting & Guards)**: O arquivo `middleware.ts` atua como middleware de proteção de rotas no Next.js:
  - **Rate Limiting por IP (`lib/rate-limit.ts`)**: 60 req/min para rotas de `/api/*`, 180 req/min para o webhook do Mercado Pago, e 25 req/min para endpoints sensíveis de autenticação (`/login`, `/cadastro`, `/auth/*`), mitigando força bruta, scraping e flooding.
  - **Proteção de Rotas**: Bloqueia rotas administrativas `/admin` e rotas de usuário protegidas (`/pedidos`, `/perfil`, `/meus-dados`, `/checkout`) caso não haja sessão ativa ou o usuário não seja classificado como administrador.
  - **Cabeçalhos HTTP Globais (`next.config.mjs`)**: Configurados headers `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` e `Permissions-Policy`.
- **Validação e Gestão de Administradores**: 
  - A verificação é centralizada através de `isAdminUser(user)` (`lib/supabase/admin.ts`) e checagem da coluna `profiles.role = 'admin'` no PostgreSQL.
  - **Proprietários Mestres (Donos)**: `enzzobaraldo2008@gmail.com` e `maraysis9010@gmail.com`. Apenas os dois e-mails donos têm permissão para adicionar ou remover outros administradores na tela `/admin/administradores` e nas RPCs (`admin_add_admin`, `admin_remove_admin`).
  - **Trigger de Proteção**: O trigger `protect_profiles_role` no banco impede qualquer tentativa de elevação de privilégio não autorizada via cliente.
- **Políticas de Banco (Row Level Security - RLS)**:
  - `013_security_hardening_admin_and_tokens.sql`: Trigger contra alteração de `profiles.role`, restrição de tokens de push para admins e sanitização de `search_path` em RPCs.
  - `014_secure_orders_and_order_items.sql`: Isolamento de pedidos (clientes acessam estritamente seus próprios pedidos `auth.uid() = user_id`, enquanto administradores gerenciam todos).
  - `015_admin_write_policies_catalog.sql`: Controle de catálogo (permissão de INSERT, UPDATE e DELETE em `products`, `adicionais`, `product_adicionais`, `coupons` e `store_settings` concedida exclusivamente a administradores).

---

## 7. Code Conventions

### Convenções de Nomenclatura e Estilo
- **Componentes React**: Nomeados em kebab-case para os arquivos (ex: `add-to-cart-dialog.tsx`) e PascalCase para o nome do componente (ex: `AddToCartDialog`).
- **Camadas de Utilidade/Gerenciadores**: Localizados em `/lib`, em kebab-case, exportando instâncias singleton nomeadas em camelCase (ex: `export const ordersManager = new OrdersManager()`).
- **Banco de Dados (PostgreSQL)**: Tabelas e colunas usam `snake_case` (ex: `order_items`, `discount_amount`). O mapeamento para `camelCase` ocorre nos métodos correspondentes dos managers.
- **TypeScript**: Tipagem estrita exigida nos arquivos sob `/lib/supabase/types.ts`.
- **Estilização**: Uso exclusivo das classes utilitárias do Tailwind CSS v4. Extensões de tema e cores personalizadas (utilizando espaços de cor `oklch`) devem ser adicionadas diretamente em `app/globals.css` na seção `@theme`.

### Padrão de Commits
Os commits seguem mensagens curtas e diretas em português descrevendo a alteração funcional (ex: `webhook implementado`, `atualizado insta`, `qr no app bonito`).

---

## 8. Testing Strategy
- **Framework de Testes**: Atualmente **não há** framework de testes automatizados configurado (sem Jest, Vitest ou Playwright nas dependências de desenvolvimento).
- **Estratégia de Validação**: Toda verificação de integridade e regressão é efetuada de maneira manual pelo desenvolvedor em ambiente de desenvolvimento local (`npm run dev`) ou em branches de preview da Vercel.

---

## 9. Constraints & Guardrails (Regras Importantes)
- 🚫 **Nunca exponha chaves secretas no cliente**: A chave `SUPABASE_SERVICE_ROLE_KEY` e o token `MERCADO_PAGO_ACCESS_TOKEN` nunca devem ser importados ou utilizados em componentes do lado do cliente (arquivos com `"use client"`). Toda lógica que necessita dessas credenciais deve residir em rotas serverless (`/app/api/*`).
- 🚫 **Não comite arquivos `.env` ou `.env.local`**: Mantenha as chaves de API reais fora do controle de versão do Git.
- ⚠️ **Verificação de Compilação no Build**: A propriedade `typescript.ignoreBuildErrors: false` está ativa no `next.config.mjs`. O build de produção da Vercel falhará se houver erros de tipagem do TypeScript. Garanta que o código compila rodando localmente `npx tsc --noEmit` antes de realizar o push para a branch principal.
- ⚠️ **Sincronia de Administradores**: Utilize o validador `isAdminUser(user)` importado de `lib/supabase/admin.ts` para checar privilégios administrativos. Evite duplicar lógicas ou chumbá-las estaticamente nas telas.

---

## 10. Guidance for AI Assistants

### Fluxo de Investigação Sugerido
Antes de criar novas lógicas ou fazer perguntas ao usuário, investigue na seguinte ordem:
1. **Modelos de Dados**: Verifique `/lib/supabase/types.ts` para entender as entidades.
2. **Acesso ao Banco**: Examine os arquivos singleton correspondentes em `/lib/*-manager.ts`. Nunca crie conexões ad-hoc ao Supabase se um Manager correspondente já existir.
3. **Estilização**: Veja o design tokens e classes de cor em `app/globals.css`. Não tente injetar classes Tailwind tradicionais de cores arbitrárias que firam a paleta de cores `oklch` definida no tema (Amarelo primário `#EAB308` / Vermelho acento).

### Check-list antes de propor código/PR
- [ ] O código introduz novas dependências? Se sim, justifique.
- [ ] A alteração envolve componentes clientes? Lembre-se de colocar a diretiva `"use client"` no topo do arquivo.
- [ ] Modificou esquemas de banco de dados? Garanta que o script SQL correspondente foi criado ou documentado em `/scripts`.
- [ ] O deploy no Vercel ignora erros de TypeScript, mas você garantiu que o código compila perfeitamente sem gerar erros locais no terminal?
- [ ] Se a alteração afetar o fluxo de criação de pedido ou o checkout, o CallMeBot WhatsApp foi testado para garantir que a notificação chega de maneira correta formatada?
