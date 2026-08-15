import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';

interface CohereEmbeddingResponse {
  embeddings: number[][];
}
@Injectable()
export class EmbeddingService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async getEmbedding(text: string, input_type: string): Promise<number[]> {
    const response = await firstValueFrom(
      this.httpService.post<CohereEmbeddingResponse>(
        'https://api.cohere.com/v1/embed',
        {
          texts: [text],
          model: 'embed-english-v3.0',
          input_type: input_type,
        },
        {
          headers: {
            Authorization: `Bearer ${this.configService.get('COHERE_API_KEY')}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );
    return response.data.embeddings[0];
  }
  async saveChunk(content: string): Promise<void> {
    const embeddings = await this.getEmbedding(content, 'search_document');
    const vector = `[${embeddings.join(',')}]`;
    await this.prismaService.$executeRaw`
    INSERT INTO "DocumentChunk" (id, content, embedding, "createdAt")
    VALUES (gen_random_uuid(), ${content}, ${vector}::vector, now())
  `;
  }
  async searchSimilarChunks(
    query: string,
    limit: number = 3,
  ): Promise<{ content: string }[]> {
    const embeddings = await this.getEmbedding(query, 'search_query');
    const vectorString = `[${embeddings.join(',')}]`;
    const val = await this.prismaService.$queryRaw`
    Select content
    From "DocumentChunk"
    ORDER BY embedding <=> ${vectorString}::vector
    LIMIT ${limit}
    `;
    return val as { content: string }[];
  }
}
