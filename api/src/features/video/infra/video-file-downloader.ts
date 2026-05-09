import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class VideoFileDownloader {
  async downloadToFile(url: string, destPath: string): Promise<void> {
    await mkdir(dirname(destPath), { recursive: true });
    const res = await fetch(url);
    if (!res.ok) {
      throw new InternalServerErrorException(
        `Video download failed: HTTP ${res.status}`,
      );
    }
    if (!res.body) {
      throw new InternalServerErrorException('Video download has no body');
    }
    const webStream = res.body as import('node:stream/web').ReadableStream;
    const nodeReadable = Readable.fromWeb(webStream);
    await pipeline(nodeReadable, createWriteStream(destPath));
  }
}
