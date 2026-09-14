import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../config/env.js';
import { SpacesModule } from '../spaces/spaces.module.js';
import { AnalyticsService } from './analytics.service.js';
import {
  ExchangeRatesService,
  FixedRatesProvider,
  NbuRatesProvider,
  RATES_PROVIDER,
} from './exchange-rates.service.js';
import { FinanceController } from './finance.controller.js';
import { SavingsController } from './savings.controller.js';
import { SavingsService } from './savings.service.js';
import { ScheduleService } from './schedule.service.js';
import { TransactionsService } from './transactions.service.js';

@Module({
  imports: [SpacesModule],
  controllers: [FinanceController, SavingsController],
  providers: [
    {
      provide: RATES_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        config.get('RATES_SOURCE', { infer: true }) === 'fixed'
          ? new FixedRatesProvider()
          : new NbuRatesProvider(),
    },
    ExchangeRatesService,
    ScheduleService,
    TransactionsService,
    SavingsService,
    AnalyticsService,
  ],
})
export class FinanceModule {}
