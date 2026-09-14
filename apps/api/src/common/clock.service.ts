import { Global, Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import type { IsoDate } from './dates.js';

@Injectable()
export class ClockService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  /** Сьогоднішня дата в часовому поясі застосунку. У тестах підміняється. */
  today(): IsoDate {
    // en-CA форматує саме як YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.config.get('APP_TIMEZONE', { infer: true }),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}

@Global()
@Module({ providers: [ClockService], exports: [ClockService] })
export class ClockModule {}
