import * as Vault from 'node-vault';
import { Logger } from '@nestjs/common';

const logger = new Logger('VaultLoader');

export const vaultLoader = async (): Promise<Record<string, any>> => {
  const vaultAddr = process.env['VAULT_ADDR'];
  const vaultToken = process.env['VAULT_TOKEN'];

  if (!vaultAddr || !vaultToken) {
    logger.warn('VAULT_ADDR or VAULT_TOKEN is missing. Falling back to .env variables.');
    return {};
  }

  try {
    const vault = require('node-vault')({
      apiVersion: 'v1',
      endpoint: vaultAddr,
      token: vaultToken,
    });

    logger.log(`Fetching secrets from Vault at ${vaultAddr}...`);
    // Example path: secret/data/backend
    const result = await vault.read('secret/data/backend');
    logger.log('Secrets successfully loaded from Vault.');

    // Return the secret data which will be merged into ConfigModule
    return result.data.data || {};
  } catch (error) {
    logger.error(`Failed to load secrets from Vault: ${(error as Error).message}`);
    // Return empty object on failure so .env variables serve as fallback
    return {};
  }
};
