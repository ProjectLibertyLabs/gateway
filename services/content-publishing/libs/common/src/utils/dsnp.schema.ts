import { AnnouncementTypeDto, EnvironmentDto } from '../dtos/common.dto';

export namespace DsnpSchemas {
  /**
   * Map between announcement type and it's DSNP schema id for DEV environment
   */
  const ANNOUNCEMENT_TO_SCHEMA_ID_DEV = new Map<AnnouncementTypeDto, number>([
    [AnnouncementTypeDto.TOMBSTONE, 1],
    [AnnouncementTypeDto.BROADCAST, 2],
    [AnnouncementTypeDto.REPLY, 3],
    [AnnouncementTypeDto.REACTION, 4],
    [AnnouncementTypeDto.PROFILE, 5],
    [AnnouncementTypeDto.UPDATE, 6],
  ]);
  /**
   * Map between announcement type and it's DSNP schema id for ROCOCO environment
   */
  const ANNOUNCEMENT_TO_SCHEMA_ID_ROCOCO = new Map<AnnouncementTypeDto, number>([
    [AnnouncementTypeDto.TOMBSTONE, 1],
    [AnnouncementTypeDto.BROADCAST, 2],
    [AnnouncementTypeDto.REPLY, 3],
    [AnnouncementTypeDto.REACTION, 4],
    [AnnouncementTypeDto.PROFILE, 5],
    [AnnouncementTypeDto.UPDATE, 6],
  ]);
  /**
   * Map between announcement type and it's DSNP schema id for MAIN-NET environment
   */
  const ANNOUNCEMENT_TO_SCHEMA_ID_MAIN_NET = new Map<AnnouncementTypeDto, number>([
    [AnnouncementTypeDto.TOMBSTONE, 1],
    [AnnouncementTypeDto.BROADCAST, 2],
    [AnnouncementTypeDto.REPLY, 3],
    [AnnouncementTypeDto.REACTION, 4],
    [AnnouncementTypeDto.PROFILE, 6],
    [AnnouncementTypeDto.UPDATE, 5],
  ]);
  /**
   * Returns schema Id by environment and announcement type
   */
  export function getSchemaId(environment: EnvironmentDto, announcementType: AnnouncementTypeDto): number {
    switch (environment) {
      case EnvironmentDto.MAIN_NET:
        return ANNOUNCEMENT_TO_SCHEMA_ID_MAIN_NET.get(announcementType)!;
      case EnvironmentDto.ROCOCO:
        return ANNOUNCEMENT_TO_SCHEMA_ID_ROCOCO.get(announcementType)!;
      default:
        return ANNOUNCEMENT_TO_SCHEMA_ID_DEV.get(announcementType)!;
    }
  }
}
