/* eslint-disable max-classes-per-file */
import { Time } from '@polkadot/util/types';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProfileRequest {
  // TODO: anything else that needs to go here? can we just make one
  @IsNotEmpty()
  content: string;
}

export class EditProfileRequest {
  // TODO: what does content mean? I feel like the content should be itemized.
  // TODO: why do we have to have two if they're the same type?
  @IsNotEmpty()
  content: string;
}

export class Profile {
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

export type ProfilesResponse = Profile[];
