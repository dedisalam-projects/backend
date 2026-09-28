import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DocumentQueryDto } from './document-query.dto';

describe('DocumentQueryDto', () => {
  it('should instantiate with default values', () => {
    const dto = new DocumentQueryDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(10);
  });

  it('should transform plain object and cast page and limit via @Type(() => Number)', async () => {
    const plain = {
      page: '3',
      limit: '25',
      search: 'test',
      category: 'bus',
      serviceType: 'gocar',
    };

    const dto = plainToInstance(DocumentQueryDto, plain);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(25);
    expect(dto.search).toBe('test');
    expect(dto.category).toBe('bus');
    expect(dto.serviceType).toBe('gocar');

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
