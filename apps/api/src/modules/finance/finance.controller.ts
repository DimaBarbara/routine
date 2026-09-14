import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  analyticsQuerySchema,
  type FinanceAnalytics,
  type FinanceMonth,
  monthQuerySchema,
  type RecurringIncomeDto,
  type RecurringIncomeInput,
  recurringIncomeInputSchema,
  type RecurringIncomeUpdate,
  recurringIncomeUpdateSchema,
  type TransactionDto,
  type TransactionInput,
  transactionInputSchema,
} from '@routine/contracts';
import type { z } from 'zod';

import type { AuthUser } from '../../common/request.js';
import { ZodValidationPipe } from '../../common/zod-validation.pipe.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SpaceMemberGuard } from '../spaces/space-member.guard.js';
import { AnalyticsService } from './analytics.service.js';
import { TransactionsService } from './transactions.service.js';

@Controller('spaces/:spaceId/finance')
@UseGuards(SpaceMemberGuard)
export class FinanceController {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('transactions')
  month(
    @Param('spaceId') spaceId: string,
    @Query(new ZodValidationPipe(monthQuerySchema)) query: z.output<typeof monthQuerySchema>,
  ): Promise<FinanceMonth> {
    return this.transactions.month(spaceId, query.month);
  }

  @Post('transactions')
  create(
    @Param('spaceId') spaceId: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(transactionInputSchema)) body: TransactionInput,
  ): Promise<TransactionDto> {
    return this.transactions.create(spaceId, user.id, body);
  }

  @Patch('transactions/:id')
  update(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(transactionInputSchema)) body: TransactionInput,
  ): Promise<TransactionDto> {
    return this.transactions.update(spaceId, id, body);
  }

  @Delete('transactions/:id')
  @HttpCode(204)
  remove(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.transactions.remove(spaceId, id);
  }

  @Post('recurring-incomes')
  createRecurring(
    @Param('spaceId') spaceId: string,
    @Body(new ZodValidationPipe(recurringIncomeInputSchema)) body: RecurringIncomeInput,
  ): Promise<RecurringIncomeDto> {
    return this.transactions.createRecurring(spaceId, body);
  }

  @Patch('recurring-incomes/:id')
  updateRecurring(
    @Param('spaceId') spaceId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(recurringIncomeUpdateSchema)) body: RecurringIncomeUpdate,
  ): Promise<RecurringIncomeDto> {
    return this.transactions.updateRecurring(spaceId, id, body);
  }

  @Delete('recurring-incomes/:id')
  @HttpCode(204)
  removeRecurring(@Param('spaceId') spaceId: string, @Param('id') id: string) {
    return this.transactions.removeRecurring(spaceId, id);
  }

  @Get('analytics')
  summary(
    @Param('spaceId') spaceId: string,
    @Query(new ZodValidationPipe(analyticsQuerySchema))
    query: z.output<typeof analyticsQuerySchema>,
  ): Promise<FinanceAnalytics> {
    return this.analytics.summary(spaceId, query.to, query.months);
  }
}
