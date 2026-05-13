import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function daysAgo(n: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function daysFromNow(n: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  // Группа
  let group = await prisma.group.findFirst({ where: { name: 'Группа 1-А' } });
  if (!group) group = await prisma.group.create({ data: { name: 'Группа 1-А', course: 2 } });

  // Куратор
  const curatorHash = await bcrypt.hash('curator123', 10);
  await prisma.user.upsert({
    where: { email: 'curator@sabil.com' },
    update: {},
    create: { firstName: 'Айша', lastName: 'Муминова', email: 'curator@sabil.com', passwordHash: curatorHash, role: 'CURATOR' },
  });

  // Студент
  const studentHash = await bcrypt.hash('student123', 10);
  await prisma.user.upsert({
    where: { email: 'student@sabil.com' },
    update: {},
    create: { firstName: 'Марьям', lastName: 'Алиева', email: 'student@sabil.com', passwordHash: studentHash, role: 'STUDENT', course: 2, groupId: group.id },
  });

  // Уроки — прошедшие и будущие
  const lessonsData = [
    { subject: 'Грамматика', datetime: daysAgo(14, 10) },
    { subject: 'Чтение', datetime: daysAgo(14, 12) },
    { subject: 'Грамматика', datetime: daysAgo(10, 10) },
    { subject: 'Аудирование', datetime: daysAgo(10, 14) },
    { subject: 'Грамматика', datetime: daysAgo(7, 10) },
    { subject: 'Чтение', datetime: daysAgo(7, 12) },
    { subject: 'Аудирование', datetime: daysAgo(3, 14) },
    { subject: 'Грамматика', datetime: daysAgo(1, 10) },
    { subject: 'Чтение', datetime: daysFromNow(2, 12) },
    { subject: 'Грамматика', datetime: daysFromNow(4, 10) },
    { subject: 'Аудирование', datetime: daysFromNow(7, 14) },
    { subject: 'Чтение', datetime: daysFromNow(9, 12) },
    { subject: 'Грамматика', datetime: daysFromNow(11, 10) },
    { subject: 'Аудирование', datetime: daysFromNow(14, 14) },
  ];

  for (const l of lessonsData) {
    const existing = await prisma.lesson.findFirst({ where: { groupId: group.id, subject: l.subject, datetime: l.datetime } });
    if (!existing) {
      await prisma.lesson.create({ data: { ...l, groupId: group.id } });
    }
  }

  console.log('Seed готов:');
  console.log('  curator@sabil.com / curator123');
  console.log('  student@sabil.com / student123');
  console.log(`  Создано уроков для группы "${group.name}"`);
}

main().finally(() => prisma.$disconnect());
