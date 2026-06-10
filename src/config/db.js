const mongoose = require('mongoose');

const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (adminEmail && adminPassword) {
      const User = require('../models/User');
      const Admin = require('../models/Admin');
      const adminEmailLower = adminEmail.trim().toLowerCase();

      // Seed in User collection
      const adminExistsInUser = await User.findOne({ role: 'admin' });
      if (!adminExistsInUser) {
        await User.create({
          name: 'System Admin',
          email: adminEmailLower,
          password: adminPassword.trim(),
          phone: '9452032322',
          address: 'Jalalabad Sariyan Chauraha',
          role: 'admin',
        });
        console.log(`Default Admin user (${adminEmailLower}) seeded in User collection successfully.`);
      } else {
        console.log(`Admin user already exists in User collection.`);
      }

      // Seed in Admin collection
      const adminExistsInAdmin = await Admin.findOne({ email: adminEmailLower });
      if (!adminExistsInAdmin) {
        await Admin.create({
          name: 'System Admin',
          email: adminEmailLower,
          password: adminPassword.trim(),
        });
        console.log(`Default Admin seeded in Admin collection successfully.`);
      } else {
        console.log(`Admin user already exists in Admin collection.`);
      }
    }
  } catch (err) {
    console.error(`Admin Seeding Error: ${err.message}`);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/maa_sharde_library');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    await seedAdmin();
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

