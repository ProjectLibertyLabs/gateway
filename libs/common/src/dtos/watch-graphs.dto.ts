import { IsArray, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class WatchGraphsDto {
  @IsArray()
  @IsNotEmpty()
  dsnpIds: string[];

  @IsNotEmpty()
  @IsString()
  @IsUrl()
  webhookEndpoint: string;
}
