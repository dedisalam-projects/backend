const path = require('path');

module.exports = {
  apps: [
    {
      name: 'gateway',
      cwd: path.join(__dirname, '..', 'backend'),
      script: 'dist/apps/gateway/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'user-service',
      cwd: path.join(__dirname, '..', 'backend'),
      script: 'dist/apps/user-service/main.js',
      env: {
        NODE_ENV: 'production',
        USER_SERVICE_PORT: 3011,
        USER_SERVICE_TCP_PORT: 3001
      }
    },
    {
      name: 'notification-service',
      cwd: path.join(__dirname, '..', 'backend'),
      script: 'dist/apps/notification-service/main.js',
      env: {
        NODE_ENV: 'production',
        NOTIFICATION_SERVICE_PORT: 3012,
        NOTIFICATION_SERVICE_TCP_PORT: 3002
      }
    },
    {
      name: 'dashboard',
      cwd: path.join(__dirname, '..', 'frontend-web'),
      script: 'pm2-dashboard.mjs',
      env: {
        PORT: 4000,
        NG_ALLOWED_HOSTS: 'localhost,127.0.0.1'
      }
    },
    {
      name: 'landing',
      cwd: path.join(__dirname, '..', 'frontend-web'),
      script: 'pm2-landing.mjs',
      env: {
        PORT: 4001,
        NG_ALLOWED_HOSTS: 'localhost,127.0.0.1'
      }
    },
    {
      name: 'auth',
      cwd: path.join(__dirname, '..', 'frontend-web'),
      script: 'pm2-auth.mjs',
      env: {
        PORT: 4002,
        NG_ALLOWED_HOSTS: 'localhost,127.0.0.1'
      }
    }
  ]
};
