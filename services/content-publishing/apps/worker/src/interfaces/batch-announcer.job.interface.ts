import { Announcement } from '#libs/interfaces/dsnp';

export interface IBatchAnnouncerJobData {
  batchId: string;
  schemaId: number;
  announcements: Announcement[];
}
