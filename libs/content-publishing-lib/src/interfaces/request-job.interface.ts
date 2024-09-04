import { AnnouncementTypeDto, AttachmentType, RequestTypeDto } from '#content-publishing-lib/dtos';

export interface IAssetTypeInfo {
  mimeType: string;
  attachmentType: AttachmentType;
}
export interface IRequestJob {
  id: string;
  announcementType: AnnouncementTypeDto;
  dsnpUserId: string;
  assetToMimeType?: Map<string, IAssetTypeInfo>;
  content?: RequestTypeDto;
  dependencyAttempt: number;
}
