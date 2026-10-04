# Imagem do site: build do frontend + Caddy (HTTPS, cabeçalhos de segurança, proxy da API).
#
#   docker build -f deploy/web.Dockerfile -t sorteia-web .

FROM node:22-alpine AS build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# E-mail de contato exibido na política de privacidade (opcional; entra no build).
ARG VITE_CONTACT_EMAIL=""
ENV VITE_CONTACT_EMAIL=$VITE_CONTACT_EMAIL
RUN npm run build


FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/frontend/build/csp.caddy /etc/caddy/csp.caddy
COPY --from=build /src/frontend/build/client /srv
