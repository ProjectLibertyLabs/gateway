import { IsString, MinLength } from 'class-validator';

export class GraphChangeResponseDto {
  /**
   * Reference ID by which the results/status of a submitted GraphChangeRequest may be retrieved
   * @example 'bee2d0d2f658126c563088217e106f2fa9e56ed4'
   */
  @MinLength(1)
  @IsString()
  referenceId: string;
}
