// eslint-disable-next-line max-classes-per-file
import { IsHexValue } from '#utils/decorators';
import { HexString } from '@polkadot/util/types';
import { IsAccountIdOrAddress } from '#utils/decorators/is-account-id-address.decorator';
import { IsSignature } from '#utils/decorators/is-signature.decorator';
import { IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Not used yet.
export class AddRecoveryCommitmentPayloadRequestDto {
  @IsHexValue({ minLength: 64, maxLength: 2048 })
  recoveryCommitment: HexString;

  expiration: number;
}

export class AddRecoveryCommitmentRequestDto {
  /**
   * AccountId in hex or SS58 format
   * @example '1LSLqpLWXo7A7xuiRdu6AQPnBPNJHoQSu8DBsUYJgsNEJ4N'
   */
  @IsAccountIdOrAddress()
  msaOwnerKey: string;

  /**
   * proof is the signature for the payload
   * @example '0x065d733ca151c9e65b78f2ba77348224d31647e6913c44ad2765c6e8ba06f834dc21d8182447d01c30f84a41d90a8f2e58001d825c6f0d61b0afe89f984eec85'
   */
  @IsSignature()
  proof: HexString;

  @ValidateNested()
  @IsNotEmpty()
  @Type(() => AddRecoveryCommitmentPayloadRequestDto)
  payload: AddRecoveryCommitmentPayloadRequestDto;
}

// https://testnet.frequencyaccess.com/siwa/start?signedRequest=eyJyZXF1ZXN0ZWRTaWduYXR1cmVzIjp7InB1YmxpY0tleSI6eyJlbmNvZGVkVmFsdWUiOiI1SEd2bnlYY2ZmU2dDU0xCVTRZTWtaWDJ1UHRnM0xjQnQzTThOaVFUOUR4YU03cFoiLCJlbmNvZGluZyI6ImJhc2U1OCIsImZvcm1hdCI6InNzNTgiLCJ0eXBlIjoiU2VjcDI1NmsxIn0sInNpZ25hdHVyZSI6eyJhbGdvIjoiU0VDUDI1NksxIiwiZW5jb2RpbmciOiJiYXNlMTYiLCJlbmNvZGVkVmFsdWUiOiIweDUwOTRjMTkwNDZlNDEzOGM5ZjUwM2I3ZDNlYTEyYzg3YjVhZTIwYzQ2YWJkNThjY2VhYmQ5NTYwNWU1YmZhNzUwZTAwNDc4MGRiYzY5MDgyODE1ZmRlNTRlMDg5ZmY0ZjViMmZlYzdlMzJmY2NkZDNmMGZjZjA0ZDJiMDJlZjg3In0sInBheWxvYWQiOnsiY2FsbGJhY2siOiJodHRwOi8vbG9jYWxob3N0OjMwMDAvbG9naW4iLCJwZXJtaXNzaW9ucyI6WzcsOCw5LDEwXX19LCJyZXF1ZXN0ZWRDcmVkZW50aWFscyI6W3siYW55T2YiOlt7InR5cGUiOiJWZXJpZmllZEVtYWlsQWRkcmVzc0NyZWRlbnRpYWwiLCJoYXNoIjpbImJjaXFlNHFvY3poZnRpY2k0ZHpmdmZiZWw3Zm80aDRzcjVncmNvM29vdnd5azZ5NHluZjQ0dHNpIl19XX0seyJ0eXBlIjoiVmVyaWZpZWRHcmFwaEtleUNyZWRlbnRpYWwiLCJoYXNoIjpbImJjaXFtZHZteGQ1NHp2ZTVraWZ5Y2dzZHRvYWhzNWVjZjRoYWwydHMzZWV4a2dvY3ljNW9jYTJ5Il19LHsidHlwZSI6IlZlcmlmaWVkUmVjb3ZlcnlTZWNyZXRDcmVkZW50aWFsIiwiaGFzaCI6WyJiY2lxcGc2cW00cm51Mmo0djZnaHhxcWd3a2dnb2t3dnhzM3QyYmV4YmQzb2JreXBraXJ5eWx4cSJdfV19
