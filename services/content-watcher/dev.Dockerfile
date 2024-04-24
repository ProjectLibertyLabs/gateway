FROM node:20

WORKDIR /app

EXPOSE 3000

ENTRYPOINT [ "npm", "run", "start:watch" ]
