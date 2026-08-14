import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Readable } from 'stream';
import { PrismaService } from 'src/prisma/prisma.service';
interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}
interface GroqErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
  };
}
export interface SentimentResult {
  sentiment: string;
}
@Injectable()
export class LlmService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}
  async askLlm(prompt: string): Promise<{ reply: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<GroqResponse>(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 100,
          },
          {
            headers: {
              Authorization: `Bearer ${this.configService.get('GROQ_API_KEY')}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return { reply: response.data.choices[0].message.content };
    } catch (error) {
      if (axios.isAxiosError<GroqErrorResponse>(error)) {
        const status =
          error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          error.response?.data?.error?.message ?? 'LLM request failed';
        throw new HttpException(message, status);
      }
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async streamLlmResponse(prompt: string): Promise<Readable> {
    const response = await firstValueFrom(
      this.httpService.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          stream: true,
        },
        {
          headers: {
            Authorization: `Bearer ${this.configService.get('GROQ_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        },
      ),
    );
    return response.data as Readable;
  }
  async chatWithHistory(conversationId: string | null, prompt: string) {
    let convoId = conversationId;

    if (!convoId) {
      const newConversation = await this.prismaService.conversation.create({
        data: {},
      });
      convoId = newConversation.id;
    }
    const messages = await this.prismaService.message.findMany({
      where: { conversationId: convoId },
      orderBy: { createdAt: 'asc' },
    });
    const groqMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
    groqMessages.push({ role: 'user', content: prompt });
    try {
      const response = await firstValueFrom(
        this.httpService.post<GroqResponse>(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: groqMessages,
            max_tokens: 100,
          },
          {
            headers: {
              Authorization: `Bearer ${this.configService.get('GROQ_API_KEY')}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      await this.prismaService.message.create({
        data: {
          conversationId: convoId,
          role: 'user',
          content: prompt,
        },
      });
      await this.prismaService.message.create({
        data: {
          conversationId: convoId,
          role: 'assistant',
          content: response.data.choices[0].message.content,
        },
      });
      return {
        conversationId: convoId,
        reply: response.data.choices[0].message.content,
      };
    } catch (error) {
      if (axios.isAxiosError<GroqErrorResponse>(error)) {
        const status =
          error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          error.response?.data?.error?.message ?? 'LLM request failed';
        throw new HttpException(message, status);
      }
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async extractStructuredData(text: string): Promise<SentimentResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<GroqResponse>(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content:
                  'Extract sentiment from the text. Respond only in JSON with a single key "sentiment".',
              },
              { role: 'user', content: text },
            ],

            response_format: {
              type: 'json_object',
            },
            max_tokens: 100,
          },
          {
            headers: {
              Authorization: `Bearer ${this.configService.get('GROQ_API_KEY')}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      const content = response.data.choices[0].message.content;
      return JSON.parse(content) as { sentiment: string };
    } catch (error) {
      if (axios.isAxiosError<GroqErrorResponse>(error)) {
        const status =
          error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
        const message =
          error.response?.data?.error?.message ?? 'LLM request failed';
        throw new HttpException(message, status);
      }
      throw new HttpException(
        'Unexpected error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
