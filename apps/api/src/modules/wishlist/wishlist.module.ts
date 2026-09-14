import { Module } from '@nestjs/common';

import { SpacesModule } from '../spaces/spaces.module.js';
import { ReservationsService } from './reservations.service.js';
import { SharedWishlistController } from './shared-wishlist.controller.js';
import { WishBoardController } from './wish-board.controller.js';
import { WishBoardService } from './wish-board.service.js';

@Module({
  imports: [SpacesModule],
  controllers: [WishBoardController, SharedWishlistController],
  providers: [WishBoardService, ReservationsService],
})
export class WishlistModule {}
