import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// WebhookRegistrationDto.ts
export class WebhookRegistrationDto {
  @IsString()
  @ApiProperty({
    description: 'Webhook URL',
    example: 'https://example.com/webhook',
  })
  url: string; // Webhook URL

  @IsArray()
  @ApiProperty({
    description: 'Announcement types to send to the webhook',
    example: ['Broadcast', 'Reaction'],
  })
  announcementTypes: string[]; // Announcement types to send to the webhook
}
