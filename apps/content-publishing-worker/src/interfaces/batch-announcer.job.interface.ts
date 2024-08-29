import { Announcement } from '#content-publishing-lib/interfaces/dsnp';

export interface IBatchAnnouncerJobData {
  batchId: string;
  schemaId: number;
  announcements: Announcement[];
}
