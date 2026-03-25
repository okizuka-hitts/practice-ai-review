import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ReviewService } from './review.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const reviewService = app.get(ReviewService);
  await reviewService.run();

  await app.close();
}

bootstrap();
