import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export interface IWebhookRegistration {
  url: string;
  announcementTypes: string[];
}

export class WebhookRegistrationDto implements IWebhookRegistration {
  @IsString()
  @ApiProperty({
    description: 'Webhook URL',
    example: 'https://example.com/webhook',
  })
  url: string; // Webhook URL

  @IsArray()
  @ApiProperty({
    description: 'Announcement types to send to the webhook',
    example: ['Broadcast', 'Reaction', 'Tombstone', 'Reply', 'Update'],
  })
  announcementTypes: string[]; // Announcement types to send to the webhook
}
