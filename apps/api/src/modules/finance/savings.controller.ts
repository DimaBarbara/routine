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
  type CashEntryInput,
  cashEntryInputSchema,
  type CashStash,
  type ContributionInput,
  contributionInputSchema,
  type DepositDto,
  type DepositInput,
  depositInputSchema,
  type DepositUpdate,
  depositUpdateSchema,
} from '@routine/contracts';

import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { SpaceMemberGuard } from '../spaces/space-member.guard.js';
import { SavingsService } from './savings.service.js';

@Controller('spaces/:spaceId/finance')
@UseGuards(SpaceMemberGuard)
export class SavingsController {
  constructor(private readonly savings: SavingsService) {}

  @Get('cash')
  cash(@Param('spaceId') spaceId: string): Promise<CashStash> {
    return this.savings.cash(spaceId);
  }

  @Post('cash')
  addCash(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(cashEntryInputSchema)) body: CashEntryInput,
  ): Promise<CashStash> {
    return this.savings.addCash(spaceId, body);
  }

  @Delete('cash/:id')
  removeCash(@Param('spaceId') spaceId: string, @Param('id') id: string): Promise<CashStash> {
    return this.savings.removeCash(spaceId, id);
  }

  @Get('deposits')
  deposits(@Param('spaceId') spaceId: string): Promise<DepositDto[]> {
    return this.savings.deposits(spaceId);
  }

  @Post('deposits')
  createDeposit(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(depositInputSchema)) body: DepositInput,
  ): Promise<DepositDto> {
    return this.savings.createDeposit(spaceId, body);
  }

  @Patch('deposits/:id')
  updateDeposit(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(depositUpdateSchema)) body: DepositUpdate,
  ): Promise<DepositDto> {
    return this.savings.updateDeposit(spaceId, id, body);
  }

  @Delete('deposits/:id')
  @HttpCode(204)
  removeDeposit(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.savings.removeDeposit(spaceId, id);
  }

  @Post('deposits/:id/contributions')
  addContribution(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(contributionInputSchema)) body: ContributionInput,
  ): Promise<DepositDto> {
    return this.savings.addContribution(spaceId, id, body);
  }

  @Patch('deposits/:id/contributions/:contributionId')
  updateContribution(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
    @Body(new ZodValidationPipe(contributionInputSchema)) body: ContributionInput,
  ): Promise<DepositDto> {
    return this.savings.updateContribution(spaceId, id, contributionId, body);
  }

  @Delete('deposits/:id/contributions/:contributionId')
  removeContribution(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
  ): Promise<DepositDto> {
    return this.savings.removeContribution(spaceId, id, contributionId);
  }
}
