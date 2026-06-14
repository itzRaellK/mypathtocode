# My Path to Code

Plataforma de estudo de programacao com trilhas, aulas e avaliacoes geradas
sob demanda por IA.

## Executar localmente

1. Configure `.env.local`:

```text
PUBLIC_SUPABASE_PROJECT_URL=...
PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.5-flash
```

2. Execute apenas `docs/database/install.sql` no SQL Editor do Supabase.
3. Exponha o schema `learning` em `Project Settings > API > Exposed schemas`.
4. Instale e execute:

```bash
npm install
npm run dev
```

5. Acesse `http://localhost:3000`.

## Estrutura

- `src/app`: rotas e Server Actions.
- `src/components`: componentes e experiencias de pagina.
- `src/lib`: geracao por IA, modelo de aprendizagem e Supabase.
- `docs/database/install.sql`: instalacao completa do banco.

A IA gera primeiro apenas o mapa curricular. O conteudo detalhado de cada aula
e criado somente quando o usuario solicita. Todas as tabelas da aplicacao usam
o schema proprio `learning`.
