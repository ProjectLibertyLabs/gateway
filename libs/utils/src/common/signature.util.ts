import { Bytes } from '@polkadot/types';
import { SignerResult, Signer, Registry } from '@polkadot/types/types';
import { hexToU8a, isHex, u8aToHex } from '@polkadot/util';
import { signatureVerify } from '@polkadot/util-crypto';
import { CurveType, EncodingType, FormatType, isHexStr } from '@projectlibertylabs/siwfv2';
import { KeypairType } from '@polkadot/util-crypto/types';
import { KeyringPair } from '@polkadot/keyring/types';
import { getKeyringPairFromSecp256k1PrivateKey } from '@frequency-chain/ethereum-utils';
import Keyring from '@polkadot/keyring';
import { HexString } from '@polkadot/util/types';

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

export const verifySignature = (
  payloadHex: string,
  signatureHex: string,
  accountAddressOrPublicKey: string,
): SignatureVerificationResult => {
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
};

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
  actions: ({ Update: Uint8Array } | { Add: Uint8Array })[];
}

export const statefulStoragePayload = (
  registry: Registry,
  payload: StatefulStoragePayloadIn,
): StatefulStoragePayloadOut => {
  const actions = payload.actions.map((act) => {
    // Make sure that the length and other parameters are properly encoded by using Bytes and toU8a(withLength)
    const bytes = new Bytes(registry, act.payloadHex);
    switch (act.type) {
      case 'addItem':
        return { Add: bytes.toU8a(false) };
      case 'updateItem':
        return { Update: bytes.toU8a(false) };
      default:
        throw new Error(`Unknown statefulStorage action: ${act.type}`);
    }
  });

  return {
    ...payload,
    actions,
  };
};

export type KeyIdentifiers = { encodingType: EncodingType; formatType: FormatType; keyType: CurveType };
export const getTypesForKeyUriOrPrivateKey = (providerKeyUriOrPrivateKey: string): KeyIdentifiers => {
  if (providerKeyUriOrPrivateKey.match(/^0x.+/i)) {
    return {
      encodingType: 'base16',
      formatType: 'eip-55',
      keyType: 'Secp256k1',
    };
  }
  return {
    encodingType: 'base58',
    formatType: 'ss58',
    keyType: 'Sr25519',
  };
};

// Return a KeypairType based on the formatting
// KeypairType can be 'ed25519' | 'sr25519' | 'ecdsa' | 'ethereum',
// but only sr25519 and ethereum are supported.
// This assumes an Ethereum key only if provided a hex-based private key.
export const getKeypairTypeForProviderKey = (providerKeyUriOrPrivateKey: string): KeypairType => {
  if (providerKeyUriOrPrivateKey.startsWith('0x')) return 'ethereum';
  if (providerKeyUriOrPrivateKey.split(' ').length > 1) return 'sr25519';
  if (providerKeyUriOrPrivateKey.match(/^\/\/\w+/)) return 'sr25519';
  throw new Error('unsupported seed or uri or key type');
};

export const getKeyringPairFromSeedOrUriOrPrivateKey = (providerSeedUriOrPrivateKey: string): KeyringPair => {
  const keyType: KeypairType = getKeypairTypeForProviderKey(providerSeedUriOrPrivateKey);
  if (keyType === 'ethereum') {
    return getKeyringPairFromSecp256k1PrivateKey(hexToU8a(providerSeedUriOrPrivateKey));
  }
  return new Keyring({ type: keyType }).createFromUri(providerSeedUriOrPrivateKey);
};

export const getTypedSignatureForPayload = (address: string, signature: string) => {
  const keyType = getKeypairTypeForProviderKey(address);
  if (keyType === 'sr25519') {
    return { Sr25519: signature };
  }
  return {
    Ecdsa: signature,
  };
};

export const getKeypairTypeFromRequestAddress = (address: string) => {
  let convertedAddress: HexString = '0x0';
  const numBytes = 0;
  if (!isHexStr(address)) {
    const keyring = new Keyring();
    convertedAddress = u8aToHex(keyring.decodeAddress(address));
  } else {
    convertedAddress = address as HexString;
  }
  if (convertedAddress.length - 2 === 40) return 'ethereum';
  if (convertedAddress.length - 2 === 64 && convertedAddress.toLowerCase().endsWith('ee'.repeat(12))) {
    return 'ethereum';
  }
  return 'sr25519';
};
