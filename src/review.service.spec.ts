import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { ConfigService } from './config/config.service';
import { GithubService } from './github/github.service';
import { AiReviewService } from './ai-review/ai-review.service';

// These ESM packages are pulled in transitively; mock them to avoid parse errors
jest.mock('@octokit/rest', () => ({ Octokit: jest.fn() }));
jest.mock('@anthropic-ai/sdk', () => ({ __esModule: true, default: jest.fn() }));

describe('ReviewService', () => {
  let service: ReviewService;
  let mockConfigService: { get: jest.Mock; getOwnerAndRepo: jest.Mock };
  let mockGithubService: {
    getPullRequestDiff: jest.Mock;
    getPullRequestMetadata: jest.Mock;
    postComment: jest.Mock;
  };
  let mockAiReviewService: { review: jest.Mock };
  let exitSpy: jest.SpyInstance;

  const defaultConfig = {
    githubToken: 'token',
    anthropicApiKey: 'key',
    githubRepository: 'owner/repo',
    prNumber: 1,
    commentBody: '/ai-review',
  };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(defaultConfig),
      getOwnerAndRepo: jest.fn().mockReturnValue({ owner: 'owner', repo: 'repo' }),
    };

    mockGithubService = {
      getPullRequestDiff: jest.fn().mockResolvedValue('diff content'),
      getPullRequestMetadata: jest.fn().mockResolvedValue({ title: 'PR Title', body: 'PR Body' }),
      postComment: jest.fn().mockResolvedValue(undefined),
    };

    mockAiReviewService = {
      review: jest.fn().mockResolvedValue('Review result'),
    };

    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: GithubService, useValue: mockGithubService },
        { provide: AiReviewService, useValue: mockAiReviewService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe('trigger word check', () => {
    it('should skip when comment does not contain /ai-review', async () => {
      mockConfigService.get.mockReturnValue({ ...defaultConfig, commentBody: 'hello world' });
      await service.run();
      expect(mockGithubService.getPullRequestDiff).not.toHaveBeenCalled();
      expect(mockAiReviewService.review).not.toHaveBeenCalled();
    });

    it('should proceed when comment contains /ai-review', async () => {
      await service.run();
      expect(mockGithubService.getPullRequestDiff).toHaveBeenCalled();
    });
  });

  describe('empty diff handling', () => {
    it('should post NOTE comment and skip review when diff is empty', async () => {
      mockGithubService.getPullRequestDiff.mockResolvedValue('   ');
      await service.run();
      expect(mockGithubService.postComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
        expect.stringContaining('[!NOTE]'),
      );
      expect(mockAiReviewService.review).not.toHaveBeenCalled();
    });
  });

  describe('full review flow', () => {
    it('should call services in correct order with correct arguments', async () => {
      await service.run();

      expect(mockGithubService.getPullRequestDiff).toHaveBeenCalledWith('owner', 'repo', 1);
      expect(mockGithubService.getPullRequestMetadata).toHaveBeenCalledWith('owner', 'repo', 1);
      expect(mockAiReviewService.review).toHaveBeenCalledWith('diff content', '/ai-review', {
        title: 'PR Title',
        body: 'PR Body',
      });
      expect(mockGithubService.postComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
        expect.stringContaining('## AI Code Review'),
      );
    });

    it('should include review result in posted comment', async () => {
      await service.run();
      const postedComment = mockGithubService.postComment.mock.calls[0][3] as string;
      expect(postedComment).toContain('Review result');
    });
  });

  describe('error handling', () => {
    it('should post WARNING comment and call process.exit(1) on error', async () => {
      mockGithubService.getPullRequestDiff.mockRejectedValue(new Error('API error'));
      await expect(service.run()).rejects.toThrow('process.exit called');
      expect(mockGithubService.postComment).toHaveBeenCalledWith(
        'owner',
        'repo',
        1,
        expect.stringContaining('[!WARNING]'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should include error message in WARNING comment', async () => {
      mockGithubService.getPullRequestDiff.mockRejectedValue(new Error('Network timeout'));
      await expect(service.run()).rejects.toThrow('process.exit called');
      const postedComment = mockGithubService.postComment.mock.calls[0][3] as string;
      expect(postedComment).toContain('Network timeout');
    });
  });
});
