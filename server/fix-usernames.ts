import { db } from './db';
import { users } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function fixUsernames() {
  try {
    console.log('✓ Connecting to database...\n');
    
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users\n`);
    
    for (const user of allUsers) {
      const walletAddress = user.walletAddress;
      const newUsername = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
      
      console.log(`User: ${user.walletAddress.slice(0, 10)}...`);
      console.log(`  Current username: ${user.username}`);
      
      if (user.username !== newUsername) {
        console.log(`  → Updating to: ${newUsername}`);
        
        await db.update(users)
          .set({ username: newUsername })
          .where(sql`${users.walletAddress} = ${walletAddress}`);
        
        console.log(`  ✓ Updated\n`);
      } else {
        console.log(`  ✓ Already correct\n`);
      }
    }
    
    console.log('✓ All usernames updated to match wallet addresses');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixUsernames();
