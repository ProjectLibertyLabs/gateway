# Use a multi-stage build for efficiency
FROM node:18 AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./

RUN npm install --only=production
EXPOSE 3000

CMD ["sh", "-c", "npm run start:api:prod"]
