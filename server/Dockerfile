# Coolify API app: Base Directory = server, Ports Exposes = 80, SERVE_CLIENT=false
# Playwright needs Chromium: on Alpine, crawl falls back to fetch unless you use a Playwright base image
# and run `npx playwright install chromium` in the image.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV SERVE_CLIENT=false
ENV PORT=80
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY assets ./assets
EXPOSE 80
CMD ["node", "dist/index.js"]
