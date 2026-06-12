const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Admin = require('./src/models/Admin');
const User = require('./src/models/User');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected!');

    const admins = await Admin.find({});
    console.log('Admin docs:', JSON.stringify(admins, null, 2));

    const users = await User.find({ role: 'admin' });
    console.log('User admin docs:', JSON.stringify(users, null, 2));

    mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
