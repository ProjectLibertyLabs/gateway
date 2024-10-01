import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementTypeName } from '#types/enums';

export interface IWebhookRegistration {
  url: string;
  announcementTypes: string[];
}

export class WebhookRegistrationDto implements IWebhookRegistration {
  @ApiProperty({
    description: 'Webhook URL',
    example: 'https://example.com/webhook',
  })
  @IsNotEmpty()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  url: string; // Webhook URL

  @ApiProperty({
    description: 'Announcement types to send to the webhook',
    isArray: true,
    example: ['broadcast', 'reaction', 'tombstone', 'reply', 'update'],
    enum: AnnouncementTypeName,
    enumName: 'AnnouncementTypeName',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AnnouncementTypeName, { each: true })
  announcementTypes: string[]; // Announcement types to send to the webhook
}
