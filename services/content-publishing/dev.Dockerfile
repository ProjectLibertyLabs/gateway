FROM node:18-alpine3.17

WORKDIR /app

# Start the application
CMD ["npm", "run", "start:dev:docker"]
