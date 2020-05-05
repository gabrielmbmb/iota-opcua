ARG NODE_VERSION=13.8.0-slim
FROM node:${NODE_VERSION}

LABEL maintainer="gmartinbdev@gmail.com"

RUN apt-get update && \
	apt-get install -y ca-certificates openssl && \
	npm install -g pm2

WORKDIR /usr/src/app

COPY package.json .
RUN npm install

ADD . /usr/src/app

CMD ["pm2-runtime", "index.js"]
