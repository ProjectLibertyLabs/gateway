// Simple server that will console.log out what ever is sent to it
// Useful for seeing the output of webhooks

const http = require('http');

const PORT = process.env.PORT || 6000;

const server = http.createServer(async (req, res) => {
  let body = '';

  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    console.log(`${new Date().toISOString()} Received ${req.method} request at ${req.url}`);

    try {
      const parsedBody = JSON.parse(body);
      console.log(parsedBody);
    } catch (error) {
      console.error('Error parsing JSON body:', error);
    }

    console.log('\n');

    res.statusCode = 200;
    res.end();
  });
});

server.listen(PORT, () => {
  console.log(`Webhook receiver running at http://localhost:${PORT}/`);
});
