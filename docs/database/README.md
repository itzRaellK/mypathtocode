# Banco de dados

O banco usa o schema próprio `learning`. O schema `public` não recebe tabelas da
aplicação.

## Instalação

Execute somente:

```text
install.sql
```

Depois, no painel Supabase, adicione `learning` em:

```text
Project Settings > API > Exposed schemas
```

## Modelo

O banco não tenta representar cada tópico da aula em uma tabela.

- `profiles`: perfil, preferências e estatísticas resumidas.
- `tracks`: mapa curricular leve gerado pela IA em `outline`.
- `lesson_contents`: versões detalhadas geradas sob demanda.
- `lesson_states`: progresso e rascunhos salvos por aula.
- `attempts`: códigos enviados para avaliação.
- `evaluations`: nota e feedback da IA.
- `ai_runs`: histórico, consumo e falhas das gerações.

Trilhas, módulos, aulas, exercícios, arquivos iniciais e rubricas ficam
agrupados em JSONB. O banco preserva informações e histórico; a IA cria o
material.
