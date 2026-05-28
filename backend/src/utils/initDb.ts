import prisma from './prisma';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  const curatorCount = await prisma.user.count({ where: { role: 'CURATOR' } });
  
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
    console.log('✓ Created test curator account');
  }
}
