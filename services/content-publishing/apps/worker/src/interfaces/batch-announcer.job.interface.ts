import { Announcement } from '../../../../libs/common/src/interfaces/dsnp';

export interface IBatchAnnouncerJobData {
  batchId: string;
  schemaId: number;
  announcements: Announcement[];
}
