# Le serveur de transfert du coffre. Companion ne tourne pas sous Windows : il
# vit dans ce conteneur, et sur un hébergeur qui garde un processus allumé
# (les websockets d'avancement l'exigent ; ni Vercel ni Convex ne le font).
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY index.mjs ./

# Le dossier de travail de Companion, vide : les fichiers passent en flux.
RUN mkdir -p /tmp/companion && chown node:node /tmp/companion
USER node

EXPOSE 3020
CMD ["node", "index.mjs"]
