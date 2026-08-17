import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from 'src/prisma/prisma.module';
import { EmbeddingModule } from 'src/embedding/embedding.module';
@Module({
  imports: [HttpModule, PrismaModule, EmbeddingModule],
  providers: [LlmService],
  controllers: [LlmController],
})
export class LlmModule {}
