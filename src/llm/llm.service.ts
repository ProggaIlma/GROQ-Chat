import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { Readable } from 'stream';
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
@Injectable()
export class LlmService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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
}
