import { Signer, SignerResult } from '@polkadot/types/types';

export function isHexString(str: string): boolean {
  const hexRegex = /^0[xX][0-9a-fA-F]+$/;
  return hexRegex.test(str);
}

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
