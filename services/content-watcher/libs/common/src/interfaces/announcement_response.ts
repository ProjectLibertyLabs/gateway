import { Announcement } from './dsnp';

export interface AnnouncementResponse {
  requestId?: string;
  schemaId: number;
  announcement: Announcement;
}
