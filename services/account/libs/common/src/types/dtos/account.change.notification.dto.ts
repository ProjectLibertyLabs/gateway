/* eslint-disable max-classes-per-file */
import { TransactionType } from '../enums';

type Update = {
  type: TransactionType;
  providerId: number;
  payload: Uint8Array;
};

export class AccountChangeNotificationDto {
  msaId: string;

  update: Update;
}

export class TransactionJob {
  referenceId: string;

  update: Update;
}
