# Vello Parcelamentos

Plataforma de parcelamento no Pix para lojistas.

## Executar

```bash
# Opção 1 — servir a aplicação completa diretamente
npx serve public

# Opção 2 — via Next.js
npm install
npm run dev
```

Acesse a aplicação em `/index.html` (ou pela raiz, que redireciona automaticamente).

## Estrutura

- `public/index.html` — Aplicação completa (área do lojista, checkout e administração)
- `src/` — Estrutura Next.js preparada para evolução e integração futura
- `docs/` — Arquitetura, preparação para banco de dados e plano de integração NexusPag

## Funcionalidades

**Área do lojista**
- Login e cadastro
- Dashboard com saldos e indicadores
- Criação de links de parcelamento (1x a 10x)
- Gestão de vendas e parcelas
- Pagamentos
- Solicitação de saques
- Perfil e suporte

**Checkout público**
- Resumo da compra
- Geração de código Pix de exemplo
- Confirmação de pagamento de exemplo
- Estados de link inválido e expirado

**Administração**
- Painel de indicadores
- Gestão de usuários
- Aprovação e rejeição de saques
- Modo de manutenção

## Aviso importante

Esta versão utiliza dados locais de exemplo. Não processa pagamentos reais, não realiza transferências e não possui autenticação de produção.

Para uso em produção é necessário:
- Backend e banco de dados
- Autenticação e autorização reais
- Integração validada com NexusPag (ver `docs/nexuspag-integration.md`)
- Configuração de webhooks e segurança financeira

## Documentação

- [Arquitetura](docs/architecture.md)
- [Preparação para banco de dados](docs/database-readiness.md)
- [Integração NexusPag](docs/nexuspag-integration.md)

---

Vello Parcelamentos
