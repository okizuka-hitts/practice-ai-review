import { Test, TestingModule } from '@nestjs/testing';
import { AiReviewService } from './ai-review.service';
import { ConfigService } from '../config/config.service';

const mockMessagesCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}));

describe('AiReviewService', () => {
  let service: AiReviewService;

  const mockConfigService = {
    get: () => ({ anthropicApiKey: 'test-api-key' }),
  };

  const prMetadata = { title: 'Fix critical bug', body: 'This PR fixes a null pointer exception.' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReviewService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AiReviewService>(AiReviewService);
    mockMessagesCreate.mockClear();
  });

  describe('review()', () => {
    it('should return the text from Claude response', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'LGTM' }],
      });
      const result = await service.review('diff', '/ai-review', prMetadata);
      expect(result).toBe('LGTM');
    });

    it('should include PR title in the prompt', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
      });
      await service.review('diff', '/ai-review', prMetadata);
      const prompt = mockMessagesCreate.mock.calls[0][0].messages[0].content;
      expect(prompt).toContain('Fix critical bug');
    });

    it('should include PR description in the prompt when body is present', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
      });
      await service.review('diff', '/ai-review', prMetadata);
      const prompt = mockMessagesCreate.mock.calls[0][0].messages[0].content;
      expect(prompt).toContain('This PR fixes a null pointer exception.');
    });

    it('should omit description section when body is empty', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
      });
      await service.review('diff', '/ai-review', { title: 'Fix', body: '' });
      const prompt = mockMessagesCreate.mock.calls[0][0].messages[0].content;
      expect(prompt).not.toContain('**Description:**');
    });

    it('should include diff in the prompt', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
      });
      await service.review('my diff content', '/ai-review', prMetadata);
      const prompt = mockMessagesCreate.mock.calls[0][0].messages[0].content;
      expect(prompt).toContain('my diff content');
    });

    it('should include comment body in the prompt', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
      });
      await service.review('diff', '/ai-review please focus on security', prMetadata);
      const prompt = mockMessagesCreate.mock.calls[0][0].messages[0].content;
      expect(prompt).toContain('/ai-review please focus on security');
    });

    it('should throw when response contains no text block', async () => {
      mockMessagesCreate.mockResolvedValue({ content: [] });
      await expect(service.review('diff', '/ai-review', prMetadata)).rejects.toThrow(
        'No text response from Claude API',
      );
    });

    it('should call Claude API with correct model and max_tokens', async () => {
      mockMessagesCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'ok' }],
      });
      await service.review('diff', '/ai-review', prMetadata);
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-opus-4-6',
          max_tokens: 4096,
        }),
      );
    });
  });
});
