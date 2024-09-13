import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AnnouncementTypeName } from '#types/enums';

export interface IWebhookRegistration {
  url: string;
  announcementTypes: string[];
}

export class WebhookRegistrationDto implements IWebhookRegistration {
  @IsNotEmpty()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  @ApiProperty({
    description: 'Webhook URL',
    example: 'https://example.com/webhook',
  })
  url: string; // Webhook URL

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AnnouncementTypeName, { each: true })
  @ApiProperty({
    description: 'Announcement types to send to the webhook',
    example: ['broadcast', 'reaction', 'tombstone', 'reply', 'update'],
  })
  announcementTypes: string[]; // Announcement types to send to the webhook
}
