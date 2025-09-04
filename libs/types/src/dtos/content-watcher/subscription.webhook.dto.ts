import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsUrl } from 'class-validator';
import { AnnouncementTypeName } from '#types/enums';
import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export interface IWebhookRegistration {
  url: string;
  announcementTypes: string[];
}

export class WebhookRegistrationDto implements IWebhookRegistration {
  /**
   * Webhook URL
   * @example 'https://example.com/webhook'
   */
  @IsNotEmpty()
  @IsUrl({ require_tld: false, require_protocol: true, require_valid_protocol: true })
  url: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(AnnouncementTypeName, { each: true })
  @ApiProperty({
    description: 'Announcement types to send to the webhook',
    example: ['broadcast', 'reaction', 'tombstone', 'reply', 'update'],
    enum: AnnouncementTypeName,
    enumName: 'AnnouncementTypeName', // necessary because the @nestjs/swagger CLI plugin does not generate the 'enumName' property
  })
  announcementTypes: AnnouncementTypeName[]; // Announcement types to send to the webhook
}

export class WebhookRegistrationResponseDto {
  @ApiProperty({
    description: 'Status of webhook registration response',
    example: 200,
    enum: HttpStatus,
    enumName: 'HttpStatus',
  })
  status: HttpStatus;

  /**
   * List of registered webhooks
   */
  registeredWebhooks: WebhookRegistrationDto[];
}
