const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const email = 'yahlawat1980@gmail.com';
const newPassword = 'password123';

mongoose.connect('mongodb://localhost:27017/ai-finance-advisor')
  .then(async () => {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(newPassword, salt);
    
    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: email },
      { $set: { password: hash } }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Password reset successful for ${email}`);
    } else {
      console.log(`No user found with email: ${email}`);
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
