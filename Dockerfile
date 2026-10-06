FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY backend ./backend
COPY frontend/dist ./frontend/dist
COPY database/migrations ./database/migrations

RUN test -d ./backend/node_modules \
  && node -e "require('./backend/node_modules/dotenv'); require('./backend/node_modules/express'); require('./backend/node_modules/pg'); require('./backend/node_modules/bcrypt'); require('./backend/node_modules/web-push')" \
  && test -f ./frontend/dist/index.html \
  && mkdir -p /app/storage/ticket-attachments \
  && mkdir -p /app/storage/article-media \
  && chown -R node:node /app

USER node
WORKDIR /app/backend

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node src/scripts/smokeCheck.js

CMD ["node", "src/server.js"]
