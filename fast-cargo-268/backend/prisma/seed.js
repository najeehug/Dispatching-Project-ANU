require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FastCargo 268...');

  const hash = (pw) => bcrypt.hash(pw, 12);

  const dispatcher = await prisma.user.upsert({
    where:  { phone: '+12680000001' },
    update: {},
    create: {
      phone:        '+12680000001',
      name:         'Port Dispatch',
      email:        'dispatch@fastcargo268.com',
      role:         'DISPATCHER',
      passwordHash: await hash('dispatch123'),
    },
  });

  const driver1 = await prisma.user.upsert({
    where:  { phone: '+12680000002' },
    update: {},
    create: {
      phone:        '+12680000002',
      name:         'Marcus Thomas',
      email:        'marcus@fastcargo268.com',
      role:         'DRIVER',
      passwordHash: await hash('driver123'),
      // Seed a location near St John's Antigua
      driverLat:        17.1274,
      driverLng:        -61.8468,
      driverLocationAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where:  { phone: '+12680000003' },
    update: {},
    create: {
      phone:        '+12680000003',
      name:         'Sonia Clarke',
      email:        'sonia@fastcargo268.com',
      role:         'DRIVER',
      passwordHash: await hash('driver123'),
      driverLat:        17.0950,
      driverLng:        -61.8500,
      driverLocationAt: new Date(),
    },
  });

  const customer1 = await prisma.user.upsert({
    where:  { phone: '+12680000010' },
    update: {},
    create: {
      phone:        '+12680000010',
      name:         'Keisha Williams',
      email:        'keisha@example.com',
      role:         'CUSTOMER',
      passwordHash: await hash('customer123'),
    },
  });

  const customer2 = await prisma.user.upsert({
    where:  { phone: '+12680000011' },
    update: {},
    create: {
      phone:        '+12680000011',
      name:         'Devon Charles',
      email:        'devon@example.com',
      role:         'CUSTOMER',
      passwordHash: await hash('customer123'),
    },
  });

  const customer3 = await prisma.user.upsert({
    where:  { phone: '+12680000012' },
    update: {},
    create: {
      phone:        '+12680000012',
      name:         'Sandra Jerome',
      email:        'sandra@example.com',
      role:         'CUSTOMER',
      passwordHash: await hash('customer123'),
    },
  });

  const pkg1 = await prisma.package.upsert({
    where:  { trackingNumber: 'FC268-2024-00841' },
    update: {},
    create: {
      trackingNumber:      'FC268-2024-00841',
      customerId:          customer1.id,
      description:         'Electronics — laptop',
      status:              'CUSTOMS_CLEARED',
      pinLatitude:         17.1274,
      pinLongitude:        -61.8468,
      pinSetAt:            new Date(),
      deliveryNotes:       'Blue gate, call on arrival',
      customsEntryAt:      new Date(Date.now() - 5 * 3600000),
      customsClearedAt:    new Date(Date.now() - 1 * 3600000),
      customsEntryLoggedBy: dispatcher.id,
      customsClearLoggedBy: dispatcher.id,
    },
  });

  await prisma.package.upsert({
    where:  { trackingNumber: 'FC268-2024-00842' },
    update: {},
    create: {
      trackingNumber: 'FC268-2024-00842',
      customerId:     customer2.id,
      description:    'Clothing — 2 boxes',
      status:         'PIN_REQUESTED',
      customsEntryAt: new Date(Date.now() - 3 * 3600000),
    },
  });

  await prisma.package.upsert({
    where:  { trackingNumber: 'FC268-2024-00843' },
    update: {},
    create: {
      trackingNumber: 'FC268-2024-00843',
      customerId:     customer3.id,
      description:    'Appliances',
      status:         'AT_CUSTOMS',
      customsEntryAt: new Date(Date.now() - 2 * 3600000),
    },
  });

  await prisma.packageAssignment.upsert({
    where:  { packageId: pkg1.id },
    update: {},
    create: { packageId: pkg1.id, driverId: driver1.id, assignedBy: dispatcher.id },
  });

  await prisma.package.update({
    where: { id: pkg1.id },
    data:  { status: 'ASSIGNED', assignedAt: new Date() },
  });

  console.log('\n✅ Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Dispatcher  phone: +12680000001  password: dispatch123');
  console.log('  Driver      phone: +12680000002  password: driver123');
  console.log('  Customer    phone: +12680000010  password: customer123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
