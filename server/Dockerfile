# Build from REPO ROOT (Coolify: Base Directory = ".", Dockerfile = "server/Dockerfile")
# Serves prototype SPA + /api/* on port 3001. Do NOT deploy prototype/dist as static-only.

FROM node:22-alpine AS client-build
WORKDIR /app/prototype
COPY prototype/package.json prototype/package-lock.json ./
RUN npm ci
COPY prototype/ ./
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
EXPOSE 3001
CMD ["node", "dist/index.js"]
