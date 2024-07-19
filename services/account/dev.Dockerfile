FROM node:20

WORKDIR /app

EXPOSE 3000

VOLUME [ "/app" ]

ENTRYPOINT [ "./scripts/docker-entrypoint.sh", "watch" ]
