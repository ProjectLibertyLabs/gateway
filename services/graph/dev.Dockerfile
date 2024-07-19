FROM node:20

RUN apt-get update && \
	apt-get install -y tini && \
	apt-get clean && \
	rm -rf /usr/share/doc /usr/share/man /usr/share/zsh


WORKDIR /app

EXPOSE 3000

ENV START_PROCESS="api"

VOLUME "/app"
