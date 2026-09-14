import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  type WishlistDetail,
  type WishlistInput,
  wishlistInputSchema,
  type WishlistItemDto,
  type WishlistItemInput,
  wishlistItemInputSchema,
  type WishlistItemUpdate,
  wishlistItemUpdateSchema,
  type WishlistShareLink,
  type WishlistSummary,
  type WishlistUpdate,
  wishlistUpdateSchema,
} from '@routine/contracts';

import type { AuthUser } from '../../common/request.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SpaceMemberGuard } from '../spaces/space-member.guard.js';
import { ReservationsService } from './reservations.service.js';
import { WishlistsService } from './wishlists.service.js';

@Controller('spaces/:spaceId/wishlists')
@UseGuards(SpaceMemberGuard)
export class WishlistsController {
  constructor(
    private readonly wishlists: WishlistsService,
    private readonly reservations: ReservationsService,
  ) {}

  @Get()
  list(@Param('spaceId') spaceId: string): Promise<WishlistSummary[]> {
    return this.wishlists.list(spaceId);
  }

  @Post()
  create(
    @Param('spaceId') spaceId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(wishlistInputSchema)) body: WishlistInput,
  ): Promise<WishlistSummary> {
    return this.wishlists.create(spaceId, user.id, body);
  }

  @Get(':wishlistId')
  get(
    @Param('spaceId') spaceId: string,
    @Param('wishlistId') wishlistId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WishlistDetail> {
    return this.wishlists.get(spaceId, wishlistId, user.id);
  }

  @Patch(':wishlistId')
  update(
    @Param('spaceId') spaceId: string,
    @Param('wishlistId') wishlistId: string,
    @Body(new ZodValidationPipe(wishlistUpdateSchema)) body: WishlistUpdate,
  ): Promise<WishlistSummary> {
    return this.wishlists.update(spaceId, wishlistId, body);
  }

  @Delete(':wishlistId')
  @HttpCode(204)
  remove(@Param('spaceId') spaceId: string, @Param('wishlistId') wishlistId: string) {
    return this.wishlists.remove(spaceId, wishlistId);
  }

  @Post(':wishlistId/share')
  enableShare(
    @Param('spaceId') spaceId: string,
    @Param('wishlistId') wishlistId: string,
  ): Promise<WishlistShareLink> {
    return this.wishlists.enableShare(spaceId, wishlistId);
  }

  @Delete(':wishlistId/share')
  disableShare(
    @Param('spaceId') spaceId: string,
    @Param('wishlistId') wishlistId: string,
  ): Promise<WishlistShareLink> {
    return this.wishlists.disableShare(spaceId, wishlistId);
  }

  @Post(':wishlistId/items')
  addItem(
    @Param('spaceId') spaceId: string,
    @Param('wishlistId') wishlistId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(wishlistItemInputSchema)) body: WishlistItemInput,
  ): Promise<WishlistItemDto> {
    return this.wishlists.addItem(spaceId, wishlistId, user.id, body);
  }

  @Patch(':wishlistId/items/:itemId')
  updateItem(
    @Param('spaceId') spaceId: string,
    @Param('wishlistId') wishlistId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(wishlistItemUpdateSchema)) body: WishlistItemUpdate,
  ): Promise<WishlistItemDto> {
    return this.wishlists.updateItem(spaceId, wishlistId, itemId, user.id, body);
  }

  @Delete(':wishlistId/items/:itemId')
  @HttpCode(204)
  removeItem(
    @Param('spaceId') spaceId: string,
    @Param('wishlistId') wishlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.wishlists.removeItem(spaceId, wishlistId, itemId);
  }

  @Post(':wishlistId/items/:itemId/reservation')
  reserve(
    @Param('spaceId') spaceId: string,
    @Param('wishlistId') wishlistId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WishlistItemDto> {
    return this.reservations.reserveInSpace(spaceId, wishlistId, itemId, user.id);
  }

  @Delete(':wishlistId/items/:itemId/reservation')
  cancelReservation(
    @Param('spaceId') spaceId: string,
    @Param('wishlistId') wishlistId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WishlistItemDto> {
    return this.reservations.cancelInSpace(spaceId, wishlistId, itemId, user.id);
  }
}
