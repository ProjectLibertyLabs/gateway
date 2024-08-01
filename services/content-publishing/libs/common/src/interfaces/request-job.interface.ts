import { AnnouncementTypeDto, RequestTypeDto } from '#libs/dtos';

export interface IRequestJob {
  id: string;
  announcementType: AnnouncementTypeDto;
  dsnpUserId: string;
  assetToMimeType?: Map<string, string>;
  content?: RequestTypeDto;
  dependencyAttempt: number;
}
