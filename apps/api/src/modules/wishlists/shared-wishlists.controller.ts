import { Body, Controller, Delete, Get, Param, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type GuestReservationInput,
  guestReservationSchema,
  type SharedWishlist,
  type WishlistItemDto,
} from '@routine/contracts';
import type { Response } from 'express';

import type { AppRequest, AuthUser } from '../../common/request.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import type { Env } from '../../config/env.js';
import { OptionalUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { ReservationsService } from './reservations.service.js';

const GUEST_COOKIE = 'routine_guest';
const GUEST_COOKIE_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/** Публічна сторінка вішліста за посиланням: без акаунта, лише перегляд і резервації. */
@Public()
@Controller('shared/wishlists')
export class SharedWishlistsController {
  constructor(
    private readonly reservations: ReservationsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Get(':token')
  get(
    @Param('token') token: string,
    @OptionalUser() user: AuthUser | null,
    @Req() req: AppRequest,
  ): Promise<SharedWishlist> {
    return this.reservations.getShared(token, user?.id ?? null, this.guestToken(req));
  }

  @Post(':token/items/:itemId/reservation')
  async reserve(
    @Param('token') token: string,
    @Param('itemId') itemId: string,
    @OptionalUser() user: AuthUser | null,
    @Body(new ZodValidationPipe(guestReservationSchema)) body: GuestReservationInput,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WishlistItemDto> {
    const { item, issuedGuestToken } = await this.reservations.reserveShared(
      token,
      itemId,
      user?.id ?? null,
      this.guestToken(req),
      body.guestName,
    );

    if (issuedGuestToken) {
      res.cookie(GUEST_COOKIE, issuedGuestToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: this.config.get('COOKIE_SECURE', { infer: true }),
        path: '/',
        maxAge: GUEST_COOKIE_MAX_AGE_MS,
      });
    }
    return item;
  }

  @Delete(':token/items/:itemId/reservation')
  cancel(
    @Param('token') token: string,
    @Param('itemId') itemId: string,
    @OptionalUser() user: AuthUser | null,
    @Req() req: AppRequest,
  ): Promise<WishlistItemDto> {
    return this.reservations.cancelShared(token, itemId, user?.id ?? null, this.guestToken(req));
  }

  private guestToken(req: AppRequest): string | null {
    const token: unknown = req.cookies?.[GUEST_COOKIE];
    return typeof token === 'string' && token.length > 0 ? token : null;
  }
}
