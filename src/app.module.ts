import { Module } from '@nestjs/common';
import { AiReviewModule } from './ai-review/ai-review.module';
import { ConfigModule } from './config/config.module';
import { GithubModule } from './github/github.module';
import { ReviewService } from './review.service';

@Module({
  imports: [ConfigModule, GithubModule, AiReviewModule],
  providers: [ReviewService],
})
export class AppModule {}
