import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class DsnpGraphEdge {
  @IsNotEmpty()
  @IsString()
  userId: string;

  @IsNotEmpty()
  @IsNumber()
  since: number;
}
