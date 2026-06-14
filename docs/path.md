# My Path to Code

Plataforma pessoal de estudo pratico de programacao com trilhas e aulas
geradas sob demanda por IA.

## Decisao central

O usuario nao precisa conhecer o assunto nem montar manualmente modulos,
topicos, aulas ou exercicios.

1. O usuario escolhe uma proposta pronta, como `C++ + Unreal: Basico`.
2. A IA gera somente o mapa da trilha: modulos, aulas, objetivos e resumos.
3. Ao abrir uma aula, o usuario solicita seu conteudo detalhado.
4. A IA gera explicacao, exemplo, exercicio, arquivos iniciais e criterios.
5. O usuario estuda, escreve a solucao, salva rascunhos e envia para avaliacao.
6. A IA atribui uma nota e feedback; nota minima 9 aprova a aula.

Esse fluxo economiza chamadas de IA e permite adicionar futuramente qualquer
linguagem ou tecnologia sem reconstruir a aplicacao.

Na trilha inicial, `basico` significa zero absoluto. O aluno nao conhece
programacao, C++ ou Unreal. A progressao comeca por anatomia do codigo, tipos,
variaveis, operadores, controle de fluxo e funcoes; depois avanca para
estruturas, orientacao a objetos e fundamentos necessarios de C++; somente
entao introduz os conceitos e APIs da Unreal.

Intermediario e avancado seguem a mesma regra de progressao. Cada nivel parte
exatamente do conhecimento conquistado no anterior, revisa dependencias antes
de aprofunda-las e nunca presume conceitos ainda nao ensinados. Multiplayer e
GAS sao especializacoes posteriores, nao substitutos da trilha avancada geral.
O catalogo de especializacoes pode crescer continuamente. Ele inclui areas
como multiplayer, GAS, inteligencia artificial, inventario, persistencia, UI,
animacao, arquitetura, performance e ferramentas de editor.

## Papel do banco

O banco apenas persiste o que foi gerado e produzido durante o estudo:

- mapa curricular de cada trilha;
- versoes do conteudo detalhado das aulas;
- rascunhos e progresso;
- codigo enviado, tentativas, notas e feedback;
- historico das chamadas de IA, incluindo falhas e consumo.

Ele nao representa cada modulo, aula, topico ou criterio em tabelas separadas.
Essas estruturas ficam em JSONB porque sao documentos gerados pela IA.

Todas as tabelas pertencem ao schema `learning`. O schema `public` nao e usado
pela aplicacao.

## Arquitetura

- Next.js executa autenticacao, geracao, avaliacao e persistencia no servidor.
- Supabase fornece autenticacao e PostgreSQL.
- Gemini e o provedor inicial gratuito, isolado pela funcao `generateJson`.
- O navegador nunca recebe chaves secretas.
- Supabase Edge Functions nao sao necessarias para o fluxo atual.

## Escopo atual

- cadastro e login;
- dashboard pessoal;
- geracao de trilhas a partir de propostas prontas;
- geracao granular de aulas;
- editor configuravel por arquivos;
- rascunhos;
- avaliacao por IA e progresso;
- perfil, preferencias e historico basico.

Gamificacao avancada, exercicios infinitos e novos provedores podem crescer
sobre esse nucleo depois que o ciclo de estudo estiver validado.
