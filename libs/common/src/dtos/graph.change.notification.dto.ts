import { Update } from '@dsnp/graph-sdk';

export class GraphChangeNotificationDto {
  dsnpId: string;

  update: Update;
}
