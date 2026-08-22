#!/usr/bin/env tsx
/**
 * Generate bcrypt hash for admin password
 * Usage: tsx scripts/generate-admin-password.ts <your-password>
 */

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

async function generatePasswordHash(password: string): Promise<void> {
  if (!password) {
    console.error('❌ Error: Please provide a password as argument');
    console.log('\nUsage: tsx scripts/generate-admin-password.ts <your-password>');
    console.log('Example: tsx scripts/generate-admin-password.ts MySecurePassword123');
    process.exit(1);
  }

  try {
    console.log('🔐 Generating bcrypt hash for your password...\n');
    
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    
    console.log('✅ Password hash generated successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Copy the hash below and set it as ADMIN_PASSWORD_HASH:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(hash);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📝 Steps to update your admin password:');
    console.log('1. Copy the hash above');
    console.log('2. Go to Replit Secrets (Tools → Secrets)');
    console.log('3. Update the ADMIN_PASSWORD_HASH secret with the hash');
    console.log('4. Restart your application\n');
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log(`✓ Verification: Hash ${isValid ? 'works correctly' : 'FAILED'}\n`);
    
  } catch (error) {
    console.error('❌ Error generating hash:', error);
    process.exit(1);
  }
}

// Get password from command line argument
const password = process.argv[2];
generatePasswordHash(password);
