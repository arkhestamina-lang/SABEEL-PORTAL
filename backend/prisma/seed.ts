import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const GROUPS = [
  { name: 'Братья 1 курс', course: 1 },
  { name: 'Сёстры 1 курс',  course: 1 },
  { name: 'Братья 2 курс', course: 2 },
  { name: 'Сёстры 2 курс',  course: 2 },
  { name: 'Братья 3 курс', course: 3 },
  { name: 'Сёстры 3 курс',  course: 3 },
  { name: 'Братья 4 курс', course: 4 },
  { name: 'Сёстры 4 курс',  course: 4 },
];

const BROTHERS: [string, string][] = [
  ['Ахмад',    'Алиев'],
  ['Юсуф',     'Каримов'],
  ['Умар',     'Хасанов'],
  ['Ибрахим',  'Садыков'],
  ['Мухаммад', 'Рахимов'],
  ['Халид',    'Джабраилов'],
  ['Абдулла',  'Магомедов'],
  ['Исмаил',   'Бакиров'],
];

const SISTERS: [string, string][] = [
  ['Марьям',   'Алиева'],
  ['Зайнаб',   'Каримова'],
  ['Фатима',   'Хасанова'],
  ['Асма',     'Садыкова'],
  ['Айша',     'Рахимова'],
  ['Хадиджа',  'Джабраилова'],
  ['Сафия',    'Магомедова'],
  ['Рукайя',   'Бакирова'],
];

async function main() {
  const passwordHash = await bcrypt.hash('student123', 10);
  const curatorHash  = await bcrypt.hash('curator123', 10);

  // Куратор
  await prisma.user.upsert({
    where: { email: 'curator@sabil.com' },
    update: {},
    create: { firstName: 'Айша', lastName: 'Муминова', email: 'curator@sabil.com', passwordHash: curatorHash, role: 'CURATOR' },
  });

  // Тестовый студент (уже существующий)
  let existingGroup = await prisma.group.findFirst({ where: { name: 'Группа 1-А' } });
  if (!existingGroup) existingGroup = await prisma.group.findFirst({ where: { course: 2 } });

  await prisma.user.upsert({
    where: { email: 'student@sabil.com' },
    update: {},
    create: {
      firstName: 'Марьям', lastName: 'Алиева', email: 'student@sabil.com',
      passwordHash, role: 'STUDENT', course: 2,
      groupId: existingGroup?.id,
    },
  });

  // Создаём 8 новых групп и студентов
  for (let i = 0; i < GROUPS.length; i++) {
    const gData = GROUPS[i];
    const isBrothers = gData.name.startsWith('Братья');
    const pairIndex = Math.floor(i / 2); // 0,0,1,1,2,2,3,3

    let group = await prisma.group.findFirst({ where: { name: gData.name } });
    if (!group) {
      group = await prisma.group.create({ data: { name: gData.name, course: gData.course } });
    }

    const names = isBrothers ? BROTHERS : SISTERS;
    // Два студента на группу (pairIndex * 2 и pairIndex * 2 + 1)
    const idx1 = pairIndex * 2;
    const idx2 = pairIndex * 2 + 1;

    for (const idx of [idx1, idx2]) {
      const [firstName, lastName] = names[idx];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@sabil.com`;
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: { firstName, lastName, email, passwordHash, role: 'STUDENT', course: gData.course, groupId: group.id },
      });
    }
  }

  // Уроки для существующего студента (seed уже был)
  const seedGroup = await prisma.group.findFirst({ where: { OR: [{ name: 'Группа 1-А' }, { name: 'Сёстры 2 курс' }] } });
  if (seedGroup) {
    const now = new Date();
    const lessons = [
      { subject: 'Грамматика', days: -14, hour: 10 },
      { subject: 'Чтение',     days: -10, hour: 12 },
      { subject: 'Грамматика', days: -7,  hour: 10 },
      { subject: 'Аудирование',days: -3,  hour: 14 },
      { subject: 'Грамматика', days: -1,  hour: 10 },
      { subject: 'Чтение',     days:  2,  hour: 12 },
      { subject: 'Грамматика', days:  4,  hour: 10 },
    ];
    for (const l of lessons) {
      const dt = new Date(now);
      dt.setDate(dt.getDate() + l.days);
      dt.setHours(l.hour, 0, 0, 0);
      const exists = await prisma.lesson.findFirst({ where: { groupId: seedGroup.id, subject: l.subject, datetime: dt } });
      if (!exists) await prisma.lesson.create({ data: { subject: l.subject, datetime: dt, groupId: seedGroup.id } });
    }
  }

  const totalGroups  = await prisma.group.count();
  const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
  console.log(`✓ Seed завершён: ${totalGroups} групп, ${totalStudents} студентов`);
  console.log('  curator@sabil.com / curator123');
  console.log('  student@sabil.com / student123');
  console.log('  student123 — пароль для всех тестовых студентов');
}

main().finally(() => prisma.$disconnect());
