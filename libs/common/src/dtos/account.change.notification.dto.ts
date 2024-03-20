import { Update } from '@dsnp/graph-sdk';

export class AccountChangeNotificationDto {
  dsnpId: string;

  update: Update;
}
