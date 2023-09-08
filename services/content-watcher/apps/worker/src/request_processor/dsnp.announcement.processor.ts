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
import {
  TagTypeDto,
  AssetDto,
  AttachmentTypeDto,
  IRequestJob,
  QueueConstants,
  BroadcastDto,
  ProfileDto,
  ReactionDto,
  ReplyDto,
  UpdateDto,
  AnnouncementTypeDto,
  TombstoneDto,
  ModifiableAnnouncementTypeDto,
} from '../../../../libs/common/src';
import { IpfsService } from '../../../../libs/common/src/utils/ipfs.client';
import { ConfigService } from '../../../api/src/config/config.service';
import { calculateDsnpHash } from '../../../../libs/common/src/utils/ipfs';
import {
  AnnouncementType,
  BroadcastAnnouncement,
  ProfileAnnouncement,
  ReactionAnnouncement,
  ReplyAnnouncement,
  UpdateAnnouncement,
  createBroadcast,
  createNote,
  createProfile,
  createReaction,
  createReply,
  createTombstone,
  createUpdate,
} from '../../../../libs/common/src/interfaces/dsnp';

@Injectable()
export class DsnpAnnouncementProcessor {
  private logger: Logger;

  constructor(
    @InjectQueue(QueueConstants.ASSET_QUEUE_NAME) private assetQueue: Queue,
    @InjectQueue(QueueConstants.BROADCAST_QUEUE_NAME) private broadcastQueue: Queue,
    @InjectQueue(QueueConstants.REPLY_QUEUE_NAME) private replyQueue: Queue,
    @InjectQueue(QueueConstants.REACTION_QUEUE_NAME) private reactionQueue: Queue,
    @InjectQueue(QueueConstants.UPDATE_QUEUE_NAME) private updateQueue: Queue,
    @InjectQueue(QueueConstants.PROFILE_QUEUE_NAME) private profileQueue: Queue,
    @InjectQueue(QueueConstants.TOMBSTONE_QUEUE_NAME) private tombstoneQueue: Queue,
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
    const broadcast = await this.processBroadcast(data.content as BroadcastDto, data.dsnpUserId);
    await this.broadcastQueue.add(`Broadcast Job - ${data.id}`, broadcast, { jobId: data.id, removeOnFail: false, removeOnComplete: 2000 });
  }

  private async queueReply(data: IRequestJob) {
    const reply = await this.processReply(data.content as ReplyDto, data.dsnpUserId);
    await this.replyQueue.add(`Reply Job - ${data.id}`, reply, { jobId: data.id, removeOnFail: false, removeOnComplete: 2000 });
  }

  private async queueReaction(data: IRequestJob) {
    const reaction = await this.processReaction(data.content as ReactionDto, data.dsnpUserId);
    await this.reactionQueue.add(`Reaction Job - ${data.id}`, reaction, { jobId: data.id, removeOnFail: false, removeOnComplete: 2000 });
  }

  private async queueUpdate(data: IRequestJob) {
    const updateDto = data.content as UpdateDto;
    const updateAnnouncementType: AnnouncementType = await this.getAnnouncementTypeFromModifiableAnnouncementType(updateDto.targetAnnouncementType);
    const update = await this.processUpdate(updateDto, updateAnnouncementType, updateDto.targetContentHash ?? '', data.dsnpUserId);
    await this.updateQueue.add(`Update Job - ${data.id}`, update, { jobId: data.id, removeOnFail: false, removeOnComplete: 2000 });
  }

  private async queueProfile(data: IRequestJob) {
    const profile = await this.processProfile(data.content as ProfileDto, data.dsnpUserId);
    await this.profileQueue.add(`Profile Job - ${data.id}`, profile, { jobId: data.id, removeOnFail: false, removeOnComplete: 2000 });
  }

  private async queueTombstone(data: IRequestJob) {
    const tombStoneDto = data.content as TombstoneDto;
    const announcementType: AnnouncementType = await this.getAnnouncementTypeFromModifiableAnnouncementType(tombStoneDto.targetAnnouncementType);
    const tombstone = createTombstone(data.dsnpUserId, announcementType, tombStoneDto.targetContentHash ?? '');
    await this.tombstoneQueue.add(`Tombstone Job - ${data.id}`, tombstone, { jobId: data.id, removeOnFail: false, removeOnComplete: 2000 });
  }

  private async getAnnouncementTypeFromModifiableAnnouncementType(modifiableAnnouncementType: ModifiableAnnouncementTypeDto): Promise<AnnouncementType> {
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

  public async prepareNote(noteContent?: any): Promise<[string, string, string]> {
    this.logger.debug(`Preparing note`);
    const tags: ActivityContentTag[] = this.prepareTags(noteContent?.content.tag);
    const attachments: ActivityContentAttachment[] = await this.prepareAttachments(noteContent?.content.assets);

    const note = createNote(noteContent?.content.content ?? '', new Date(noteContent?.content.published ?? ''), {
      name: noteContent?.content.name,
      location: this.prepareLocation(noteContent?.content.location),
      tag: tags,
      attachment: attachments,
    });
    const noteString = JSON.stringify(note);
    const [cid, hash] = await this.pinBufferToIPFS(Buffer.from(noteString));
    const ipfsUrl = await this.formIpfsUrl(cid);
    return [cid, ipfsUrl, hash];
  }

  private prepareTags(tagData?: any[]): ActivityContentTag[] {
    this.logger.debug(`Preparing tags`);
    const tags: ActivityContentTag[] = [];
    if (tagData) {
      tagData.forEach((tag) => {
        switch (tag.type) {
          case TagTypeDto.Hashtag:
            tags.push({ name: tag.name });
            break;
          case TagTypeDto.Mention:
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

  private async prepareAttachments(assetData?: any[]): Promise<ActivityContentAttachment[]> {
    const attachments: ActivityContentAttachment[] = [];
    if (assetData) {
      assetData.forEach(async (asset) => {
        switch (asset.type) {
          case AttachmentTypeDto.LINK:
            attachments.push(this.prepareLinkAttachment(asset));
            break;
          case AttachmentTypeDto.IMAGE:
            attachments.push(await this.prepareImageAttachment(asset));
            break;
          case AttachmentTypeDto.VIDEO:
            attachments.push(await this.prepareVideoAttachment(asset));
            break;
          case AttachmentTypeDto.AUDIO:
            attachments.push(await this.prepareAudioAttachment(asset));
            break;
          default:
            throw new Error(`Unsupported attachment type ${typeof asset.type}`);
        }
      });
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

  private async prepareImageAttachment(asset: AssetDto): Promise<ActivityContentImage> {
    const imageLinks: ActivityContentImageLink[] = [];
    asset.references?.forEach(async (reference) => {
      const assetMetaData = await this.assetQueue.getJob(reference.referenceId);
      const contentBuffer = await this.ipfsService.getPinned(reference.referenceId);
      const hashedContent = await calculateDsnpHash(contentBuffer);
      const image: ActivityContentImageLink = {
        mediaType: assetMetaData?.data.mimeType,
        hash: [hashedContent],
        height: reference.height,
        width: reference.width,
        type: 'Link',
        href: await this.formIpfsUrl(reference.referenceId),
      };
      imageLinks.push(image);
    });

    return {
      type: 'Image',
      name: asset.name,
      url: imageLinks,
    };
  }

  private async prepareVideoAttachment(asset: AssetDto): Promise<ActivityContentVideo> {
    const videoLinks: ActivityContentVideoLink[] = [];
    let duration = '';
    asset.references?.forEach(async (reference) => {
      const assetMetaData = await this.assetQueue.getJob(reference.referenceId);
      const contentBuffer = await this.ipfsService.getPinned(reference.referenceId);
      const hashedContent = await calculateDsnpHash(contentBuffer);
      const video: ActivityContentVideoLink = {
        mediaType: assetMetaData?.data.mimeType,
        hash: [hashedContent],
        height: reference.height,
        width: reference.width,
        type: 'Link',
        href: await this.formIpfsUrl(reference.referenceId),
      };
      duration = duration ?? reference.duration ?? '';
      videoLinks.push(video);
    });

    return {
      type: 'Video',
      name: asset.name,
      url: videoLinks,
      duration,
    };
  }

  private async prepareAudioAttachment(asset: AssetDto): Promise<ActivityContentAudio> {
    const audioLinks: ActivityContentAudioLink[] = [];
    let duration = '';
    asset.references?.forEach(async (reference) => {
      const assetMetaData = await this.assetQueue.getJob(reference.referenceId);
      const contentBuffer = await this.ipfsService.getPinned(reference.referenceId);
      const hashedContent = await calculateDsnpHash(contentBuffer);
      duration = duration ?? reference.duration ?? '';
      const audio: ActivityContentAudioLink = {
        mediaType: assetMetaData?.data.mimeType,
        hash: [hashedContent],
        type: 'Link',
        href: await this.formIpfsUrl(reference.referenceId),
      };
      audioLinks.push(audio);
    });

    return {
      type: 'Audio',
      name: asset.name,
      url: audioLinks,
      duration,
    };
  }

  private async processBroadcast(content: BroadcastDto, dsnpUserId: string): Promise<BroadcastAnnouncement> {
    this.logger.debug(`Processing broadcast`);
    const [cid, ipfsUrl, hash] = await this.prepareNote(content);
    return createBroadcast(dsnpUserId, ipfsUrl, hash);
  }

  private async processReply(content: ReplyDto, dsnpUserId: string): Promise<ReplyAnnouncement> {
    this.logger.debug(`Processing reply for ${content.inReplyTo}`);
    const [cid, ipfsUrl, hash] = await this.prepareNote(content);
    return createReply(dsnpUserId, ipfsUrl, hash, content.inReplyTo);
  }

  private async processReaction(content: ReactionDto, dsnpUserId: string): Promise<ReactionAnnouncement> {
    this.logger.debug(`Processing reaction ${content.emoji} for ${content.inReplyTo}`);
    return createReaction(dsnpUserId, content.emoji, content.inReplyTo);
  }

  private async processUpdate(content: UpdateDto, targetAnnouncementType: AnnouncementType, targetContentHash: string, dsnpUserId: string): Promise<UpdateAnnouncement> {
    this.logger.debug(`Processing update`);
    const [cid, ipfsUrl, hash] = await this.prepareNote(content);
    return createUpdate(dsnpUserId, ipfsUrl, hash, targetAnnouncementType, targetContentHash);
  }

  private async processProfile(content: ProfileDto, dsnpUserId: string): Promise<ProfileAnnouncement> {
    this.logger.debug(`Processing profile`);
    const attachments: ActivityContentImageLink[] = await this.prepareProfileIconAttachments(content.profile.icon ?? []);

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
    const profileString = JSON.stringify(profileActivity);
    const [cid, hash] = await this.pinBufferToIPFS(Buffer.from(profileString));
    return createProfile(dsnpUserId, await this.formIpfsUrl(cid), hash);
  }

  private async prepareProfileIconAttachments(icons: any[]): Promise<ActivityContentImageLink[]> {
    const attachments: ActivityContentImageLink[] = [];
    icons.forEach(async (icon) => {
      const assetMetaData = await this.assetQueue.getJob(icon.referenceId);
      const contentBuffer = await this.ipfsService.getPinned(icon.referenceId);
      const hashedContent = await calculateDsnpHash(contentBuffer);
      const image: ActivityContentImageLink = {
        mediaType: assetMetaData?.data.mimeType,
        hash: [hashedContent],
        height: icon.height,
        width: icon.width,
        type: 'Link',
        href: await this.formIpfsUrl(icon.referenceId),
      };
      attachments.push(image);
    });

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

  private async formIpfsUrl(cid: string): Promise<string> {
    return this.configService.getIpfsCidPlaceholder(cid);
  }
}
