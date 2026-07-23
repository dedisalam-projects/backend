import { ClientTCP } from '@nestjs/microservices';

async function bootstrap() {
  console.log('Testing User Service TCP...');
  const client = new ClientTCP({
    host: 'localhost',
    port: 3001,
  });

  try {
    await client.connect();
    console.log('Connected to TCP Server!');

    const response = await client
      .send('user.hello', { name: 'TCP Tester', correlationId: 'test-123' })
      .toPromise();
    console.log('Response:', response);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.close();
  }
}

bootstrap();
