module.exports = {
  apps: [
    {
      name: 'gateway',
      script: 'dist/apps/gateway/main.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'user-service',
      script: 'dist/apps/user-service/main.js',
      env: {
        NODE_ENV: 'production',
        USER_SERVICE_PORT: 3011,
        USER_SERVICE_TCP_PORT: 3001
      }
    },
    {
      name: 'notification-service',
      script: 'dist/apps/notification-service/main.js',
      env: {
        NODE_ENV: 'production',
        NOTIFICATION_SERVICE_PORT: 3012,
        NOTIFICATION_SERVICE_TCP_PORT: 3002
      }
    }
  ]
};
