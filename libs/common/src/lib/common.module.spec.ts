import { Test } from '@nestjs/testing';
import { CommonModule } from './common.module';

describe('CommonModule', () => {
  it('should compile the module', async () => {
    const module = await Test.createTestingModule({
      imports: [CommonModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
