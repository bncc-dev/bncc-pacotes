# Imagem do deploy de visualização do site (AWS ECS Express).
# Contexto de build: a RAIZ do monorepo (docker build -f site/Dockerfile .).
# O lançamento usa Cloudflare Pages; este container serve bncc.dev antes do
# dia D, com noindex (ver nginx.conf).

FROM node:22-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/bncc/package.json packages/bncc/
COPY packages/mcp/package.json packages/mcp/
COPY site/package.json site/
RUN pnpm install --frozen-lockfile
COPY packages ./packages
COPY fixtures ./fixtures
COPY site ./site
RUN pnpm --filter @bncc/dados build && pnpm --filter site build

FROM nginx:1.27-alpine
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/site/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1
