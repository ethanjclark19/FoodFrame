FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
COPY index.html styles.css app.js server.js ./

ENV NODE_ENV=production
ENV PORT=4173
ENV MAX_UPLOAD_MB=100

EXPOSE 4173
CMD ["npm", "start"]
