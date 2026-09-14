import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  type AcceptInviteInput,
  type AcceptInviteResult,
  acceptInviteSchema,
  type CreatedInvite,
  type CreateInviteData,
  createInviteSchema,
  type InvitePreview,
  type InviteSummary,
} from '@routine/contracts';

import type { AuthUser } from '../../common/request.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { InvitesService } from './invites.service.js';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createInviteSchema)) body: CreateInviteData,
  ): Promise<CreatedInvite> {
    return this.invites.create(user, body);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<InviteSummary[]> {
    return this.invites.listCreatedBy(user.id);
  }

  @Delete(':id')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<InviteSummary> {
    return this.invites.revoke(user.id, id);
  }

  @Public()
  @Get('preview/:token')
  preview(@Param('token') token: string): Promise<InvitePreview> {
    return this.invites.preview(token);
  }

  @Post('accept')
  accept(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(acceptInviteSchema)) body: AcceptInviteInput,
  ): Promise<AcceptInviteResult> {
    return this.invites.accept(user, body.token);
  }
}
