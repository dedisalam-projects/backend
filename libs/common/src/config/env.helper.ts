/**
 * Resolves the appropriate environment file path based on NODE_ENV.
 */
export function getEnvFilePath(): string {
  switch (process.env['NODE_ENV']) {
    case 'test':
      return 'environments/.env.test';
    case 'development':
      return 'environments/.env.development';
    case 'production':
    default:
      return '.env';
  }
}
