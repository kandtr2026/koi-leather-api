import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AiEditController } from "./ai-edit.controller";
import { AiEditResolver } from "./ai-edit.resolver";
import { AiEditService } from "./ai-edit.service";
import { AiEditWriter } from "./ai-edit.writer";
import { OpenAiClient } from "./openai.client";

@Module({
  imports: [PrismaModule],
  controllers: [AiEditController],
  providers: [AiEditService, AiEditResolver, AiEditWriter, OpenAiClient],
})
export class AiEditModule {}
