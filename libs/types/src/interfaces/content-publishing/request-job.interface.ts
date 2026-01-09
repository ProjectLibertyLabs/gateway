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

/**
 * Job data for ICS batch publishing queue
 */
export interface IcsPublishJob {
  accountId: string;
  referenceId: string;
  providerId: string;
  encodedExtrinsics: HexString[];
}
