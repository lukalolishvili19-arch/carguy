import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { Request } from 'express';
import { UPLOADS_DIR } from './uploads.constants';

const ALLOWED = /^(image\/(jpe?g|png|gif|webp|avif)|video\/(mp4|webm|quicktime))$/;

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  @Post('local')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED.test(file.mimetype)) cb(null, true);
        else cb(new BadRequestException('Only image and video files are allowed'), false);
      },
    }),
  )
  uploadLocal(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('No file provided');
    const base = `${req.protocol}://${req.get('host')}`;
    const isVideo = file.mimetype.startsWith('video/');
    return {
      url: `${base}/uploads/${file.filename}`,
      type: isVideo ? 'VIDEO' : 'IMAGE',
      size: file.size,
      mimeType: file.mimetype,
    };
  }
}
