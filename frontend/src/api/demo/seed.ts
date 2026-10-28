// Dados semente do modo demo: 3 usuarios, 12 artigos em markdown, comentarios, favoritos e follows.

import { MOCK_DEMO_LOGIN, MOCK_SEED_PASSWORDS } from './credentials'

export interface DemoUser {
  id: string
  email: string
  username: string
  password: string
  bio: string | null
  image: string | null
}

export interface DemoArticle {
  id: string
  slug: string
  title: string
  description: string
  body: string
  tagList: string[]
  createdAt: string
  updatedAt: string
  authorId: string
  favoritedBy: string[]
}

export interface DemoComment {
  id: string
  articleId: string
  authorId: string
  body: string
  createdAt: string
  updatedAt: string
}

export interface DemoFollow {
  followerId: string
  followeeId: string
}

export interface DemoDb {
  version: number
  nextId: number
  users: DemoUser[]
  articles: DemoArticle[]
  comments: DemoComment[]
  follows: DemoFollow[]
}

export const DEMO_DB_VERSION = 1

const day = 24 * 60 * 60 * 1000
const base = Date.parse('2026-10-20T13:00:00.000Z')
const at = (daysAgo: number, hours = 0) => new Date(base - daysAgo * day + hours * 3600000).toISOString()

interface ArticleSeed {
  slug: string
  title: string
  description: string
  tags: string[]
  author: string
  daysAgo: number
  favoritedBy: string[]
  body: string
}

const articles: ArticleSeed[] = [
  {
    slug: 'composition-api-sem-medo',
    title: 'Composition API sem medo',
    description: 'Como organizar componentes Vue 3 por intenção, não por opção.',
    tags: ['vue', 'frontend', 'arquitetura'],
    author: 'u2',
    daysAgo: 0,
    favoritedBy: ['u1', 'u3'],
    body: `A Options API organiza o código por **tipo** (data, methods, computed). A Composition API organiza por **intenção**.

## O problema

Em um componente grande, a lógica de "busca" fica espalhada entre \`data\`, \`watch\` e \`methods\`. Para entender uma feature você pula pelo arquivo inteiro.

## A saída: composables

\`\`\`ts
export function useSearch(source: Ref<string>) {
  const results = ref<string[]>([])
  watch(source, async (q) => {
    results.value = await search(q)
  })
  return { results }
}
\`\`\`

- Cada composable tem **uma** responsabilidade.
- Fica fácil testar isolado.
- O componente vira uma composição legível.

> Comece pequeno: extraia só o que já se repete em dois lugares.`,
  },
  {
    slug: 'spring-boot-3-com-java-21-na-pratica',
    title: 'Spring Boot 3 com Java 21 na prática',
    description: 'Virtual threads, records e pattern matching em uma API real.',
    tags: ['java', 'spring', 'backend'],
    author: 'u3',
    daysAgo: 1,
    favoritedBy: ['u1'],
    body: `Migrar para o Java 21 não é só trocar a versão no \`pom\`. Algumas features mudam o jeito de escrever código.

## Records para DTOs

\`\`\`java
public record ArticleDto(String slug, String title, List<String> tags) {}
\`\`\`

Imutável, \`equals\` e \`hashCode\` de graça.

## Virtual threads

Com \`spring.threads.virtual.enabled=true\` cada requisição bloqueante custa quase nada. Meça antes e depois: em I/O pesado a diferença aparece no p99.

## Pattern matching

\`\`\`java
if (event instanceof ArticleCreated(var slug, var author)) {
  notify(author, slug);
}
\`\`\`

O código fica mais curto **e** mais seguro.`,
  },
  {
    slug: 'leis-de-ux-que-todo-dev-deveria-conhecer',
    title: 'Leis de UX que todo dev deveria conhecer',
    description: 'Fitts, Hick, Jakob e outras regras que explicam por que sua tela confunde.',
    tags: ['ux', 'design', 'frontend'],
    author: 'u1',
    daysAgo: 2,
    favoritedBy: ['u2', 'u3'],
    body: `Você não precisa ser designer para aplicar princípios testados há décadas.

## Lei de Fitts

O tempo para atingir um alvo depende da **distância** e do **tamanho**. Botões principais grandes e perto do polegar.

## Lei de Hick

Mais opções, mais tempo para decidir. Corte o menu até doer.

## Lei de Jakob

Usuários passam a maior parte do tempo em **outros** sites. Siga convenções: o coração favorita, o logo volta para a home.

## Efeito Von Restorff

O item diferente é lembrado. Por isso só **um** botão primário por tela.

1. Escolha a ação principal.
2. Destaque só ela.
3. Rebaixe o resto para secundário.`,
  },
  {
    slug: 'testes-que-dao-confianca-de-verdade',
    title: 'Testes que dão confiança de verdade',
    description: 'Menos mocks, mais comportamento: o que vale testar em uma API.',
    tags: ['testes', 'backend', 'qualidade'],
    author: 'u3',
    daysAgo: 3,
    favoritedBy: ['u2'],
    body: `Cobertura alta com mocks em tudo é uma sensação de segurança, não segurança.

## Teste o contrato

Suba a aplicação inteira e chame o endpoint como o cliente chamaria:

\`\`\`bash
curl -X POST localhost:8080/api/users \\
  -H 'Content-Type: application/json' \\
  -d '{"user":{"email":"user@example.com","username":"user","password":"<senha>"}}'
\`\`\`

## Teste o caminho ruim

- Token ausente devolve **401**?
- Editar artigo de outra pessoa devolve **403**?
- Campo vazio devolve **422** com a mensagem certa?

Teste verde só comprova o cenário testado. Escolha bem os cenários.`,
  },
  {
    slug: 'dark-mode-sem-flash',
    title: 'Dark mode sem flash',
    description: 'O truque do script inline que evita a tela branca piscando.',
    tags: ['css', 'frontend', 'acessibilidade'],
    author: 'u2',
    daysAgo: 4,
    favoritedBy: ['u1'],
    body: `O flash acontece porque o JavaScript que aplica o tema roda **depois** da primeira pintura.

## Solução

Um script pequeno, síncrono, no \`<head>\`, antes do CSS:

\`\`\`html
<script>
  const saved = localStorage.getItem('theme')
  const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
</script>
\`\`\`

Depois, todo o CSS lê \`[data-theme="dark"]\` e custom properties.

> Não esqueça do \`color-scheme\`: ele ajusta scrollbars e campos nativos.`,
  },
  {
    slug: 'jwt-sem-misterio',
    title: 'JWT sem mistério',
    description: 'O que vai no token, o que nunca deveria ir e como expirar direito.',
    tags: ['seguranca', 'backend', 'java'],
    author: 'u3',
    daysAgo: 5,
    favoritedBy: [],
    body: `Um JWT é só um JSON assinado. **Assinado, não criptografado.** Qualquer pessoa lê o conteúdo.

## Coloque

- \`sub\`: o identificador do usuário
- \`exp\`: a expiração

## Nunca coloque

- Senha, mesmo com hash
- Dados pessoais que não precisam estar ali

## Expiração curta

Token de vida longa vazado é acesso de vida longa. Prefira expirar cedo e renovar.`,
  },
  {
    slug: 'pinia-em-10-minutos',
    title: 'Pinia em 10 minutos',
    description: 'Estado global simples, tipado e fácil de testar.',
    tags: ['vue', 'frontend', 'estado'],
    author: 'u1',
    daysAgo: 6,
    favoritedBy: ['u2'],
    body: `Pinia é a store oficial do Vue. Se você já usou Vuex, vai achar tudo mais curto.

\`\`\`ts
export const useCounter = defineStore('counter', () => {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  function increment() { count.value++ }
  return { count, double, increment }
})
\`\`\`

## Dicas

1. Uma store por domínio (auth, tema, carrinho).
2. Nada de lógica de tela na store.
3. Persistência explícita: você decide o que vai para o \`localStorage\`.`,
  },
  {
    slug: 'acessibilidade-comeca-no-teclado',
    title: 'Acessibilidade começa no teclado',
    description: 'Se não dá para usar sem mouse, não está pronto.',
    tags: ['acessibilidade', 'ux', 'frontend'],
    author: 'u2',
    daysAgo: 7,
    favoritedBy: ['u1', 'u3'],
    body: `Antes de qualquer ferramenta automática, faça o teste mais barato que existe: desconecte o mouse.

## Checklist rápido

- [x] Todo controle recebe foco com **Tab**
- [x] O foco é **visível**
- [x] A ordem de foco segue a ordem visual
- [x] Modais devolvem o foco ao fechar

## Landmarks

Use \`header\`, \`nav\`, \`main\` e \`footer\`. Leitores de tela navegam por eles como atalhos.

> Contraste mínimo de 4.5:1 para texto normal não é sugestão, é o piso.`,
  },
  {
    slug: 'paginacao-offset-ou-cursor',
    title: 'Paginação: offset ou cursor?',
    description: 'Quando o simples basta e quando ele começa a doer.',
    tags: ['backend', 'arquitetura', 'performance'],
    author: 'u3',
    daysAgo: 9,
    favoritedBy: ['u1'],
    body: `## Offset

\`LIMIT 20 OFFSET 40\`. Simples, permite pular para a página 7.

**Problema:** em tabelas grandes o banco ainda percorre as linhas puladas. E se alguém inserir um registro, a página seguinte repete itens.

## Cursor

\`WHERE created_at < :cursor ORDER BY created_at DESC LIMIT 20\`.

Estável e rápido com índice, mas sem "ir para a página 7".

| Critério | Offset | Cursor |
|---|---|---|
| Pular páginas | sim | não |
| Estável com inserções | não | sim |
| Custo em tabela grande | cresce | constante |`,
  },
  {
    slug: 'design-tokens-com-css-puro',
    title: 'Design tokens com CSS puro',
    description: 'Custom properties resolvem 90% do que um design system precisa.',
    tags: ['css', 'design', 'frontend'],
    author: 'u1',
    daysAgo: 11,
    favoritedBy: ['u3'],
    body: `Você não precisa de um framework para ter tokens consistentes.

\`\`\`css
:root {
  --color-primary: #5b5bf7;
  --radius-md: 12px;
  --space-4: 16px;
}
[data-theme='dark'] {
  --color-bg: #0b0d12;
}
\`\`\`

## Regras

- Componentes nunca usam hex cru, só tokens.
- Tokens **semânticos** (\`--color-danger\`) em cima de tokens **brutos** (\`--red-600\`).
- Um lugar só para mudar o tema inteiro.`,
  },
  {
    slug: 'code-review-gentil-e-firme',
    title: 'Code review gentil e firme',
    description: 'Como apontar o problema real sem transformar a revisão em disputa.',
    tags: ['carreira', 'qualidade'],
    author: 'u2',
    daysAgo: 13,
    favoritedBy: ['u1'],
    body: `Uma boa revisão responde três perguntas: **o que** está errado, **por que** importa e **qual** alternativa existe.

## Separe por impacto

- **blocker**: quebra contrato, segurança ou dado
- **should-fix**: dívida que vai custar caro
- **nit**: estilo e preferência

## Evite

- "Por que você fez assim?" sem contexto
- Reescrever o PR inteiro em comentários

Elogie o que está bom. É informação útil também.`,
  },
  {
    slug: 'meu-primeiro-artigo-no-conduit',
    title: 'Meu primeiro artigo no Conduit',
    description: 'Um teste rápido do editor com markdown, tags e tudo mais.',
    tags: ['comunidade'],
    author: 'u1',
    daysAgo: 15,
    favoritedBy: [],
    body: `Olá! Este é um artigo de exemplo escrito com **markdown**.

- Listas funcionam
- \`código inline\` também
- [links](https://realworld-docs.netlify.app/) idem

Experimente editar este artigo: você está logado como o autor no modo demo.`,
  },
]

export function createSeed(): DemoDb {
  const users: DemoUser[] = [
    {
      id: 'u1',
      email: MOCK_DEMO_LOGIN.email,
      username: 'demo',
      password: MOCK_SEED_PASSWORDS.demo,
      bio: 'Conta de demonstração. Escreve sobre UX, Vue e design systems.',
      image: null,
    },
    {
      id: 'u2',
      email: 'ana@conduit.dev',
      username: 'ana_ribeiro',
      password: MOCK_SEED_PASSWORDS.ana,
      bio: 'Engenheira de frontend. Acessibilidade em primeiro lugar.',
      image: null,
    },
    {
      id: 'u3',
      email: 'rafael@conduit.dev',
      username: 'rafael_dev',
      password: MOCK_SEED_PASSWORDS.rafael,
      bio: 'Backend em Java há 10 anos. Gosta de testes que pegam bug de verdade.',
      image: null,
    },
  ]

  const seededArticles: DemoArticle[] = articles.map((a, i) => ({
    id: `a${i + 1}`,
    slug: a.slug,
    title: a.title,
    description: a.description,
    body: a.body,
    tagList: a.tags,
    createdAt: at(a.daysAgo),
    updatedAt: at(a.daysAgo),
    authorId: a.author,
    favoritedBy: a.favoritedBy,
  }))

  const comments: DemoComment[] = [
    { id: 'c1', articleId: 'a1', authorId: 'u3', body: 'Composables mudaram meu jeito de testar componentes. Ótimo resumo!', createdAt: at(0, 2), updatedAt: at(0, 2) },
    { id: 'c2', articleId: 'a1', authorId: 'u1', body: 'A dica de extrair só o que se repete é de ouro.', createdAt: at(0, 3), updatedAt: at(0, 3) },
    { id: 'c3', articleId: 'a2', authorId: 'u2', body: 'Vocês mediram virtual threads com banco relacional? Fiquei curiosa com o pool de conexões.', createdAt: at(1, 4), updatedAt: at(1, 4) },
    { id: 'c4', articleId: 'a3', authorId: 'u2', body: 'Von Restorff explica tanta tela confusa que já vi por aí.', createdAt: at(2, 1), updatedAt: at(2, 1) },
    { id: 'c5', articleId: 'a3', authorId: 'u3', body: 'Vou mandar para o time de backend também.', createdAt: at(2, 5), updatedAt: at(2, 5) },
    { id: 'c6', articleId: 'a4', authorId: 'u1', body: 'O caminho ruim é onde mora o bug de produção.', createdAt: at(3, 2), updatedAt: at(3, 2) },
    { id: 'c7', articleId: 'a8', authorId: 'u3', body: 'Teste do teclado deveria ser obrigatório em todo PR de UI.', createdAt: at(7, 6), updatedAt: at(7, 6) },
  ]

  const follows: DemoFollow[] = [
    { followerId: 'u1', followeeId: 'u2' },
    { followerId: 'u2', followeeId: 'u3' },
    { followerId: 'u3', followeeId: 'u1' },
  ]

  return { version: DEMO_DB_VERSION, nextId: 100, users, articles: seededArticles, comments, follows }
}
