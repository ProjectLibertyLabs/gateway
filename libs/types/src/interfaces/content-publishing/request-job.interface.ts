import { AnnouncementTypeName, AttachmentType } from '#types/enums';
import { IRequestType } from './announcement.interface';

export interface IAssetTypeInfo {
  mimeType: string;
  attachmentType: AttachmentType;
}
export interface IRequestJob {
  id: string;
  announcementType: AnnouncementTypeName;
  msaId: string;
  assetToMimeType?: Map<string, IAssetTypeInfo>;
  content?: IRequestType;
  dependencyAttempt: number;
}
