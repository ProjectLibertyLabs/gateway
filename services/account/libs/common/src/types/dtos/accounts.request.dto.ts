import { TransactionType } from '#lib/types/enums';

export type RetireMsaRequest = {
  accountId: string;
  type: TransactionType.RETIRE_MSA;
};
