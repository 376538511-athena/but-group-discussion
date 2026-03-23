import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import bcrypt from 'bcryptjs';
import { sequelize } from './config/database';
import { User } from './models';

async function seed() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    const existing = await User.findOne({ where: { username: 'admin' } });
    if (existing) {
      console.log('Admin user already exists, skipping seed.');
      process.exit(0);
    }

    const password_hash = await bcrypt.hash('admin123456', 12);

    await User.create({
      username: 'admin',
      email: 'admin@seminar.local',
      password_hash,
      real_name: '管理员',
      role: 'admin',
    });

    console.log('=================================');
    console.log('  Admin user created:');
    console.log('  Username: admin');
    console.log('  Password: admin123456');
    console.log('  ⚠️  Please change password after first login!');
    console.log('=================================');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
