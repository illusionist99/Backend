import { NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const PORT = process?.env.USERS_PORT || 3500;
  const GAME_PORT = process?.env.GAME_PORT || 3001;
  const CORS = process.env.CORS || 'http://localhost';
  const app = await NestFactory.create<NestApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.use(cookieParser());
  app.enableCors({
    origin: [CORS, `${CORS}:${GAME_PORT}`],
    credentials: true,
  });
  await app.listen(PORT);
}
bootstrap();
