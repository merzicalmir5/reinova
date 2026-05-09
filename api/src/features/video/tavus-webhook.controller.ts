import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { VideoService } from './application/video.service';

@Controller()
export class TavusWebhookController {
  constructor(private readonly videoService: VideoService) {}

  @Post('webhook')
  @HttpCode(200)
  handleTavusVideo(@Body() body: unknown) {
    return this.videoService.applyTavusVideoCallback(body);
  }
}
