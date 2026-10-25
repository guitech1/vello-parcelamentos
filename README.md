# Vello Parcelamentos

Plataforma de parcelamento no Pix para lojistas. Frontend completo com área do lojista, checkout público e painel administrativo.

**Status atual:** Demonstração frontend completa e funcional (dados simulados). Pronta para receber backend, banco de dados e integração real com NexusPag.

## Repositório

https://github.com/guitech1/vello-parcelamentos

## Como executar a demonstração atual

A aplicação de demonstração completa está em `public/index.html` (SPA autocontida).

### Opção rápida (sem build)

```bash
npx serve public
# ou
python3 -m http.server 3000 --directory public
```

Acesse `http://localhost:3000`.

### Com Next.js (estrutura preparada)

```bash
npm install
npm run dev
```

A estrutura Next.js (App Router + TypeScript + Tailwind) está preparada em `src/` para a migração progressiva. A demonstração completa permanece em `public/index.html` até a migração ser finalizada.

## Contas de demonstração

### Área do lojista
- Clique em **Acessar demonstração** na tela de login  
  (ou use qualquer e-mail + senha com ≥ 6 caracteres)

### Painel administrativo
- Acesse pelo link “Acesso administrativo (demonstração)” na tela de login  
  ou `/#/admin/login` e clique em **Entrar como administrador**

## O que está implementado

### Área do lojista
- [x] Login e cadastro com validações
- [x] Dashboard com KPIs (saldo disponível, a liberar, em processamento, total recebido, vendas, parcelas pendentes)
- [x] Criar link de parcelamento (1x a 10x, cálculo de parcelas com ajuste de centavos)
- [x] Gestão de links (busca, filtros, paginação, copiar link)
- [x] Detalhes da venda + histórico de parcelas
- [x] Lista de pagamentos
- [x] Saques (solicitar, MAX, histórico, status “Aguardando aprovação”)
- [x] Perfil e configurações
- [x] Suporte / FAQ
- [x] Navegação sidebar (desktop) + bottom nav (mobile)
- [x] Persistência local (localStorage) + restaurar dados de demonstração

### Checkout público
- [x] Resumo da compra + dados mascarados
- [x] Geração de código Pix demonstrativo
- [x] Simulação de pagamento confirmado
- [x] Estados: aguardando, confirmado, inválido, expirado
- [x] Atualização coerente dos dados entre telas

### Painel administrativo
- [x] Dashboard com indicadores e atividade recente
- [x] Listagem de usuários
- [x] Listagem de pagamentos/vendas
- [x] Fila de aprovação de saques (aprovar / rejeitar)
- [x] Modo de manutenção demonstrativo
- [x] Separação visual da área do lojista

### Qualidade
- [x] Design system completo (cores, tipografia, componentes)
- [x] Responsivo (mobile-first + desktop)
- [x] Validações de formulário
- [x] Estados vazios, loading (skeleton), toasts, modais
- [x] Máscaras de CPF, telefone e chaves Pix
- [x] Formatação monetária em BRL

## Arquitetura (preparada para backend)

```
src/
├── app/                 # App Router (páginas e layouts)
├── components/          # Componentes reutilizáveis
│   └── ui/              # Botões, inputs, badges, etc.
├── features/            # Features por domínio (merchant, checkout, admin)
├── lib/                 # Utilitários (formatação, validação, cálculo)
├── services/            # Contratos e implementações de serviços
├── data/                # Dados de demonstração tipados
└── types/               # Modelos TypeScript
docs/
├── architecture.md
├── nexuspag-integration.md
└── database-readiness.md
public/
└── index.html           # SPA completa de demonstração (atual)
```

## Próximos passos (produção)

1. Migrar a SPA para componentes React/Next.js progressivamente.
2. Implementar autenticação real (JWT/session) e proteção de rotas.
3. Conectar serviços à API backend + banco de dados.
4. Integrar NexusPag (ver `docs/nexuspag-integration.md`).
5. Substituir localStorage por persistência real.
6. Configurar webhooks, idempotência e segurança financeira.

## Documentação

- [Arquitetura](docs/architecture.md)
- [Preparação para banco de dados](docs/database-readiness.md)
- [Integração NexusPag](docs/nexuspag-integration.md)

## Aviso importante

Este repositório contém **apenas frontend de demonstração**.  
Nenhum pagamento real é processado. Todos os valores, QR Codes e códigos Pix são fictícios.  
Não utilize em produção financeira sem backend, autenticação, auditoria e integração real com o adquirente.

---

Vello Parcelamentos · 2026
