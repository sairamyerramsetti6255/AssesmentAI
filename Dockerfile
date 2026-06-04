# Coolify full-stack: Base Directory = . (repo root), Dockerfile = Dockerfile
# Frontend + API on ONE domain — no CORS issues. API at /api

# Prototype SPA (replaces client on same domain) — API calls go to /api on this server
FROM node:22-alpine AS client-build
WORKDIR /app/prototype
COPY prototype/package.json prototype/package-lock.json ./
RUN npm ci
COPY prototype/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM node:22-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV SERVE_CLIENT=true
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/prototype/dist ./public
# Coolify defaults to ports_exposes: 80 — must match PORT (do not set PORT=3001 unless you change Coolify port too)
ENV PORT=80
EXPOSE 80
CMD ["node", "dist/index.js"]
