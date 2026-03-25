import { Test, TestingModule } from '@nestjs/testing';
import { GithubService } from './github.service';
import { ConfigService } from '../config/config.service';

const mockOctokitRest = {
  pulls: { get: jest.fn() },
  issues: { createComment: jest.fn() },
};

jest.mock('@octokit/rest', () => ({
  Octokit: jest.fn().mockImplementation(() => ({ rest: mockOctokitRest })),
}));

describe('GithubService', () => {
  let service: GithubService;

  const mockConfigService = {
    get: () => ({ githubToken: 'test-token' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<GithubService>(GithubService);
    jest.clearAllMocks();
  });

  describe('getPullRequestDiff()', () => {
    it('should return diff string', async () => {
      mockOctokitRest.pulls.get.mockResolvedValue({ data: 'diff content' });
      const result = await service.getPullRequestDiff('owner', 'repo', 1);
      expect(result).toBe('diff content');
      expect(mockOctokitRest.pulls.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 1,
        mediaType: { format: 'diff' },
      });
    });

    it('should truncate diff exceeding 100,000 characters', async () => {
      const largeDiff = 'a'.repeat(100_001);
      mockOctokitRest.pulls.get.mockResolvedValue({ data: largeDiff });
      const result = await service.getPullRequestDiff('owner', 'repo', 1);
      expect(result).toContain('... (diff truncated due to size limit)');
      expect(result.startsWith('a'.repeat(100_000))).toBe(true);
    });

    it('should not truncate diff within 100,000 characters', async () => {
      const diff = 'a'.repeat(100_000);
      mockOctokitRest.pulls.get.mockResolvedValue({ data: diff });
      const result = await service.getPullRequestDiff('owner', 'repo', 1);
      expect(result).toBe(diff);
      expect(result).not.toContain('truncated');
    });
  });

  describe('getPullRequestMetadata()', () => {
    it('should return title and body', async () => {
      mockOctokitRest.pulls.get.mockResolvedValue({
        data: { title: 'PR Title', body: 'PR description' },
      });
      const result = await service.getPullRequestMetadata('owner', 'repo', 1);
      expect(result).toEqual({ title: 'PR Title', body: 'PR description' });
    });

    it('should return empty string when body is null', async () => {
      mockOctokitRest.pulls.get.mockResolvedValue({
        data: { title: 'PR Title', body: null },
      });
      const result = await service.getPullRequestMetadata('owner', 'repo', 1);
      expect(result).toEqual({ title: 'PR Title', body: '' });
    });

    it('should not pass mediaType when fetching metadata', async () => {
      mockOctokitRest.pulls.get.mockResolvedValue({
        data: { title: 'T', body: '' },
      });
      await service.getPullRequestMetadata('owner', 'repo', 1);
      expect(mockOctokitRest.pulls.get).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 1,
      });
    });
  });

  describe('postComment()', () => {
    it('should call createComment with correct parameters', async () => {
      mockOctokitRest.issues.createComment.mockResolvedValue({});
      await service.postComment('owner', 'repo', 1, 'review result');
      expect(mockOctokitRest.issues.createComment).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 1,
        body: 'review result',
      });
    });
  });
});
