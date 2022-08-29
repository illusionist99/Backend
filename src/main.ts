import { NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';

require('dotenv').config();

async function bootstrap() {
  const app = await NestFactory.create<NestApplication>(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: [
      'http://localhost:3500',
      'http://localhost',
      'http://localhost:8000',
    ],
    credentials: true,
  });
  await app.listen(3500);
}
bootstrap();
