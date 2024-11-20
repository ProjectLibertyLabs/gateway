/**

This is a basic example of using the Account service with SIWF v2.

Requirements
- Account service is running at localhost:3000
- Start this service with node example.mjs
- Visit http://localhost:3030

*/

import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const HOSTNAME = 'localhost';
const PORT = 3030;
const ACCOUNT_SERVICE = 'http://localhost:3000';
const SIWF_CALLBACK = `http://${HOSTNAME}:${PORT}/login/callback`;
const POLL_INTERVAL = 1000;

const requestSignIn = async () => {
  const params = new URLSearchParams([
    ['callbackUrl', SIWF_CALLBACK],
    ['credentials', 'VerifiedGraphKeyCredential'],
    ['credentials', 'VerifiedEmailAddressCredential'],
    ['credentials', 'VerifiedPhoneNumberCredential'],
    ['permissions', 'dsnp.profile@v1'],
    ['permissions', 'dsnp.public-key-key-agreement@v1'],
    ['permissions', 'dsnp.public-follows@v1'],
    ['permissions', 'dsnp.private-follows@v1'],
    ['permissions', 'dsnp.private-connections@v1'],
  ]);

  const response = await fetch(`${ACCOUNT_SERVICE}/v2/accounts/siwf?${params.toString()}`);
  console.log(response);
  if (!response.ok) {
    throw new Error('Failed to get redirect URL');
  }
  const data = await response.json();
  console.error('data', data);
  return data.redirectUrl;
};

function formatHtml(content, script = '') {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css">
        ${script}
      </head>
      <body style="padding: 20px">
        ${content}
        <p style="padding-top:40px">
          <a href="/">Restart</a>
        </p>
      </body>
    </html>
  `;
}

function handleRootRequest(_req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(
    formatHtml(
      `<h1>SIWF V2 Example</h1><a href="/signin"><img src="button-siwf-primary.svg"></a>`,
    ),
  );
}

function handleButtonRequest(_req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'image/svg+xml');
  fs.readFile(path.join(import.meta.dirname, 'button-siwf-primary.svg'), (_err, data) => {
    res.end(data);
  });
}
  
async function handleSignInRequest(_req, res) {
  try {
    const redirectUrl = await requestSignIn();
    res.writeHead(302, { Location: redirectUrl });
    res.end();
  } catch (e) {
    res.statusCode = 500;
    res.end(`Error: ${e.message}`);
  }
}

async function handleLoginCallback(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const authorizationCode = url.searchParams.get('authorizationCode');

    if (authorizationCode) {
      const response = await fetch(`${ACCOUNT_SERVICE}/v2/accounts/siwf`, {
        method: 'POST',
        body: JSON.stringify({ authorizationCode }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const result = await response.json();
        console.log('SIWF POST Result: ', JSON.stringify(result));
        const { msaId } = result;
        if (msaId) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(
            formatHtml(
              `<h1>Login Successful</h1><p>MSA ID: ${msaId}</p><p>Details: <pre>${JSON.stringify(result, null, 2)}</pre></p>`,
            ),
          );
        } else {
          const script = `<script>
            function pollForMsaId(controlKey) {
              const interval = setInterval(() => {
                fetch('/poll?controlKey=' + controlKey)
                  .then(response => response.json())
                  .then(data => {
                    if (data.msaId) {
                      document.body.innerHTML = '<h1>Login Successful</h1><p>MSA ID: ' + data.msaId + '</p><p>Details: ' + '<pre>' + JSON.stringify(data, null, 2) + '</pre></p>';
                      clearInterval(interval);
                    }
                  });
              }, ${POLL_INTERVAL});
            }
            pollForMsaId('${result.controlKey}');
          </script>`;
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(formatHtml(`<h1>Login Pending</h1><p>Waiting for MSA ID...</p>`, script));
        }
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(formatHtml(`<h1>Login Failed</h1><p><pre>${JSON.stringify(await response.json(), null, 2)}</pre></p>`));
      }
    } else {
      throw new Error('Invalid callback');
    }
  } catch (e) {
    res.statusCode = 500;
    res.end(`Error: ${e.message}`);
  }
}

async function handlePollRequest(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const controlKey = url.searchParams.get('controlKey');
    if (controlKey && controlKey !== 'undefined') {
      const response = await fetch(`${ACCOUNT_SERVICE}/v1/accounts/account/${controlKey}`);

      const result = await response.json();
      console.log('Got Account Response:', JSON.stringify(result));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(result));
    } else {
      res.statusCode = 202;
      res.end();
    }
  } catch (e) {
    res.statusCode = 500;
    res.end(`Error: ${e.message}`);
  }
}

const server = http.createServer((req, res) => {
  console.log(`RECEIVED: ${req.method} Request for ${req.url}`);
  if (req.url === '/' && req.method === 'GET') {
    handleRootRequest(req, res);
  } else if (req.url === '/button-siwf-primary.svg' && req.method === 'GET') {
    handleButtonRequest(req, res);
  } else if (req.url === '/signin' && req.method === 'GET') {
    handleSignInRequest(req, res);
  } else if (req.url.startsWith('/login/callback') && req.method === 'GET') {
    handleLoginCallback(req, res);
  } else if (req.url.startsWith('/poll') && req.method === 'GET') {
    handlePollRequest(req, res);
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

server.listen(PORT, HOSTNAME, () => {
  console.log(`Server running at http://${HOSTNAME}:${PORT}/`);
});
