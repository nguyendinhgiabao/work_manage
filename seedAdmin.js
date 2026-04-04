const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');

    // Kiểm tra xem đã có admin chưa
    const adminExists = await User.findOne({ email: 'admin' });
    if (adminExists) {
      console.log('Admin account already exists!');
      process.exit(0);
    }

    // Tạo admin
    const adminUser = new User({
      name: 'Administrator',
      email: 'admin',
      password: '123',
      role: 'admin',
    });

    await adminUser.save();
    console.log('Admin account created successfully: admin / 123');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
