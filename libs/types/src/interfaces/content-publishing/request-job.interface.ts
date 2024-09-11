import { AttachmentType, RequestTypeDto } from '#types/dtos/content-publishing';
import { AnnouncementTypeName } from '#types/enums';

export interface IAssetTypeInfo {
  mimeType: string;
  attachmentType: AttachmentType;
}
export interface IRequestJob {
  id: string;
  announcementType: AnnouncementTypeName;
  dsnpUserId: string;
  assetToMimeType?: Map<string, IAssetTypeInfo>;
  content?: RequestTypeDto;
  dependencyAttempt: number;
}
