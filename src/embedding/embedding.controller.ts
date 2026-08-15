import { Controller, Post, Body } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
@Controller('embedding')
export class EmbeddingController {
  constructor(private readonly emdeddingService: EmbeddingService) {}

  @Post('save-chunk')
  async Savechunk(@Body('content') content: string) {
    await this.emdeddingService.saveChunk(content);
    return { status: 'saved' };
  }

  @Post('search')
  async search(@Body('query') query: string) {
    return this.emdeddingService.searchSimilarChunks(query);
  }
}
