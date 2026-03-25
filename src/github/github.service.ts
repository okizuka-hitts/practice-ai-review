import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { ConfigService } from '../config/config.service';

const MAX_DIFF_SIZE = 100_000; // characters

@Injectable()
export class GithubService {
  private readonly octokit: Octokit;

  constructor(private readonly configService: ConfigService) {
    this.octokit = new Octokit({
      auth: this.configService.get().githubToken,
    });
  }

  async getPullRequestDiff(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<string> {
    const response = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: { format: 'diff' },
    });

    const diff = response.data as unknown as string;

    if (diff.length > MAX_DIFF_SIZE) {
      return (
        diff.slice(0, MAX_DIFF_SIZE) +
        '\n\n... (diff truncated due to size limit)'
      );
    }

    return diff;
  }

  async getPullRequestMetadata(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<{ title: string; body: string }> {
    const response = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    return {
      title: response.data.title,
      body: response.data.body ?? '',
    };
  }

  async postComment(
    owner: string,
    repo: string,
    prNumber: number,
    body: string,
  ): Promise<void> {
    await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });
  }
}
