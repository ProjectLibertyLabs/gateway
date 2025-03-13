import { IBatchFile } from '#types/interfaces';
import { Announcement } from '#types/interfaces/content-publishing/dsnp';

export interface IBatchAnnouncerJobData {
  batchId: string;
  schemaId: number;
  announcements: Announcement[];
}

export type IBatchAnnouncerJob = IBatchAnnouncerJobData | IBatchFile;

export function isExistingBatch(data: IBatchAnnouncerJob): data is IBatchFile {
  return 'cid' in data;
}
