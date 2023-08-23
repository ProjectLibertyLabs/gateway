import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';
import { WorkerService } from './worker.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  const appService = app.get(WorkerService);
  console.log(appService.getHello());
}
bootstrap();
