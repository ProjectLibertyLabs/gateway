import { Announcement } from '#types/interfaces/content-publishing/dsnp';

export interface IBatchAnnouncerJobData {
  batchId: string;
  schemaId: number;
  announcements: Announcement[];
}
