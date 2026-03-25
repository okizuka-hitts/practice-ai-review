import { Injectable } from '@nestjs/common';

export interface AppConfig {
  githubToken: string;
  anthropicApiKey: string;
  githubRepository: string;
  prNumber: number;
  commentBody: string;
}

@Injectable()
export class ConfigService {
  private readonly config: AppConfig;

  constructor() {
    this.config = this.loadAndValidate();
  }

  private loadAndValidate(): AppConfig {
    const required = [
      'GITHUB_TOKEN',
      'ANTHROPIC_API_KEY',
      'GITHUB_REPOSITORY',
      'PR_NUMBER',
      'COMMENT_BODY',
    ];

    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.error(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
      process.exit(1);
    }

    const prNumber = parseInt(process.env.PR_NUMBER!, 10);
    if (isNaN(prNumber)) {
      console.error('PR_NUMBER must be a valid number');
      process.exit(1);
    }

    return {
      githubToken: process.env.GITHUB_TOKEN!,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
      githubRepository: process.env.GITHUB_REPOSITORY!,
      prNumber,
      commentBody: process.env.COMMENT_BODY!,
    };
  }

  get(): AppConfig {
    return this.config;
  }

  getOwnerAndRepo(): { owner: string; repo: string } {
    const [owner, repo] = this.config.githubRepository.split('/');
    if (!owner || !repo) {
      console.error('GITHUB_REPOSITORY must be in "owner/repo" format');
      process.exit(1);
    }
    return { owner, repo };
  }
}
