# Coolify full-stack: Base Directory = . (repo root), Dockerfile = Dockerfile
# Frontend + API on ONE domain — no CORS issues. API at /api

FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
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
COPY --from=client-build /app/client/dist ./public
EXPOSE 3001
CMD ["node", "dist/index.js"]
