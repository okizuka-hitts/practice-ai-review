import { Injectable } from '@nestjs/common';
import { AiReviewService } from './ai-review/ai-review.service';
import { ConfigService } from './config/config.service';
import { GithubService } from './github/github.service';

const TRIGGER_WORD = '/ai-review';

@Injectable()
export class ReviewService {
  constructor(
    private readonly configService: ConfigService,
    private readonly githubService: GithubService,
    private readonly aiReviewService: AiReviewService,
  ) {}

  async run(): Promise<void> {
    const config = this.configService.get();
    const { owner, repo } = this.configService.getOwnerAndRepo();

    if (!config.commentBody.includes(TRIGGER_WORD)) {
      console.log(
        `Comment does not contain trigger word "${TRIGGER_WORD}". Skipping.`,
      );
      return;
    }

    console.log(
      `Starting AI review for PR #${config.prNumber} in ${config.githubRepository}`,
    );

    try {
      console.log('Fetching PR diff...');
      const diff = await this.githubService.getPullRequestDiff(
        owner,
        repo,
        config.prNumber,
      );

      if (!diff.trim()) {
        await this.githubService.postComment(
          owner,
          repo,
          config.prNumber,
          '> [!NOTE]\n> No diff found for this pull request.',
        );
        return;
      }

      console.log('Fetching PR metadata...');
      const prMetadata = await this.githubService.getPullRequestMetadata(
        owner,
        repo,
        config.prNumber,
      );

      console.log('Requesting AI review...');
      const reviewResult = await this.aiReviewService.review(
        diff,
        config.commentBody,
        prMetadata,
      );

      const comment = `## AI Code Review\n\n${reviewResult}\n\n---\n*Reviewed by [practice-ai-review](https://github.com/${config.githubRepository})*`;

      console.log('Posting review comment...');
      await this.githubService.postComment(
        owner,
        repo,
        config.prNumber,
        comment,
      );

      console.log('AI review posted successfully.');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';

      console.error('Review failed:', errorMessage);

      await this.githubService
        .postComment(
          owner,
          repo,
          config.prNumber,
          `> [!WARNING]\n> AI review failed: ${errorMessage}`,
        )
        .catch((postError) => {
          console.error('Failed to post error comment:', postError);
        });

      process.exit(1);
    }
  }
}
