import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LlmModule } from './llm/llm.module';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingModule } from './embedding/embedding.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LlmModule,
    EmbeddingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
