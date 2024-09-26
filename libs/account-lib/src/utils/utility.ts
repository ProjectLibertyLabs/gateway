import { SignerResult, Signer } from '@polkadot/types/types';
import { hexToU8a, isHex } from '@polkadot/util';
import { signatureVerify } from '@polkadot/util-crypto';

/**
 * Returns a signer function for a given SignerResult.
 * Signer will be used to pass our verified signature to the transaction without any mutation.
 *
 * @param result - The SignerResult object.
 * @returns A Signer function that will pass the signature to the transaction without mutation.
 */
export const getSignerForRawSignature = (result: SignerResult): Signer => ({
  signRaw: (raw) => {
    console.log('signRaw function called with [raw]:', raw);
    return Promise.resolve(result);
  },
});

export class SignatureVerificationResult {
  /** The validity for this result, false if invalid */
  isValid: boolean;

  /** Flag to indicate if the passed data was wrapped in <Bytes>...</Bytes> */
  isWrapped: boolean;
}
export function verifySignature(
  payloadHex: string,
  signatureHex: string,
  accountAddressOrPublicKey: string,
): SignatureVerificationResult {
  try {
    const { isValid, isWrapped } = signatureVerify(
      hexToU8a(payloadHex),
      hexToU8a(signatureHex),
      isHex(accountAddressOrPublicKey) ? hexToU8a(accountAddressOrPublicKey) : accountAddressOrPublicKey,
    );
    return {
      isValid,
      isWrapped,
    };
  } catch (error) {
    console.error('verifySignature:', error);
    return {
      isValid: false,
      isWrapped: false,
    };
  }
}
