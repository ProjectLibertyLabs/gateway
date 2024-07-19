import { IsNotEmpty } from 'class-validator';

export class TransactionResponse {
  @IsNotEmpty()
  referenceId: string;
}
