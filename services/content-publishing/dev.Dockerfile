FROM node:20

WORKDIR /app

# COPY . .

# RUN npm install

EXPOSE 3000

ENV START_PROCESS="api"

ENTRYPOINT npm run start:${START_PROCESS}:watch
