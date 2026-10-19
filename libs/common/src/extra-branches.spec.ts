import 'reflect-metadata';
import { HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { plainToInstance } from 'class-transformer';
import { firstValueFrom } from 'rxjs';

const forRoot = jest.fn((o: any) => o);
jest.mock('nestjs-pino', () => ({ LoggerModule: { forRoot: (o: any) => forRoot(o) } }));

import { createMicroserviceLoggerModule } from './config/module.helper';
import { RpcExceptionFilter } from './filters/rpc-exception.filter';
import { DocumentQueryDto } from './dto/document-query.dto';

const err = async (e: unknown) => {
  try {
    await firstValueFrom(new RpcExceptionFilter().catch(e));
  } catch (x) {
    return x as any;
  }
};

describe('extra branch coverage', () => {
  it('module helper customProps', () => {
    const o: any = createMicroserviceLoggerModule('svc');
    expect(o.pinoHttp.customProps()).toEqual({ service: 'svc' });
  });

  it('rpc filter variants', async () => {
    expect((await err(new HttpException('s', 400))).message).toBe('s');
    expect((await err(new HttpException({ message: ['a', 'b'] }, 400))).message).toBe('a, b');
    expect((await err(new HttpException({ message: 'm' }, 400))).message).toBe('m');
    expect((await err(new HttpException({ x: 1 }, 400))).statusCode).toBe(400);
    expect((await err(new RpcException({ statusCode: 404, message: 'nf' }))).statusCode).toBe(404);
    expect((await err(new RpcException({ foo: 1 }))).statusCode).toBe(500);
    expect((await err(new RpcException('str'))).message).toBe('str');
    expect((await err(new Error('e'))).status).toBe('error');
    expect((await err('weird')).status).toBe('error');
  });

  it('DocumentQueryDto transforms numbers', () => {
    const d = plainToInstance(DocumentQueryDto, { page: '2', limit: '5' });
    expect(d.page).toBe(2);
    expect(d.limit).toBe(5);
  });
});
