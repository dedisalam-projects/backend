import axios from 'axios';

describe('GET /api/v1/hello', () => {
  it('should return a message', async () => {
    const res = await axios.get(`/api/v1/hello`);

    expect(res.status).toBe(200);
    expect(res.data.message).toEqual('Hello World');
  });
});
