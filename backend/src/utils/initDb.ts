import prisma from './prisma';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  try {
    const curatorCount = await prisma.user.count({ where: { role: 'CURATOR' } });
    console.log(`[initDb] Found ${curatorCount} curators`);

    if (curatorCount === 0) {
      const passwordHash = await bcrypt.hash('curator123', 10);
      await prisma.user.create({
        data: {
          firstName: 'Айша',
          lastName: 'Муминова',
          email: 'curator@sabil.com',
          passwordHash,
          role: 'CURATOR'
        }
      });
      console.log('✓ Created test curator account: curator@sabil.com / curator123');
    } else {
      console.log('✓ Curator already exists');
    }
  } catch (err: any) {
    console.error('[initDb] Error:', err.message);
  }
}
