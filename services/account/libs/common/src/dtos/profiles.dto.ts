import { Time } from '@polkadot/util/types';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProfileRequest {
      //anything else that needs to go here? can we just make one 

  @IsNotEmpty()
  content: string;
}

export class EditProfileRequest {
    //what does content mean? I feel like the content should be itemized.

  @IsNotEmpty()
  content: string;
}

//don't we want this to be an array?
export class ProfilesResponse {
  @IsNotEmpty()
  fromId: string;

  @IsNotEmpty()
  contentHash: string;

  @IsNotEmpty()
  content: string;

  @IsNotEmpty()
  timestamp: string;

  @IsOptional()
  displayHandle: string;
}