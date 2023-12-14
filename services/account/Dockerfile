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

COPY ./lua ./lua
RUN npm install --only=production
EXPOSE 3000
ENV START_PROCESS="api"


CMD ["sh", "-c", "if [ \"$START_PROCESS\" = \"api\" ]; then npm run start:api:prod; else npm run start:worker:prod; fi"]
