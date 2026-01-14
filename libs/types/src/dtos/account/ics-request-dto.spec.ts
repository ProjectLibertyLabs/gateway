import { validate, ValidationError } from 'class-validator';
import { AddNewPublicKeyAgreementRequestDto } from '#types/dtos/account/graphs.request.dto';
import { IcsPublishAllRequestDto } from '#types/dtos/account/ics.request.dto';
import {
  createIcsPublishAllRequestDto,
  createItemizedSignaturePayloadDto,
  createUpsertPagePayloadDto,
} from '#testlib/payloadDtos.spec';

function flattenErrors(errors: ValidationError[]) {
  return errors
    .map((error, index) => {
      console.log('Error at index', index, ':', {
        property: error.property,
        value: error.value,
        constraints: error.constraints,
        children: error.children?.length || 0,
        target: error.target?.constructor?.name,
      });
      if (error.constraints) {
        return Object.values(error.constraints).flat();
      }
      if (error.children.length) {
        return flattenErrors(error.children);
      }
      return [];
    })
    .flat();
}

async function validateDto(dto: any) {
  const errors = await validate(dto);
  return flattenErrors(errors);
}

describe('IcsPublishAllRequestDto', () => {
  it('requires all payloads to be present', async () => {
    const dto = new IcsPublishAllRequestDto();
    const errors = await validateDto(dto);
    expect(errors).toEqual([
      'addIcsPublicKeyPayload should not be empty',
      'addContextGroupPRIDEntryPayload should not be empty',
      'addContentGroupMetadataPayload should not be empty',
    ]);
  });
  it('requires payloads to be valid', async () => {
    let dto = new IcsPublishAllRequestDto();
    dto.addIcsPublicKeyPayload = new AddNewPublicKeyAgreementRequestDto();
    const errors = await validateDto(dto);
    expect(errors).toContain(
      'accountId should be a valid 32 bytes representing an account Id or address in Hex or SS58 format!',
    );
    expect(errors).toContain('payload should not be empty');
    expect(errors).toContain(
      'proof should be a valid 64 bytes Sr25519 signature value in hex! Or a valid 65-66 bytes MultiSignature value in hex!',
    );

    dto.addIcsPublicKeyPayload = undefined;
    dto.addContentGroupMetadataPayload = createUpsertPagePayloadDto('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY');
    expect(errors).toContain('payload should not be empty');
    expect(errors).toContain(
      'proof should be a valid 64 bytes Sr25519 signature value in hex! Or a valid 65-66 bytes MultiSignature value in hex!',
    );
  });
  it('correctly validates a good payload', async () => {
    const goodActionitemPayload = createItemizedSignaturePayloadDto('0x9999');
    await expect(validateDto(goodActionitemPayload)).resolves.toHaveLength(0);

    const dto = createIcsPublishAllRequestDto();
    await expect(validateDto(dto)).resolves.toHaveLength(0);
  });
});
