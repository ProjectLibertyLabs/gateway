import { ApiProperty } from '@nestjs/swagger';
import { JobState } from 'bullmq';

export class TransactionResponse {
  referenceId: string;

  // JobState is a string union type; it's not possible to extract the specific values here
  // without hard-coding them, and since it's a response only, we don't need to validate, so it
  // can just be 'String'
  @ApiProperty({ description: 'Job state', name: 'state', type: String, example: 'waiting' })
  state?: JobState | 'unknown';
}
