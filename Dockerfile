FROM node:14-alpine

RUN mkdir -p /app
WORKDIR /app

COPY ./package*.json /app/
RUN cd /app/ && npm ci
COPY ./ /app/
WORKDIR /app/

EXPOSE 3000
ENTRYPOINT ["node", "/app/server/index.js"]