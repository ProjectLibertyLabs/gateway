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
import { Inject, Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BroadcastDto,
  ReplyDto,
  ReactionDto,
  UpdateDto,
  ProfileDto,
  TombstoneDto,
  ModifiableAnnouncementType,
  AssetDto,
  TagDto,
} from '#types/dtos/content-publishing';
import {
  IRequestJob,
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
  IAssetMetadata,
} from '#types/interfaces/content-publishing';
import { ContentPublishingQueues as QueueConstants } from '#types/constants/queue.constants';
import { AnnouncementType, AnnouncementTypeName, AttachmentType, TagTypeEnum } from '#types/enums';
import { IIpfsConfig, IpfsService } from '#storage';
import ipfsConfig, { formIpfsUrl } from '#storage/ipfs/ipfs.config';
import Redis from 'ioredis';
import { InjectRedis } from '@songkeys/nestjs-redis';
import { ContentPublisherRedisConstants } from '#types/constants';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class DsnpAnnouncementProcessor {
  constructor(
    @InjectQueue(QueueConstants.BROADCAST_QUEUE_NAME) private broadcastQueue: Queue,
    @InjectQueue(QueueConstants.REPLY_QUEUE_NAME) private replyQueue: Queue,
    @InjectQueue(QueueConstants.REACTION_QUEUE_NAME) private reactionQueue: Queue,
    @InjectQueue(QueueConstants.UPDATE_QUEUE_NAME) private updateQueue: Queue,
    @InjectQueue(QueueConstants.PROFILE_QUEUE_NAME) private profileQueue: Queue,
    @InjectQueue(QueueConstants.TOMBSTONE_QUEUE_NAME) private tombstoneQueue: Queue,
    @InjectRedis() private readonly redis: Redis,
    @Inject(ipfsConfig.KEY) private config: IIpfsConfig,
    private ipfsService: IpfsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(this.constructor.name);
  }

  public async collectAnnouncementAndQueue(data: IRequestJob) {
    this.logger.debug(`Collecting announcement and queuing`);
    this.logger.trace(`Processing Activity: ${data.announcementType} for ${data.msaId}`);
    try {
      switch (data.announcementType) {
        case AnnouncementTypeName.BROADCAST:
          await this.queueBroadcast(data);
          break;
        case AnnouncementTypeName.REPLY:
          await this.queueReply(data);
          break;
        case AnnouncementTypeName.REACTION:
          await this.queueReaction(data);
          break;
        case AnnouncementTypeName.UPDATE:
          await this.queueUpdate(data);
          break;
        case AnnouncementTypeName.PROFILE:
          await this.queueProfile(data);
          break;
        case AnnouncementTypeName.TOMBSTONE:
          await this.queueTombstone(data);
          break;
        default:
          throw new Error(`Unsupported announcement type ${typeof data.announcementType}`);
      }
    } catch (e) {
      this.logger.error(`Error processing announcement ${data.announcementType} for ${data.msaId}: ${e}`);
      throw e;
    }
  }

  private async queueBroadcast(data: IRequestJob) {
    const broadcast = await this.processBroadcast(data.content as BroadcastDto, data.msaId, data.assetToMimeType);
    await this.broadcastQueue.add(`Broadcast Job - ${data.id}`, broadcast, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async queueReply(data: IRequestJob) {
    const reply = await this.processReply(data.content as ReplyDto, data.msaId, data.assetToMimeType);
    await this.replyQueue.add(`Reply Job - ${data.id}`, reply, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async queueReaction(data: IRequestJob) {
    const reaction = await this.processReaction(data.content as ReactionDto, data.msaId);
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
      data.msaId,
      data.assetToMimeType,
    );
    await this.updateQueue.add(`Update Job - ${data.id}`, update, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async queueProfile(data: IRequestJob) {
    const profile = await this.processProfile(data.content as ProfileDto, data.msaId, data.assetToMimeType);
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
    const tombstone = createTombstone(data.msaId, announcementType, tombStoneDto.targetContentHash ?? '');
    await this.tombstoneQueue.add(`Tombstone Job - ${data.id}`, tombstone, {
      jobId: data.id,
      removeOnFail: false,
      removeOnComplete: 2000,
    });
  }

  private async getAnnouncementTypeFromModifiableAnnouncementType(
    modifiableAnnouncementType: ModifiableAnnouncementType,
  ): Promise<AnnouncementType> {
    this.logger.debug(`Getting announcement type from modifiable announcement type`);
    switch (modifiableAnnouncementType) {
      case ModifiableAnnouncementType.BROADCAST:
        return AnnouncementType.Broadcast;
      case ModifiableAnnouncementType.REPLY:
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

    const { cid, hash } = await this.ipfsService.ipfsPin('application/octet-stream', Buffer.from(encoded));
    const ipfsUrl = formIpfsUrl(cid, this.config);
    return [cid, ipfsUrl, hash];
  }

  private prepareTags(tagData?: TagDto[]): ActivityContentTag[] {
    this.logger.debug(`Preparing tags`);
    const tags: ActivityContentTag[] = [];
    if (tagData) {
      tagData.forEach((tag) => {
        switch (tag.type) {
          case TagTypeEnum.Hashtag:
            if (!tag.name) {
              throw new Error(`Tag name is required`);
            }
            tags.push({ name: tag.name });
            break;
          case TagTypeEnum.Mention:
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

  private async getDsnpMultiHash(referenceId: string): Promise<string> {
    // Get DSNP multihash for asset
    const key = await this.redis.get(ContentPublisherRedisConstants.getAssetMetadataKey(referenceId));
    let dsnpMultiHash: string;
    if (key) {
      dsnpMultiHash = (JSON.parse(key) as IAssetMetadata)?.dsnpMultiHash;
    }
    // Make sure hash was set in metadata cache
    if (!dsnpMultiHash) {
      this.logger.trace(`Asset ${referenceId} not found in metadata cache; requesting from IPFS to get hash`);
      dsnpMultiHash = await this.ipfsService.getDsnpMultiHash(referenceId, true);
    }

    if (!dsnpMultiHash) {
      throw new Error(`Unable to get DSNP multihash for asset: ${referenceId}`);
    }

    return dsnpMultiHash;
  }

  private async prepareAttachments(
    assetData?: AssetDto[],
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ActivityContentAttachment[]> {
    const attachments: ActivityContentAttachment[] = [];
    if (assetData) {
      const promises = assetData.map(async (asset) => {
        if (asset.isLink === true) {
          attachments.push(this.prepareLinkAttachment(asset));
        } else if (asset.references) {
          const assetPromises = asset.references.map(async (reference) => {
            const dsnpMultiHash = await this.getDsnpMultiHash(reference.referenceId);
            if (!assetToMimeType) {
              throw new Error(`asset ${reference.referenceId} should have a mimeTypes`);
            }
            const { attachmentType } = assetToMimeType[reference.referenceId];
            switch (attachmentType) {
              case AttachmentType.IMAGE:
                attachments.push(await this.prepareImageAttachment(asset, dsnpMultiHash, assetToMimeType));
                break;
              case AttachmentType.VIDEO:
                attachments.push(await this.prepareVideoAttachment(asset, dsnpMultiHash, assetToMimeType));
                break;
              case AttachmentType.AUDIO:
                attachments.push(await this.prepareAudioAttachment(asset, dsnpMultiHash, assetToMimeType));
                break;
              case AttachmentType.LINK:
                throw new Error(`Links should not get included inside references ${JSON.stringify(reference)}`);
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
    dsnpMultiHash: string,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ActivityContentImage> {
    const imageLinks: ActivityContentImageLink[] = [];
    if (asset.references) {
      const promises = asset.references.map(async (reference) => {
        if (!assetToMimeType) {
          throw new Error(`asset ${reference.referenceId} should have a mimeTypes`);
        }
        const mediaType = assetToMimeType[reference.referenceId];
        const image: ActivityContentImageLink = {
          mediaType,
          hash: [dsnpMultiHash],
          height: reference.height,
          width: reference.width,
          type: 'Link',
          href: formIpfsUrl(reference.referenceId, this.config),
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
    dsnpMultiHash: string,
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
        const video: ActivityContentVideoLink = {
          mediaType,
          hash: [dsnpMultiHash],
          height: reference.height,
          width: reference.width,
          type: 'Link',
          href: formIpfsUrl(reference.referenceId, this.config),
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
    dsnpMultiHash: string,
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
        duration = duration ?? reference.duration ?? '';
        const audio: ActivityContentAudioLink = {
          mediaType,
          hash: [dsnpMultiHash],
          type: 'Link',
          href: formIpfsUrl(reference.referenceId, this.config),
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
    const [_cid, ipfsUrl, hash] = await this.prepareNote(content, assetToMimeType);
    return createBroadcast(dsnpUserId, ipfsUrl, hash);
  }

  private async processReply(
    content: ReplyDto,
    dsnpUserId: string,
    assetToMimeType?: IRequestJob['assetToMimeType'],
  ): Promise<ReplyAnnouncement> {
    this.logger.debug(`Processing reply for ${content.inReplyTo}`);
    const [_cid, ipfsUrl, hash] = await this.prepareNote(content, assetToMimeType);
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
    const [_cid, ipfsUrl, hash] = await this.prepareNote(content, assetToMimeType);
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

    const { cid, hash } = await this.ipfsService.ipfsPin('application/octet-stream', Buffer.from(profileEncoded));
    return createProfile(dsnpUserId, formIpfsUrl(cid, this.config), hash);
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
      const dsnpMultiHash = await this.getDsnpMultiHash(icon.referenceId);
      const image: ActivityContentImageLink = {
        mediaType,
        hash: [dsnpMultiHash],
        height: icon.height,
        width: icon.width,
        type: 'Link',
        href: formIpfsUrl(icon.referenceId, this.config),
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
}
