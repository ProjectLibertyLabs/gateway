import { Injectable, Logger } from '@nestjs/common';
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
} from '@dsnp/activity-content/types';
import { TagTypeDto, AssetDto, AttachmentTypeDto } from '../dtos/activity.dto';
import { createNote } from '../interfaces/dsnp';
import { calculateDsnpHash } from './ipfs';
import { IpfsService } from './ipfs.client';
import { ConfigService } from '../../../../apps/api/src/config/config.service';

@Injectable()
export class BatchAnnouncer {
  private logger: Logger;

  constructor(
    private configService: ConfigService,
    private ipfsService: IpfsService,
  ) {
    this.logger = new Logger(BatchAnnouncer.name);
  }

  public async prepareNote(noteContent?: any): Promise<[string, string, string]> {
    this.logger.debug(`Preparing note`);
    const tags: ActivityContentTag[] = [];
    if (noteContent?.content.tag) {
      noteContent.content.tag.forEach((tag) => {
        switch (tag.type) {
          case TagTypeDto.Hashtag:
            tags.push({ name: tag.name || '' });
            break;
          case TagTypeDto.Mention:
            tags.push({
              name: tag.name || '',
              type: 'Mention',
              id: tag.mentionedId || '',
            });
            break;
          default:
            throw new Error(`Unsupported tag type ${typeof tag.type}`);
        }
      });
    }

    const attachments: ActivityContentAttachment[] = [];
    if (noteContent?.content.assets) {
      noteContent.content.assets.forEach(async (asset: AssetDto) => {
        switch (asset.type) {
          case AttachmentTypeDto.LINK: {
            const link: ActivityContentLink = {
              type: 'Link',
              href: asset.href || '',
              name: asset.name || '',
            };

            attachments.push(link);
            break;
          }
          case AttachmentTypeDto.IMAGE: {
            const imageLinks: ActivityContentImageLink[] = [];
            asset.references?.forEach(async (reference) => {
              const contentBuffer = await this.ipfsService.getPinned(reference.referenceId);
              const hashedContent = await calculateDsnpHash(contentBuffer);
              const image: ActivityContentImageLink = {
                mediaType: 'image', // TODO
                hash: [hashedContent],
                height: reference.height,
                width: reference.width,
                type: 'Link',
                href: await this.formIpfsUrl(reference.referenceId),
              };
              imageLinks.push(image);
            });
            const imageActivity: ActivityContentImage = {
              type: 'Image',
              name: asset.name || '',
              url: imageLinks,
            };

            attachments.push(imageActivity);
            break;
          }
          case AttachmentTypeDto.VIDEO: {
            const videoLinks: ActivityContentVideoLink[] = [];
            let duration = '';
            asset.references?.forEach(async (reference) => {
              const contentBuffer = await this.ipfsService.getPinned(reference.referenceId);
              const hashedContent = await calculateDsnpHash(contentBuffer);
              const video: ActivityContentVideoLink = {
                mediaType: 'video', // TODO
                hash: [hashedContent],
                height: reference.height,
                width: reference.width,
                type: 'Link',
                href: await this.formIpfsUrl(reference.referenceId),
              };
              duration = reference.duration ?? '';
              videoLinks.push(video);
            });
            const videoActivity: ActivityContentVideo = {
              type: 'Video',
              name: asset.name || '',
              url: videoLinks,
              duration,
            };

            attachments.push(videoActivity);
            break;
          }
          case AttachmentTypeDto.AUDIO: {
            const audioLinks: ActivityContentAudioLink[] = [];
            let duration = '';
            asset.references?.forEach(async (reference) => {
              const contentBuffer = await this.ipfsService.getPinned(reference.referenceId);
              const hashedContent = await calculateDsnpHash(contentBuffer);
              duration = reference.duration ?? '';
              const audio: ActivityContentAudioLink = {
                mediaType: 'audio', // TODO
                hash: [hashedContent],
                type: 'Link',
                href: await this.formIpfsUrl(reference.referenceId),
              };
              audioLinks.push(audio);
            });
            const audioActivity: ActivityContentAudio = {
              type: 'Audio',
              name: asset.name || '',
              url: audioLinks,
              duration,
            };

            attachments.push(audioActivity);
            break;
          }
          default:
            throw new Error(`Unsupported attachment type ${typeof asset.type}`);
        }
      });
    }

    const note = createNote(noteContent?.content.content ?? '', new Date(noteContent?.content.published ?? ''), {
      name: noteContent?.content.name,
      location: {
        latitude: noteContent?.content.location?.latitude,
        longitude: noteContent?.content.location?.longitude,
        radius: noteContent?.content.location?.radius,
        altitude: noteContent?.content.location?.altitude,
        accuracy: noteContent?.content.location?.accuracy,
        name: noteContent?.content.location?.name || '',
        type: 'Place',
      },
      tag: tags,
      attachment: attachments,
    });
    const noteString = JSON.stringify(note);
    const [cid, hash] = await this.pinStringToIPFS(Buffer.from(noteString));
    const ipfsUrl = await this.formIpfsUrl(cid);
    return [cid, hash, ipfsUrl];
  }

  private async pinStringToIPFS(buf: Buffer): Promise<[string, string]> {
    const { cid, size } = await this.ipfsService.ipfsPin('application/octet-stream', buf);
    return [cid.toString(), size.toString()];
  }

  private async formIpfsUrl(cid: string): Promise<string> {
    return this.configService.getIpfsCidPlaceholder(cid);
  }
}
