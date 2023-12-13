import { DsnpGraphEdge } from '@dsnp/graph-sdk';

export class UserGraphDto {
  dsnpId: string;

  dsnpGraphEdge?: DsnpGraphEdge[];
}
