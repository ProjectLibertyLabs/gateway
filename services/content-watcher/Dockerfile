# Use a multi-stage build for efficiency
FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY package*.json ./

RUN npm ci --omit=dev

# We want jq and curl in the final image, but we don't need the support files
RUN apt-get update && \
	apt-get install -y jq curl tini && \
	apt-get clean && \
	rm -rf /usr/share/doc /usr/share/man /usr/share/zsh

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "npm", "run", "start:prod"]
