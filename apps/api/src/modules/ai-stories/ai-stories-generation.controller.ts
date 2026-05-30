import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { AiStoriesGenerationService } from "./ai-stories-generation.service";
import { GenerateAiStoryDto } from "./dto/generate-ai-story.dto";

@ApiTags("ai-stories-generation")
@Public()
@Controller({ path: "ai-stories", version: "1" })
export class AiStoriesGenerationController {
  constructor(private readonly generation: AiStoriesGenerationService) {}

  @Post("generate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Generate a customer AI story through FastAPI provider orchestration" })
  generate(@Body() body: GenerateAiStoryDto, @Headers("x-request-id") requestId?: string) {
    return this.generation.generate(body, requestId);
  }

  @Get("readiness")
  @ApiOperation({ summary: "AI Stories generation path readiness" })
  readiness() {
    return this.generation.readiness();
  }
}
