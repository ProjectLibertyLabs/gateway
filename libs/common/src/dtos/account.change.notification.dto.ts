export enum AccountChangeType {
  CHANGE_HANDLE = 'CHANGE_HANDLE',
  CREATE_HANDLE = 'CREATE_HANDLE',
  CREATE_ACCOUNT = 'CREATE_ACCOUNT',
}

type Update = {
  type: AccountChangeType;
  providerId: string;
  payload: Uint8Array;
};

export class AccountChangeNotificationDto {
  msaId: string;
  update: Update;
}

export class AccountUpdateJob {
  referenceId: string;
  update: Update;
}
