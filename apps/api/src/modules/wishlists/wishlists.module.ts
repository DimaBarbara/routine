import { Module } from '@nestjs/common';

import { SpacesModule } from '../spaces/spaces.module.js';
import { ReservationsService } from './reservations.service.js';
import { SharedWishlistsController } from './shared-wishlists.controller.js';
import { WishlistsController } from './wishlists.controller.js';
import { WishlistsService } from './wishlists.service.js';

@Module({
  imports: [SpacesModule],
  controllers: [WishlistsController, SharedWishlistsController],
  providers: [WishlistsService, ReservationsService],
})
export class WishlistsModule {}
