import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  type ChangePasswordInput,
  changePasswordSchema,
  type SessionUser,
  type UpdateProfileInput,
  updateProfileSchema,
} from '@routine/contracts';
import type { Response } from 'express';

import type { AppRequest, AuthUser } from '../../common/request.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { ProfileService } from './profile.service.js';

/** Лише ті поля файлу від multer, які нам потрібні. */
interface UploadedAvatar {
  buffer: Buffer;
  size: number;
}

/** Із запасом над AVATAR_MAX_BYTES: точну межу перевіряє сервіс і повертає свій код помилки. */
const UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024;

@Controller('profile')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ): Promise<SessionUser> {
    return this.profile.updateName(user.id, body);
  }

  @Post('password')
  @HttpCode(204)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ): Promise<void> {
    await this.profile.changePassword(user.id, req.sessionToken ?? '', body);
  }

  @Put('avatar')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: UPLOAD_LIMIT_BYTES, files: 1 } }))
  setAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedAvatar | undefined,
  ): Promise<SessionUser> {
    return this.profile.setAvatar(user.id, file);
  }

  @Delete('avatar')
  removeAvatar(@CurrentUser() user: AuthUser): Promise<SessionUser> {
    return this.profile.removeAvatar(user.id);
  }
}

@Controller('users')
export class UsersController {
  constructor(private readonly profile: ProfileService) {}

  /** Фото бачать лише залогінені. URL версійований (?v=…), тож кешуємо назавжди. */
  @Get(':id/avatar')
  async avatar(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const avatar = await this.profile.avatar(id);
    res.set({
      'Content-Type': avatar.mimeType,
      'Cache-Control': 'private, max-age=31536000, immutable',
      // Не дати браузеру «вгадати» інший тип за вмістом.
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    });
    return new StreamableFile(Buffer.from(avatar.data));
  }
}
