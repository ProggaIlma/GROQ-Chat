import { Controller, Post, Body } from '@nestjs/common';
import { LlmService } from './llm.service';
import type { Response } from 'express';
import { Res } from '@nestjs/common';
interface GroqStreamChunk {
  choices: {
    delta: {
      content?: string;
    };
  }[];
}
@Controller('llm')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post('response')
  async getResponse(
    @Body('prompt') prompt: string,
  ): Promise<{ reply: string }> {
    return this.llmService.askLlm(prompt);
  }

  @Post('stream')
  async streamResponse(@Body('prompt') prompt: string, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    return this.llmService.streamLlmResponse(prompt).then((stream) => {
      stream.on('data', (chunk: Buffer) => {
        const lines = chunk
          .toString()
          .split('\n\n')
          .filter((line) => line.trim() !== '');

        for (const line of lines) {
          const jsonStr = line.replace('data: ', '').trim();

          if (jsonStr === '[DONE]') {
            continue; // stream finished for this line, skip parsing
          }

          try {
            const parsed = JSON.parse(jsonStr) as GroqStreamChunk;
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              res.write(`data: ${content}\n\n`);
            }
          } catch {
            // ignore partial/malformed JSON fragments split across network chunks
          }
        }
      });

      stream.on('end', () => {
        res.end();
      });
    });
  }

  @Post('chat')
  async chatWithHistory(
    @Body('conversationId') conversationId: string | null,
    @Body('prompt') prompt: string,
  ) {
    return this.llmService.chatWithHistory(conversationId, prompt);
  }

  @Post('extract-sentiment')
  async extractSentiment(@Body('text') text: string) {
    return this.llmService.extractStructuredData(text);
  }
}
