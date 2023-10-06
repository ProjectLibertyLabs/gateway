FROM node:18

WORKDIR /app
COPY . .

RUN npm install
EXPOSE 3000
ENV START_PROCESS="api"

CMD ["sh", "-c", "if [ \"$START_PROCESS\" = \"api\" ]; then npm run start:api; else npm run start:worker; fi"]
