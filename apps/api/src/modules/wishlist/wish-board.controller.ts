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
  type WishBoard,
  type WishItemDto,
  type WishItemInput,
  wishItemInputSchema,
  type WishItemUpdate,
  wishItemUpdateSchema,
  type WishMoveInput,
  wishMoveSchema,
  type WishShareLinkDto,
} from '@routine/contracts';

import type { AuthUser } from '../../common/request.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SpaceMemberGuard } from '../spaces/space-member.guard.js';
import { ReservationsService } from './reservations.service.js';
import { WishBoardService } from './wish-board.service.js';

@Controller('spaces/:spaceId/wishlist')
@UseGuards(SpaceMemberGuard)
export class WishBoardController {
  constructor(
    private readonly board: WishBoardService,
    private readonly reservations: ReservationsService,
  ) {}

  @Get()
  get(@Param('spaceId') spaceId: string, @CurrentUser() user: AuthUser): Promise<WishBoard> {
    return this.board.getBoard(spaceId, user.id);
  }

  @Post('items')
  create(
    @Param('spaceId') spaceId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(wishItemInputSchema)) body: WishItemInput,
  ): Promise<WishItemDto> {
    return this.board.create(spaceId, user.id, body);
  }

  @Patch('items/:itemId')
  update(
    @Param('spaceId') spaceId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(wishItemUpdateSchema)) body: WishItemUpdate,
  ): Promise<WishItemDto> {
    return this.board.update(spaceId, itemId, user.id, body);
  }

  @Post('items/:itemId/move')
  @HttpCode(200)
  move(
    @Param('spaceId') spaceId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(wishMoveSchema)) body: WishMoveInput,
  ): Promise<WishItemDto> {
    return this.board.move(spaceId, itemId, user.id, body);
  }

  @Delete('items/:itemId')
  @HttpCode(204)
  remove(@Param('spaceId') spaceId: string, @Param('itemId') itemId: string) {
    return this.board.remove(spaceId, itemId);
  }

  @Post('items/:itemId/reservation')
  reserve(
    @Param('spaceId') spaceId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WishItemDto> {
    return this.reservations.reserveInSpace(spaceId, itemId, user.id);
  }

  @Delete('items/:itemId/reservation')
  cancelReservation(
    @Param('spaceId') spaceId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WishItemDto> {
    return this.reservations.cancelInSpace(spaceId, itemId, user.id);
  }

  @Post('share')
  enableShare(
    @Param('spaceId') spaceId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WishShareLinkDto> {
    return this.board.enableShare(spaceId, user.id);
  }

  @Delete('share')
  disableShare(
    @Param('spaceId') spaceId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WishShareLinkDto> {
    return this.board.disableShare(spaceId, user.id);
  }
}
