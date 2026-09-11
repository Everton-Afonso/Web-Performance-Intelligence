# Backend (Node.js + TypeScript + Express)
FROM node:20-alpine AS base
ENV NODE_ENV=production
WORKDIR /app

FROM base AS build
COPY package.json yarn.lock tsconfig.json tsconfig.build.json ./
RUN yarn install --frozen-lockfile
COPY src ./src
RUN yarn build

FROM base AS runtime
ENV PORT=3000
COPY --from=build /app/package.json /app/yarn.lock ./
COPY --from=build /app/dist ./dist
RUN yarn install --frozen-lockfile --production && yarn cache clean
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]