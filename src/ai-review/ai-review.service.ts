import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '../config/config.service';

const SYSTEM_PROMPT = `You are an expert code reviewer. Review the provided pull request diff and give constructive feedback.

Focus on:
- **Bugs & correctness**: Logic errors, edge cases, potential runtime errors
- **Security**: Vulnerabilities such as injection, improper auth, data exposure
- **Performance**: Inefficient algorithms, unnecessary operations, memory leaks
- **Readability & maintainability**: Naming, complexity, code structure
- **Best practices**: Design patterns, SOLID principles, language idioms

Format your response in Markdown with clear sections. Be concise and actionable.
If the code looks good, say so. Not every section needs issues — only mention what's relevant.`;

@Injectable()
export class AiReviewService {
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.get().anthropicApiKey,
    });
  }

  async review(
    diff: string,
    commentBody: string,
    prMetadata: { title: string; body: string },
  ): Promise<string> {
    const prDescription = prMetadata.body
      ? `**Description:**\n${prMetadata.body}\n\n`
      : '';
    const content =
      `## Pull Request\n**Title:** ${prMetadata.title}\n\n${prDescription}` +
      `## Review Request\n${commentBody}\n\n` +
      `## Pull Request Diff\n\`\`\`diff\n${diff}\n\`\`\``;

    const message = await this.client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude API');
    }

    return textBlock.text;
  }
}
