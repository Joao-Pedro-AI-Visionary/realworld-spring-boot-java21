# UX e acessibilidade no Conduit (Vue 3)

Este documento descreve como o frontend aplica as Leis de UX e as regras de acessibilidade. Ele foi escrito a partir do código em `src/` (comentário no topo de cada `src/views/*.vue`, `src/styles/main.css`, `src/router/index.ts`, `src/stores/theme.ts` e `index.html`). Quando uma tela muda, atualize o comentário da view e este arquivo juntos.

Telas: Início (`HomeView`), Entrar e Criar conta (`AuthView`), Editor (`EditorView`), Artigo (`ArticleView`), Perfil (`ProfileView`), Configurações (`SettingsView`) e 404 (`NotFoundView`).

## Leis de UX

### Fitts (alvos grandes e perto de onde o dedo já está)

- Token global `--tap: 48px` em `main.css`, usado como altura e largura mínimas dos botões.
- **Mobile:** a navegação principal fica numa barra inferior (`BottomNav`), com até 4 destinos na zona do polegar; no desktop ela some e o cabeçalho assume.
- **Entrar/Criar conta:** campos e botão com 48px ou mais de altura e largura total no mobile.
- **Editor:** "Publicar artigo" grande, no fim do formulário, largura total no mobile.
- **Artigo:** ações com 48px, em linha no mobile.
- **Configurações:** botões de largura total no mobile, 48px de altura.
- **Início e Perfil:** abas e tags clicáveis com 48px de altura mínima.

### Hick (menos opções, decisão mais rápida)

- **Início:** no máximo 3 abas de feed (Global, Seguindo, tag ativa). No desktop aparecem só 12 tags até o usuário pedir "Ver todas (N)"; no mobile as tags viram uma faixa única com rolagem horizontal, para não empurrar o feed para baixo.
- **Entrar/Criar conta:** só os campos indispensáveis (2 no login, 3 no cadastro).
- **Editor:** 4 campos (título, resumo, conteúdo, tags); a pré-visualização fica atrás de uma aba.
- **Perfil:** apenas duas abas, Artigos e Favoritos.
- **Configurações:** a senha é opcional (só preenche quem quer trocar), sem configurações extras.
- **404:** uma saída principal e uma secundária.

### Jakob (o usuário espera que funcione como os sites que ele já usa)

- **Início:** layout clássico de blog, com feed à esquerda, tags na lateral e coração para favoritar.
- **Artigo:** leitura em coluna única de cerca de 70 caracteres, comentários no fim.
- **Entrar/Criar conta:** formulário centralizado com o link para a outra opção logo abaixo.
- **Editor:** tags entram com Enter ou vírgula, como nos editores populares.
- **Perfil:** cabeçalho centralizado com abas, padrão de redes sociais.
- **404:** mensagem clara e saída óbvia para o início.
- **Navegação:** o estado do feed fica na URL (`?tab`, `?tag`, `?page`) e cada aba do perfil tem rota própria (`/profile/:username/favorites`), então o botão Voltar do navegador faz o que o usuário espera.

### Proximidade (o que é relacionado fica junto)

- **Início:** em cada cartão, autor, data e favorito ficam agrupados no topo; tags e tempo de leitura no rodapé.
- **Artigo:** autor, data e tempo de leitura em um bloco; as ações do artigo logo abaixo; os comentários em seção separada.
- **Entrar/Criar conta:** label colado ao campo; erros aparecem acima do botão, onde o usuário já está olhando.
- **Editor:** cada label junto do seu campo; a dica de Markdown logo abaixo do conteúdo.
- **Perfil:** avatar, nome, bio e ação agrupados no cabeçalho.
- **Configurações:** campos agrupados em "Perfil público" e "Conta"; "Sair" fica numa zona própria, separada.

### Von Restorff (um único destaque por tela)

Cada tela tem um único botão primário (cor da marca `#5B5BF7`); o resto é tonal, ghost ou de perigo.

| Tela | Primário | Demais ações |
| --- | --- | --- |
| Início | "Criar conta" (visitante) ou "Escrever artigo" (logado), no hero | tonal/ghost |
| Entrar/Criar conta | "Entrar" / "Criar conta", largura total | link de texto |
| Editor | "Publicar artigo" | tonal |
| Artigo | "Favoritar" | seguir, editar e comentar tonais; apagar com estilo de perigo |
| Perfil | "Seguir" (no próprio perfil vira "Editar perfil", tonal) | abas |
| Configurações | "Salvar alterações" | "Sair" em contorno de perigo |
| 404 | "Voltar para o início" | uma ação secundária |

### Pico-Fim (o fim da tarefa é o que fica na memória)

- **Entrar/Criar conta:** termina com aviso de boas-vindas e volta para onde o usuário queria ir (`?redirect`, preenchido pela guarda de rota quando a página exige login).
- **Editor:** ao publicar, leva direto ao artigo pronto com aviso de sucesso.
- **Artigo:** termina com as tags e um convite a comentar; o comentário publicado aparece no topo na hora.
- **Configurações:** confirmação "Perfil atualizado" ao salvar.
- **404:** tom leve, para não terminar a visita com frustração.
- **Apagar** no artigo pede confirmação em linha, sem modal que trave a rolagem.

### Prägnanz (a forma mais simples possível)

- **Início:** cartões de forma única e repetida; hierarquia só por tamanho e peso de fonte, sem ornamentos.
- **Artigo:** tipografia de leitura limpa e um único nível de cartão para os comentários.
- Tokens de espaço em base 4px e raios fixos (`--radius-sm/md/lg`) mantêm as formas consistentes entre telas.

### Doherty (resposta em menos de 400ms)

- **Skeleton imediato** enquanto carrega: lista do Início, artigo e comentários, cabeçalho e lista do Perfil, artigo existente no Editor (`SkeletonArticle`).
- **Ações otimistas:** `FavoriteButton` e `FollowButton` mudam na hora e revertem se a API falhar.
- **Spinner imediato** no botão de envio em Entrar/Criar conta, Editor e Configurações.

## Acessibilidade

### Contraste (WCAG AA: texto >= 4.5:1)

Valores dos tokens em `main.css`, recalculados com a fórmula de luminância relativa da WCAG 2.x:

| Par | Tema | Contraste |
| --- | --- | --- |
| Branco sobre `--brand` `#5B5BF7` (CTA) | ambos | 4.90:1 |
| `--text` `#12141C` sobre `--bg` `#F7F8FB` | claro | 17.31:1 |
| `--text-muted` `#5A6072` sobre `--bg` | claro | 5.90:1 |
| `--brand-text` `#4343DD` sobre `--bg` | claro | 6.41:1 |
| `--danger` `#C8283F` sobre `--surface` branco | claro | 5.48:1 |
| `--text` `#EEF0F6` sobre `--bg` `#0B0D12` | escuro | 17.06:1 |
| `--text-muted` `#A2A9BC` sobre `--surface` `#141821` | escuro | 7.56:1 |
| `--brand-text` `#A9A9FF` sobre `--bg` | escuro | 9.08:1 |
| `--danger` `#FF7A8C` sobre `--surface` | escuro | 7.12:1 |
| `--border-strong` (borda de input) sobre `--surface` | claro / escuro | 3.15:1 / 3.05:1 |

A borda de input no tema claro usa `--border-strong` `#8A91A4` (3.15:1 sobre branco), acima do 3:1 pedido para componentes de interface (WCAG 1.4.11). O valor anterior, `#8E95A8`, dava 2.99:1 e foi corrigido.

### Foco visível

- Regra global `:focus-visible` com contorno de 3px na cor `--focus` (`#4343DD` no claro, `#A9A9FF` no escuro) e `outline-offset: 2px`. O foco só aparece na navegação por teclado, não no clique.
- Link "Pular para o conteúdo" (`.skip-link` em `App.vue`) leva ao `#main`.
- Resumo de erros de formulário (`ListErrors`) tem `role="alert"` e `tabindex="-1"`, para receber o foco quando o envio falha.

### Alvos de toque

- Meta do projeto: 48px (`--tap`). Botões, campos e ações principais seguem a meta.
- Todos os alvos interativos (abas, tags clicáveis, chips e o "x" de remover tag do editor, fechar banner e toast) usam `--tap` (48px). As tags dentro dos cartões (`li.tag-pill`, 32px) não são clicáveis.

### Movimento reduzido

- Durações curtas por token (`--dur-fast` 150ms, `--dur-base` 220ms, `--dur-slow` 300ms).
- Com `prefers-reduced-motion: reduce`, animações e transições caem para 0.01ms, o shimmer do skeleton é desligado e `scroll-behavior` volta a `auto`.

### Dark mode sem flash

- Um script inline no `<head>` do `index.html` lê `localStorage['conduit.theme']` (ou `prefers-color-scheme` se não houver escolha salva) e aplica `data-theme` e `color-scheme` no `<html>` antes de qualquer CSS carregar.
- `stores/theme.ts` usa o mesmo valor ao montar o app, salva a escolha manual do `ThemeToggle` e atualiza as metas `theme-color` (`#F7F8FB` claro, `#0B0D12` escuro), para a barra do navegador acompanhar o tema.
- O `favicon.svg` também tem variação para tema escuro via `@media (prefers-color-scheme: dark)` dentro do SVG.

### Rolagem

- `scrollBehavior` do router: o Voltar restaura a posição salva; trocar aba, tag ou página na mesma tela não pula para o topo; navegar para outra tela começa no topo.
- `scroll-padding-top` no `html` compensa o cabeçalho fixo, então âncoras e o foco não ficam escondidos atrás dele.
- No mobile, o rodapé (`.app-footer`) tem `padding-bottom` igual à altura da barra inferior mais `env(safe-area-inset-bottom)`, para o fim da página não ficar sob a barra ou o indicador do sistema.
- Faixas horizontais (tags no mobile, abas) usam `overflow-x: auto` sem barra visível.

### Leitores de tela e estados

- Lista de artigos com `aria-busy` durante o carregamento e `aria-live="polite"`.
- Toasts (`ToastHost`) em região `role="status"` com `aria-live="polite"`.
- Estados de erro (`ErrorState`, falha ao carregar tags, confirmação de apagar) com `role="alert"`.
- `document.title` muda a cada rota (por exemplo "Entrar · Conduit"), o que ajuda quem navega por abas e leitores de tela.
- `<html lang="pt-BR">`.
