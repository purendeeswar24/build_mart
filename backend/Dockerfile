FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN npm install --workspace=@buildmart/backend --workspace=@buildmart/shared

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace=@buildmart/shared && npm run build --workspace=@buildmart/backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/index.js"]
