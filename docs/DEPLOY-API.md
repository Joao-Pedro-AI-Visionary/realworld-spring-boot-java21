# Deploy da API (Render, plano free)

A API sobe no Render a partir do `render.yaml` da raiz (Blueprint, runtime Docker, usa o
`Dockerfile` multi-stage do repositório). Nenhuma credencial do Render está configurada neste
ambiente, então o deploy precisa ser disparado pelo dono da conta seguindo os passos abaixo.

## Pré-requisitos

1. `render.yaml`, o `WebSecurityConfig` com CORS configurável e este documento precisam estar
   **no branch padrão (`master`) do GitHub**. O botão de deploy lê o `render.yaml` do branch
   padrão; para outro branch, use `.../realworld-spring-boot-java21/tree/<branch>` no parâmetro
   `repo`.
2. Conta no Render (login com GitHub serve). O Render pode pedir um cartão para verificação
   antifraude mesmo no plano free; isso depende da conta e não é cobrado enquanto ficar no free.

## Passo a passo

1. Abra:
   <https://render.com/deploy?repo=https://github.com/Joao-Pedro-AI-Visionary/realworld-spring-boot-java21>
2. Faça login e, se pedido, autorize o acesso do Render ao repositório.
3. Na tela do Blueprint, confira:
   - serviço `realworld-api`, tipo **Web Service**, runtime **Docker**, plano **Free**, região
     `oregon`;
   - variáveis: `JWT_SECRET` (gerada pelo Render), `CORS_ALLOWED_ORIGINS`, `JAVA_OPTS`,
     `PORT=8080`.
4. Clique em **Deploy Blueprint** (ou **Apply**). O primeiro build leva alguns minutos (Gradle
   dentro do Docker).
5. Quando o status ficar **Live**, anote a URL `https://realworld-api-XXXX.onrender.com` e teste:

   ```bash
   curl https://realworld-api-XXXX.onrender.com/actuator/health   # {"status":"UP",...}
   curl https://realworld-api-XXXX.onrender.com/api/tags          # {"tags":[]}
   curl -i -X OPTIONS https://realworld-api-XXXX.onrender.com/api/articles \
     -H "Origin: https://realworld-conduit-vue.vercel.app" \
     -H "Access-Control-Request-Method: POST"
   # espera: 200 e Access-Control-Allow-Origin: https://realworld-conduit-vue.vercel.app
   ```

   Swagger UI: `https://realworld-api-XXXX.onrender.com/swagger-ui.html`.

## Ligar o frontend (Vercel)

1. Na Vercel, projeto do frontend: **Settings > Environment Variables**.
2. Crie `VITE_API_URL` = `https://realworld-api-XXXX.onrender.com/api` (com o sufixo `/api`)
   para **Production** e **Preview**.
3. Variáveis `VITE_*` entram no bundle durante o build, então é preciso **Redeploy** (aba
   Deployments, último deploy, menu, Redeploy) para valer.
4. Abra o site, cadastre um usuário e publique um artigo para validar o fluxo inteiro.

Se o domínio de produção do front mudar, atualize `CORS_ALLOWED_ORIGINS` no Render
(**Environment**) e reinicie o serviço. O valor aceita lista separada por vírgula e padrões como
`https://*.vercel.app`. Atenção: esse padrão libera qualquer app hospedado na Vercel, não só os
previews deste projeto; como a API usa token no header `Authorization` (sem cookies, sem
credenciais CORS), um site de terceiros não consegue agir em nome do usuário, mas se quiser
fechar mais, troque por algo como `https://realworld-conduit-vue-*.vercel.app`.

## Limitações do plano free (verificadas na doc oficial em 2026-10-28)

- **Disco efêmero:** o SQLite fica em `/app/data/dev.db` dentro do container. Todo deploy,
  restart ou hibernação apaga o banco (usuários, artigos, comentários). Serviços free não podem
  usar disco persistente. Para dados duráveis seria preciso plano pago com disco ou um banco
  externo (a aplicação hoje só suporta SQLite).
- **Hibernação:** depois de 15 minutos sem tráfego o serviço é desligado; a próxima requisição
  espera cerca de 1 minuto para ele subir de novo (e o banco volta vazio).
- **750 horas de instância por mês por workspace**; se acabarem, os serviços free ficam
  suspensos até o mês seguinte.
- **0.1 CPU e 512 MB de RAM.** Por isso o `JAVA_OPTS` usa `-XX:+UseSerialGC -Xss512k`,
  limita metaspace e code cache e usa `-XX:TieredStopAtLevel=1` (JIT C1: sobe mais rápido e
  consome menos memória, ao custo de menos desempenho de pico). O entrypoint já aplica
  `-XX:MaxRAMPercentage=75`. No smoke local com `--memory 512m --cpus 0.5` a API ficou em torno
  de 205 MiB e respondeu ao health em cerca de 18 s; com 0.1 CPU no Render o boot deve ser mais
  lento.
- O Render pode reiniciar um serviço free a qualquer momento; sem shell, sem escala horizontal.

## JWT_SECRET e HS512

`generateValue: true` gera um valor aleatório de 256 bits em base64 (44 caracteres). A API usa
`Keys.hmacShaKeyFor(secret.getBytes(UTF_8))`, que escolhe o algoritmo pelo tamanho da chave:
44 bytes resulta em **HS256** (testado localmente: o header do token sai `{"alg":"HS256"}` e a
autenticação funciona). É seguro (256 bits de entropia), mas não é HS512.

Para HS512 (64 bytes ou mais):

1. Gere localmente: `openssl rand -base64 64 | tr -d '\n'` (88 caracteres).
2. No Render, serviço `realworld-api`, **Environment**, edite `JWT_SECRET`, cole o valor e salve
   (o serviço reinicia). Não coloque o valor no repositório.

Trocar o segredo invalida os tokens já emitidos (usuários precisam logar de novo). Como o banco
reseta a cada reinício no free, isso não muda nada na prática.

## Fontes

- Blueprint spec (campos `runtime`, `plan`, `dockerfilePath`, `healthCheckPath`,
  `autoDeployTrigger`, `generateValue`): <https://render.com/docs/blueprint-spec>
- Limites do plano free: <https://render.com/docs/free>
- Porta (`PORT` padrão 10000, pode ser sobrescrita): <https://render.com/docs/web-services>
- Botão Deploy to Render (parâmetro `repo`, branch padrão): <https://render.com/docs/deploy-to-render>
- Cartão para verificação antifraude (relatos da equipe do Render no fórum, não é regra
  documentada): <https://community.render.com/t/free-plan-issue/6479>
