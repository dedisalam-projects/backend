const { MongoClient } = require('mongodb');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

// Load environment variables if .env or environments/.env.development exists
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '..', 'environments', '.env.development'),
    path.join(__dirname, '..', '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...vals] = trimmed.split('=');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = vals.join('=').trim();
          }
        }
      });
    }
  }
}

loadEnv();

const candidates = [
  process.env.USER_SERVICE_MONGO_URI,
  process.env.MONGODB_URI,
  'mongodb://root:rootpassword@localhost:27017/user_db?authSource=admin',
  'mongodb://root:4r!M4n3hKuN40n@localhost:27017/user_db?authSource=admin',
  'mongodb://localhost:27017/user_db',
].filter(Boolean);

async function connectToMongo() {
  for (const uri of candidates) {
    try {
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
      await client.connect();
      console.log(`Connected to MongoDB via: ${uri.replace(/:[^:@]+@/, ':****@')}`);
      return { client, uri };
    } catch {
      // try next candidate
    }
  }
  throw new Error('Failed to connect to MongoDB with any candidate URI');
}

async function seed() {
  const { client, uri } = await connectToMongo();
  const dbName = (uri.split('/').pop() || 'user_db').split('?')[0] || 'user_db';
  const db = client.db(dbName);
  const users = db.collection('users');

  const defaultUsers = [
    {
      email: process.env.DEFAULT_SUPERADMIN_EMAIL || 'superadmin@example.com',
      password: process.env.DEFAULT_SUPERADMIN_PASSWORD || 'Admin123!',
      name: 'Super Administrator',
      role: 'super_admin',
      isActive: true,
    },
    {
      email: 'admin@example.com',
      password: 'password123',
      name: 'Admin User',
      role: 'admin',
      isActive: true,
    },
    {
      email: 'user@example.com',
      password: 'password123',
      name: 'Regular User',
      role: 'user',
      isActive: true,
    },
  ];

  for (const user of defaultUsers) {
    const existing = await users.findOne({ email: user.email });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await users.insertOne({
        email: user.email,
        password: hashedPassword,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✅ User created: ${user.email} (${user.role})`);
    } else {
      console.log(`ℹ️  User already exists: ${user.email} (${existing.role})`);
    }
  }

  await client.close();
  console.log('🎉 Seeding completed successfully!');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
