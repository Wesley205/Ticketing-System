FROM node:20-bookworm-slim AS dependencies

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY --from=dependencies /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
COPY frontend ./frontend
COPY database/migrations ./database/migrations

RUN mkdir -p /app/storage/ticket-attachments \
  && chown -R node:node /app

USER node
WORKDIR /app/backend

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node src/scripts/smokeCheck.js

CMD ["node", "src/server.js"]
