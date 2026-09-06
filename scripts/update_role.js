const { MongoClient } = require('mongodb');

async function update() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('user_db');
  const user = await db.collection('users').findOne({email: 'admin@example.com'});
  console.log('Before update:', user);
  await db.collection('users').updateOne({email: 'admin@example.com'}, {$set: {role: 'admin'}});
  const updatedUser = await db.collection('users').findOne({email: 'admin@example.com'});
  console.log('After update:', updatedUser);
  await client.close();
}

update().catch(console.error);
