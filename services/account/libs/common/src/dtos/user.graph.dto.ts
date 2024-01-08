import { DsnpGraphEdge } from './dsnp.graph.edge.dto';

export class UserGraphDto {
  dsnpId: string;

  dsnpGraphEdges?: DsnpGraphEdge[];
}
