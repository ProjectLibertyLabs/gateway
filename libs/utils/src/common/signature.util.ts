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
    return {
      isValid: false,
      isWrapped: false,
    };
  }
}

// Take a SIWF signature and convert it to one for Polkadotjs API
export const chainSignature = (signature: {
  encodedValue: string;
  algo: string;
}):
  | {
      Ed25519: any;
    }
  | {
      Sr25519: any;
    }
  | {
      Ecdsa: any;
    } => {
  switch (signature.algo.toLowerCase()) {
    case 'sr25519':
      return { Sr25519: signature.encodedValue };
    case 'ed25519':
      return { Ed25519: signature.encodedValue };
    case 'ecdsa':
      return { Ecdsa: signature.encodedValue };
    default:
      throw new Error(`Unknown signature algorithm: ${signature.algo}`);
  }
};

interface StatefulStoragePayloadCommon {
  schemaId: number;
  targetHash: number;
  expiration: number;
}

interface StatefulStoragePayloadIn extends StatefulStoragePayloadCommon {
  actions: { type: 'addItem' | 'updateItem'; payloadHex: string }[];
}

interface StatefulStoragePayloadOut extends StatefulStoragePayloadCommon {
  actions: ({ Update: string } | { Add: string })[];
}

export const statefulStoragePayload = (payload: StatefulStoragePayloadIn): StatefulStoragePayloadOut => {
  const actions = payload.actions.map((act) => {
    switch (act.type) {
      case 'addItem':
        return { Add: act.payloadHex };
      case 'updateItem':
        return { Update: act.payloadHex };
      default:
        throw new Error(`Unknown statefulStorage action: ${act.type}`);
    }
  });

  return {
    ...payload,
    actions,
  };
};
