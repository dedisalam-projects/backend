const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');

async function seed() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('fullstack');
  const users = db.collection('users');

  const email = 'admin@example.com';
  const existing = await users.findOne({ email });
  if (!existing) {
    const password = await bcrypt.hash('password123', 10);
    await users.insertOne({
      email,
      password,
      name: 'Admin User',
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('User created');
  } else {
    console.log('User already exists');
  }
  await client.close();
}

seed().catch(console.error);
