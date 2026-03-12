FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ sqlite

COPY package.json package-lock.json ./

RUN npm i

COPY . .

RUN mkdir -p /app/data

RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/calculator.db

CMD ["npm", "start"]
