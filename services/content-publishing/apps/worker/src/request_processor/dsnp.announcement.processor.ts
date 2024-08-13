import {
  ActivityContentTag,
  ActivityContentAttachment,
  ActivityContentLink,
  ActivityContentImageLink,
  ActivityContentImage,
  ActivityContentVideoLink,
  ActivityContentVideo,
  ActivityContentAudioLink,
  ActivityContentAudio,
  ActivityContentProfile,
} from '@dsnp/activity-content/types';
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '#libs/config';
import {
  AnnouncementTypeDto,
  BroadcastDto,
  ReplyDto,
  ReactionDto,
  UpdateDto,
  ProfileDto,
  TombstoneDto,
  ModifiableAnnouncementTypeDto,
  TagTypeDto,
  AttachmentType,
  AssetDto,
  TagDto,
} from '#libs/dtos';
import {
  IRequestJob,
  AnnouncementType,
  createTombstone,
  createNote,
  BroadcastAnnouncement,
  createBroadcast,
  ReplyAnnouncement,
  createReply,
  ReactionAnnouncement,
  createReaction,
  UpdateAnnouncement,
  createUpdate,
  ProfileAnnouncement,
  createProfile,
} from '#libs/interfaces';
import {
  BROADCAST_QUEUE_NAME,
  REPLY_QUEUE_NAME,
  REACTION_QUEUE_NAME,
  UPDATE_QUEUE_NAME,
  PROFILE_QUEUE_NAME,
  TOMBSTONE_QUEUE_NAME,
} from '#libs/queues/queue.constants';
import { calculateDsnpHash } from '#libs/utils/ipfs';
import { IpfsService } from '#libs/utils/ipfs.client';

@Injectable()
export class DsnpAnnouncementProcessor {
  private logger: Logger;

  constructor(
    @InjectQueue(BROADCAST_QUEUE_NAME) private broadcastQueue: Queue,
    @InjectQueue(REPLY_QUEUE_NAME) private replyQueue: Queue,
    @InjectQueue(REACTION_QUEUE_NAME) private reactionQueue: Queue,
    @InjectQueue(UPDATE_QUEUE_NAME) private updateQueue: Queue,
    @InjectQueue(PROFILE_QUEUE_NAME) private profileQueue: Queue,
    @InjectQueue(TOMBSTONE_QUEUE_NAME) private tombstoneQueue: Queue,
    private configService: ConfigService,
    private ipfsService: IpfsService,
  ) {
    this.logger = new Logger(DsnpAnnouncementProcessor.name);
  }

  public async collectAnnouncementAndQueue(data: IRequestJob) {
    this.logger.debug(`Collecting announcement and queuing`);
    this.logger.verbose(`Processing Activity: ${data.announcementType} for ${data.dsnpUserId}`);
    try {
      switch (data.announcementType) {
        case AnnouncementTypeDto.BROADCAST:
          await this.queueBroadcast(data);
          break;
        case AnnouncementTypeDto.REPLY:
          await this.queueReply(data);
          break;
        case AnnouncementTypeDto.REACTION:
          await this.queueReaction(data);
          break;
        case AnnouncementTypeDto.UPDATE:
          await this.queueUpdate(data);
          break;
        case AnnouncementTypeDto.PROFILE:
          await this.queueProfile(data);
          break;
        case AnnouncementTypeDto.TOMBSTONE:
          await this.queueTombstone(data);
          break;
        default:
          throw new Error(`Unsupported announcement type ${typeof data.announcementType}`);
      }
    } catch (e) {
      this.logger.error(`Error processing announcement ${data.announcementType} for ${data.dsnpUserId}: ${e}`);
      throw e;
    }
  }

  private async queueBroadcast(data: IRequestJob) {
    const broadcast = await this.processBroadcast(data.content as BroadcastDto, data.dsnpUserId, data.assetToMimeType);
    await this.broadcastQueue.add(`Broadcast Job - ${data.id}`, broadcast, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async queueReply(data: IRequestJob) {
    const reply = await this.processReply(data.content as ReplyDto, data.dsnpUserId, data.assetToMimeType);
    await this.replyQueue.add(`Reply Job - ${data.id}`, reply, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async queueReaction(data: IRequestJob) {
    const reaction = await this.processReaction(data.content as ReactionDto, data.dsnpUserId);
    await this.reactionQueue.add(`Reaction Job - ${data.id}`, reaction, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async queueUpdate(data: IRequestJob) {
    const updateDto = data.content as UpdateDto;
    const updateAnnouncementType: AnnouncementType = await this.getAnnouncementTypeFromModifiableAnnouncementType(
      updateDto.targetAnnouncementType,
    );
    const update = await this.processUpdate(
      updateDto,
      updateAnnouncementType,
      updateDto.targetContentHash ?? '',
      data.dsnpUserId,
      data.assetToMimeType,
    );
    await this.updateQueue.add(`Update Job - ${data.id}`, update, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async queueProfile(data: IRequestJob) {
    const profile = await this.processProfile(data.content as ProfileDto, data.dsnpUserId, data.assetToMimeType);
    await this.profileQueue.add(`Profile Job - ${data.id}`, profile, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async queueTombstone(data: IRequestJob) {
    const tombStoneDto = data.content as TombstoneDto;
    const announcementType: AnnouncementType = await this.getAnnouncementTypeFromModifiableAnnouncementType(
      tombStoneDto.targetAnnouncementType,
    );
    const tombstone = createTombstone(data.dsnpUserId, announcementType, tombStoneDto.targetContentHash ?? '');
    await this.tombstoneQueue.add(`Tombstone Job - ${data.id}`, tombstone, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async getAnnouncementTypeFromModifiableAnnouncementType(
    modifiableAnnouncementType: ModifiableAnnouncementTypeDto,
  ): Promise<AnnouncementType> {
    this.logger.debug(`Getting announcement type from modifiable announcement type`);
    switch (modifiableAnnouncementType) {
      case ModifiableAnnouncementTypeDto.BROADCAST:
        return AnnouncementType.Broadcast;
      case ModifiableAnnouncementTypeDto.REPLY:
        return AnnouncementType.Reply;
      default:
        throw new Error(`Unsupported announcement type ${typeof modifiableAnnouncementType}`);
    }
  }

  public async prepareNote(
    noteContent: BroadcastDto | ReplyDto | UpdateDto,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<[string, string, string]> {
    this.logger.debug(`Preparing note of type: ${typeof noteContent.content}`);
    const tags: ActivityContentTag[] = this.prepareTags(noteContent?.content.tag);
    const attachments: ActivityContentAttachment[] = await this.prepareAttachments(
      noteContent.content.assets,
      assetToMimeType,
    );

    const note = createNote(noteContent.content.content ?? '', new Date(noteContent.content.published ?? ''), {
      name: noteContent.content.name,
      location: this.prepareLocation(noteContent.content.location),
      tag: tags,
      attachment: attachments,
    });
    const noteString = JSON.stringify(note);
    const toUint8Array = new TextEncoder();
    const encoded = toUint8Array.encode(noteString);

    const [cid, hash] = await this.pinBufferToIPFS(Buffer.from(encoded));
    const ipfsUrl = this.formIpfsUrl(cid);
    return [cid, ipfsUrl, hash];
  }

  private prepareTags(tagData?: TagDto[]): ActivityContentTag[] {
    this.logger.debug(`Preparing tags`);
    const tags: ActivityContentTag[] = [];
    if (tagData) {
      tagData.forEach((tag) => {
        switch (tag.type) {
          case TagTypeDto.Hashtag:
            if (!tag.name) {
              throw new Error(`Tag name is required`);
            }
            tags.push({ name: tag.name });
            break;
          case TagTypeDto.Mention:
            if (!tag.mentionedId) {
              throw new Error(`Mentioned ID is required`);
            }
            tags.push({
              name: tag.name,
              type: 'Mention',
              id: tag.mentionedId,
            });
            break;
          default:
            throw new Error(`Unsupported tag type ${typeof tag.type}`);
        }
      });
    }
    return tags;
  }

  private async prepareAttachments(
    assetData?: AssetDto[],
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ActivityContentAttachment[]> {
    const attachments: ActivityContentAttachment[] = [];
    if (assetData) {
      const promises = assetData.map(async (asset) => {
        if (asset.references) {
          const assetPromises = asset.references.map(async (reference) => {
            if (!assetToMimeType) {
              throw new Error(`asset ${reference.referenceId} should have a mimeTypes`);
            }
            const { attachmentType } = assetToMimeType[reference.referenceId];
            switch (attachmentType) {
              case AttachmentType.LINK:
                attachments.push(this.prepareLinkAttachment(asset));
                break;
              case AttachmentType.IMAGE:
                attachments.push(await this.prepareImageAttachment(asset, assetToMimeType));
                break;
              case AttachmentType.VIDEO:
                attachments.push(await this.prepareVideoAttachment(asset, assetToMimeType));
                break;
              case AttachmentType.AUDIO:
                attachments.push(await this.prepareAudioAttachment(asset, assetToMimeType));
                break;
              default:
                throw new Error(`Unsupported attachment type ${attachmentType}`);
            }
          });
          await Promise.all(assetPromises);
        }
      });
      await Promise.all(promises);
    }
    return attachments;
  }

  private prepareLinkAttachment(asset: AssetDto): ActivityContentLink {
    this.logger.debug(`Preparing link attachment`);
    return {
      type: 'Link',
      href: asset.href || '',
      name: asset.name,
    };
  }

  private async prepareImageAttachment(
    asset: AssetDto,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ActivityContentImage> {
    const imageLinks: ActivityContentImageLink[] = [];
    if (asset.references) {
      const promises = asset.references.map(async (reference) => {
        if (!assetToMimeType) {
          throw new Error(`asset ${reference.referenceId} should have a mimeTypes`);
        }
        const mediaType = assetToMimeType[reference.referenceId];
        const contentBuffer = await this.ipfsService.getPinned(reference.referenceId);
        const hashedContent = await calculateDsnpHash(contentBuffer);
        const image: ActivityContentImageLink = {
          mediaType,
          hash: [hashedContent],
          height: reference.height,
          width: reference.width,
          type: 'Link',
          href: this.formIpfsUrl(reference.referenceId),
        };
        imageLinks.push(image);
      });
      await Promise.all(promises);
    }

    return {
      type: 'Image',
      name: asset.name,
      url: imageLinks,
    };
  }

  private async prepareVideoAttachment(
    asset: AssetDto,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ActivityContentVideo> {
    const videoLinks: ActivityContentVideoLink[] = [];
    let duration: string | undefined = '';

    if (asset.references) {
      const promises = asset.references.map(async (reference) => {
        if (!assetToMimeType) {
          throw new Error(`asset ${reference.referenceId} should have a mimeTypes`);
        }
        const mediaType = assetToMimeType[reference.referenceId];
        const contentBuffer = await this.ipfsService.getPinned(reference.referenceId);
        const hashedContent = await calculateDsnpHash(contentBuffer);
        const video: ActivityContentVideoLink = {
          mediaType,
          hash: [hashedContent],
          height: reference.height,
          width: reference.width,
          type: 'Link',
          href: this.formIpfsUrl(reference.referenceId),
        };
        duration = duration ? reference.duration : '';
        videoLinks.push(video);
      });
      await Promise.all(promises);
    }

    return {
      type: 'Video',
      name: asset.name,
      url: videoLinks,
      duration: duration ?? undefined,
    };
  }

  private async prepareAudioAttachment(
    asset: AssetDto,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ActivityContentAudio> {
    const audioLinks: ActivityContentAudioLink[] = [];
    let duration = '';
    if (asset.references) {
      const promises = asset.references.map(async (reference) => {
        if (!assetToMimeType) {
          throw new Error(`asset ${reference.referenceId} should have a mimeTypes`);
        }
        const mediaType = assetToMimeType[reference.referenceId];
        const contentBuffer = await this.ipfsService.getPinned(reference.referenceId);
        const hashedContent = await calculateDsnpHash(contentBuffer);
        duration = duration ?? reference.duration ?? '';
        const audio: ActivityContentAudioLink = {
          mediaType,
          hash: [hashedContent],
          type: 'Link',
          href: this.formIpfsUrl(reference.referenceId),
        };
        audioLinks.push(audio);
      });

      await Promise.all(promises);
    }

    return {
      type: 'Audio',
      name: asset.name,
      url: audioLinks,
      duration,
    };
  }

  private async processBroadcast(
    content: BroadcastDto,
    dsnpUserId: string,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<BroadcastAnnouncement> {
    this.logger.debug(`Processing broadcast`);
    const [cid, ipfsUrl, hash] = await this.prepareNote(content, assetToMimeType);
    return createBroadcast(dsnpUserId, ipfsUrl, hash);
  }

  private async processReply(
    content: ReplyDto,
    dsnpUserId: string,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ReplyAnnouncement> {
    this.logger.debug(`Processing reply for ${content.inReplyTo}`);
    const [cid, ipfsUrl, hash] = await this.prepareNote(content, assetToMimeType);
    return createReply(dsnpUserId, ipfsUrl, hash, content.inReplyTo);
  }

  private async processReaction(content: ReactionDto, dsnpUserId: string): Promise<ReactionAnnouncement> {
    this.logger.debug(`Processing reaction ${content.emoji} for ${content.inReplyTo}`);
    return createReaction(dsnpUserId, content.emoji, content.inReplyTo, content.apply);
  }

  private async processUpdate(
    content: UpdateDto,
    targetAnnouncementType: AnnouncementType,
    targetContentHash: string,
    dsnpUserId: string,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<UpdateAnnouncement> {
    this.logger.debug(`Processing update`);
    const [cid, ipfsUrl, hash] = await this.prepareNote(content, assetToMimeType);
    return createUpdate(dsnpUserId, ipfsUrl, hash, targetAnnouncementType, targetContentHash);
  }

  private async processProfile(
    content: ProfileDto,
    dsnpUserId: string,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ProfileAnnouncement> {
    this.logger.debug(`Processing profile`);
    const attachments: ActivityContentImageLink[] = await this.prepareProfileIconAttachments(
      content.profile.icon ?? [],
      assetToMimeType,
    );

    const profileActivity: ActivityContentProfile = {
      '@context': 'https://www.w3.org/ns/activitystreams',
      type: 'Profile',
      name: content.profile.name,
      published: content.profile.published,
      location: this.prepareLocation(content.profile.location),
      summary: content.profile.summary,
      icon: attachments,
      tag: this.prepareTags(content.profile.tag),
    };
    const toUint8Array = new TextEncoder();
    const profileString = JSON.stringify(profileActivity);
    const profileEncoded = toUint8Array.encode(profileString);

    const [cid, hash] = await this.pinBufferToIPFS(Buffer.from(profileEncoded));
    return createProfile(dsnpUserId, this.formIpfsUrl(cid), hash);
  }

  private async prepareProfileIconAttachments(
    icons: any[],
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ActivityContentImageLink[]> {
    const attachments: ActivityContentImageLink[] = [];

    const promises = icons.map(async (icon) => {
      if (!assetToMimeType) {
        throw new Error(`asset ${icon.referenceId} should have a mimeTypes`);
      }
      const mediaType = assetToMimeType[icon.referenceId];
      const contentBuffer = await this.ipfsService.getPinned(icon.referenceId);
      const hashedContent = await calculateDsnpHash(contentBuffer);
      const image: ActivityContentImageLink = {
        mediaType,
        hash: [hashedContent],
        height: icon.height,
        width: icon.width,
        type: 'Link',
        href: this.formIpfsUrl(icon.referenceId),
      };
      attachments.push(image);
    });
    await Promise.all(promises);

    return attachments;
  }

  private prepareLocation(locationData: any): any {
    this.logger.debug(`Preparing location`);
    if (!locationData) return null;
    return {
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      radius: locationData.radius,
      altitude: locationData.altitude,
      accuracy: locationData.accuracy,
      name: locationData.name,
      units: locationData.units,
      type: 'Place',
    };
  }

  private async pinBufferToIPFS(buf: Buffer): Promise<[string, string, number]> {
    const { cid, hash, size } = await this.ipfsService.ipfsPin('application/octet-stream', buf);
    return [cid.toString(), hash, size];
  }

  private formIpfsUrl(cid: string): string {
    return this.configService.getIpfsCidPlaceholder(cid);
  }
}
