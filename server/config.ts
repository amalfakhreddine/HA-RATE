// Configuration file for HA-RATE

export const config = {
  // MongoDB
  mongodbUri: process.env.MONGODB_URI || '',
  
  // TON Blockchain
  tonMerchantWallet: process.env.MAIN_WALLET || '',
  tonSenderPrivateKey: process.env.TON_SENDER_PRIVATE_KEY || '',
  tonWithdrawalFee: '0.50', // TON fee for withdrawals
  
  // Project Wallet (for sending HA-RATE tokens)
  projectWalletKey: process.env.PROJECT_WALLET_KEY || '',
  
  // Feature flags
  withdrawalsEnabled: process.env.WITHDRAWALS_ENABLED === 'true',
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || '',
  
  // Mining
  miningIntervalHours: 6,
  miningBaseReward: 0.2, // Base mining reward in HA-RATE tokens
  
  // Admin (wallet-based - legacy)
  adminWallets: (process.env.ADMIN_WALLETS || '').split(',').map(w => w.trim()).filter(Boolean),
  
  // Admin Authentication (username + password only)
  adminUsername: process.env.ADMIN_USERNAME || '',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || '',
};

// Validation
function validateConfig() {
  const required = [
    { key: 'MONGODB_URI', value: config.mongodbUri },
    { key: 'MAIN_WALLET', value: config.tonMerchantWallet },
    { key: 'SESSION_SECRET', value: config.sessionSecret },
  ];
  
  const missing = required.filter(({ value }) => !value);
  
  if (missing.length > 0) {
    console.error('[Config] Missing required environment variables:');
    missing.forEach(({ key }) => console.error(`  - ${key}`));
    throw new Error(
      `Missing required environment variables: ${missing.map(({ key }) => key).join(', ')}. ` +
      'Please set these in your environment before starting the application.'
    );
  }
  
  // Warn about optional but recommended variables
  if (!config.tonSenderPrivateKey) {
    console.warn('[Config] Warning: TON_SENDER_PRIVATE_KEY not set. Withdrawal coin sending will not work.');
  }
  
  if (!config.projectWalletKey) {
    console.warn('[Config] Warning: PROJECT_WALLET_KEY not set. HA-RATE token sending will not work.');
  }
  
  if (!config.withdrawalsEnabled) {
    console.log('[Config] Withdrawals are currently DISABLED. Set WITHDRAWALS_ENABLED=true to enable.');
  }
}

validateConfig();

export default config;
