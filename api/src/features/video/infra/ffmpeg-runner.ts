import { spawn } from 'node:child_process';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class FfmpegRunner {
  /**
   * Runs FFmpeg on the machine where the API process runs.
   * Default: `FFMPEG_PATH` or `ffmpeg`, `-y -i <input> -c copy <output>`.
   */
  async transcodeCopy(inputPath: string, outputPath: string): Promise<void> {
    const bin = process.env.FFMPEG_PATH?.trim() || 'ffmpeg';
    const args = ['-y', '-i', inputPath, '-c', 'copy', outputPath];
    await this.runSpawn(bin, args);
  }

  private runSpawn(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: 'ignore' });
      child.on('error', (err) => {
        reject(
          new InternalServerErrorException(
            `Failed to start FFmpeg (${command}): ${err.message}`,
          ),
        );
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new InternalServerErrorException(
            `FFmpeg exited with code ${code ?? 'unknown'}`,
          ),
        );
      });
    });
  }
}
