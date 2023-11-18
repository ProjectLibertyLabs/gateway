module.exports = {
    apps: [
      {
        name: 'api',
        script: 'dist/apps/api/main.js',
        env: {
          HTTP_PORT: 3000,
        },
      },
    ],
  };