-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "finance";

-- CreateEnum
CREATE TYPE "finance"."TransactionType" AS ENUM ('EXPENSE', 'INCOME');

-- CreateEnum
CREATE TYPE "finance"."ExpenseCategory" AS ENUM ('FOOD', 'CAFE', 'ENTERTAINMENT', 'TRANSPORT', 'HOME', 'UTILITIES', 'HEALTH', 'BEAUTY', 'CLOTHES', 'SUBSCRIPTIONS', 'EDUCATION', 'TRAVEL', 'GIFTS', 'OTHER');

-- CreateEnum
CREATE TYPE "finance"."IncomeKind" AS ENUM ('FIXED', 'UNPLANNED');

-- CreateEnum
CREATE TYPE "finance"."ContributionKind" AS ENUM ('INITIAL', 'SCHEDULED', 'EXTRA');

-- CreateTable
CREATE TABLE "finance"."FinanceTransaction" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "type" "finance"."TransactionType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "category" "finance"."ExpenseCategory",
    "incomeKind" "finance"."IncomeKind",
    "note" TEXT,
    "date" DATE NOT NULL,
    "personId" TEXT,
    "createdById" TEXT,
    "recurringIncomeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."RecurringIncome" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "personId" TEXT,
    "pausedAt" TIMESTAMP(3),
    "generatedThrough" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringIncome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."CashEntry" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "personId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."Deposit" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bank" TEXT,
    "currency" CHAR(3) NOT NULL,
    "annualRateBp" INTEGER NOT NULL,
    "taxRateBp" INTEGER NOT NULL DEFAULT 2300,
    "capitalization" BOOLEAN NOT NULL DEFAULT true,
    "startDate" DATE NOT NULL,
    "termMonths" INTEGER,
    "monthlyTopUpMinor" INTEGER NOT NULL DEFAULT 0,
    "topUpDay" INTEGER NOT NULL,
    "personId" TEXT,
    "generatedThrough" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."DepositContribution" (
    "id" TEXT NOT NULL,
    "depositId" TEXT NOT NULL,
    "kind" "finance"."ContributionKind" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "scheduledFor" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepositContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance"."ExchangeRate" (
    "date" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "rateScaled" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("currency","date")
);

-- CreateIndex
CREATE INDEX "FinanceTransaction_spaceId_date_idx" ON "finance"."FinanceTransaction"("spaceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceTransaction_recurringIncomeId_date_key" ON "finance"."FinanceTransaction"("recurringIncomeId", "date");

-- CreateIndex
CREATE INDEX "RecurringIncome_spaceId_idx" ON "finance"."RecurringIncome"("spaceId");

-- CreateIndex
CREATE INDEX "CashEntry_spaceId_date_idx" ON "finance"."CashEntry"("spaceId", "date");

-- CreateIndex
CREATE INDEX "Deposit_spaceId_idx" ON "finance"."Deposit"("spaceId");

-- CreateIndex
CREATE INDEX "DepositContribution_depositId_date_idx" ON "finance"."DepositContribution"("depositId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DepositContribution_depositId_scheduledFor_key" ON "finance"."DepositContribution"("depositId", "scheduledFor");

-- AddForeignKey
ALTER TABLE "finance"."FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "public"."Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_recurringIncomeId_fkey" FOREIGN KEY ("recurringIncomeId") REFERENCES "finance"."RecurringIncome"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."RecurringIncome" ADD CONSTRAINT "RecurringIncome_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "public"."Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."RecurringIncome" ADD CONSTRAINT "RecurringIncome_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."CashEntry" ADD CONSTRAINT "CashEntry_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "public"."Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."CashEntry" ADD CONSTRAINT "CashEntry_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."Deposit" ADD CONSTRAINT "Deposit_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "public"."Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."Deposit" ADD CONSTRAINT "Deposit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance"."DepositContribution" ADD CONSTRAINT "DepositContribution_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "finance"."Deposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

