const http = require('http');

const server = http.createServer();

server
  .on('request', (request, response) => {
    let body = [];
    request
      .on('data', (chunk) => {
        body.push(chunk);
      })
      .on('end', () => {
        body = Buffer.concat(body).toString();

        console.log(`==== ${request.method} ${request.url}`);
        console.log('> Headers');
        console.log(request.headers);

        console.log('> Body');
        try {
          console.log(JSON.stringify(JSON.parse(body), null, 2));
        } catch (e) {
          console.error(body);
        }
        response.end();
      });
  })
  .listen(process.env.WEBHOOK_PORT ?? 3001);

console.log(`Mock server started! on ${process.env.WEBHOOK_PORT ?? 3001}`);
