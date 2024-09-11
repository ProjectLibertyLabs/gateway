import { Announcement } from './dsnp';

export interface IBatchAnnouncerJobData {
  batchId: string;
  schemaId: number;
  announcements: Announcement[];
}
