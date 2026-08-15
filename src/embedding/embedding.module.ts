import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { EmbeddingController } from './embedding.controller';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from 'src/prisma/prisma.module';
@Module({
  imports: [HttpModule, PrismaModule],
  providers: [EmbeddingService],
  controllers: [EmbeddingController],
})
export class EmbeddingModule {}
