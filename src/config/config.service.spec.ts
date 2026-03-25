import { ConfigService } from './config.service';

describe('ConfigService', () => {
  const originalEnv = process.env;
  let exitSpy: jest.SpyInstance;

  const validEnv = {
    GITHUB_TOKEN: 'test-token',
    ANTHROPIC_API_KEY: 'test-api-key',
    GITHUB_REPOSITORY: 'owner/repo',
    PR_NUMBER: '42',
    COMMENT_BODY: '/ai-review',
  };

  beforeEach(() => {
    process.env = { ...originalEnv, ...validEnv };
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
  });

  describe('get()', () => {
    it('should return parsed config from environment variables', () => {
      const service = new ConfigService();
      expect(service.get()).toEqual({
        githubToken: 'test-token',
        anthropicApiKey: 'test-api-key',
        githubRepository: 'owner/repo',
        prNumber: 42,
        commentBody: '/ai-review',
      });
    });
  });

  describe('getOwnerAndRepo()', () => {
    it('should split GITHUB_REPOSITORY into owner and repo', () => {
      const service = new ConfigService();
      expect(service.getOwnerAndRepo()).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should exit if GITHUB_REPOSITORY has no slash', () => {
      process.env.GITHUB_REPOSITORY = 'invalid';
      const service = new ConfigService();
      expect(() => service.getOwnerAndRepo()).toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('validation', () => {
    it.each(['GITHUB_TOKEN', 'ANTHROPIC_API_KEY', 'GITHUB_REPOSITORY', 'PR_NUMBER', 'COMMENT_BODY'])(
      'should exit when %s is missing',
      (key) => {
        delete process.env[key];
        expect(() => new ConfigService()).toThrow('process.exit called');
        expect(exitSpy).toHaveBeenCalledWith(1);
      },
    );

    it('should exit when PR_NUMBER is not a valid number', () => {
      process.env.PR_NUMBER = 'not-a-number';
      expect(() => new ConfigService()).toThrow('process.exit called');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
