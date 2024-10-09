/* eslint-disable max-classes-per-file */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { GraphKeyPairDto } from '#types/dtos/graph/graph-key-pair.dto';
import graphCommonConfig, { IGraphCommonConfig } from '#config/graph-common.config';
import { Aes256Gcm, CipherSuite, HkdfSha256 } from '@hpke/core';
import { DhkemX25519HkdfSha256 } from '@hpke/dhkem-x25519';
import { hexToU8a, u8aToHex } from '@polkadot/util';
import { HexString } from '@polkadot/util/types';
import lodash from 'lodash';

export class EncryptionResult {
  senderContext: HexString;

  encryptionPublicKey: HexString;

  result: GraphKeyPairDto[];
}

@Injectable()
export class EncryptionService {
  private readonly logger: Logger;

  private readonly suite: CipherSuite;

  private encryptionKey: CryptoKeyPair;

  constructor(@Inject(graphCommonConfig.KEY) private readonly config: IGraphCommonConfig) {
    this.logger = new Logger(this.constructor.name);
    this.suite = new CipherSuite({
      kem: new DhkemX25519HkdfSha256(),
      kdf: new HkdfSha256(),
      aead: new Aes256Gcm(),
    });
  }

  private async init() {
    if (this.encryptionKey === null || this.encryptionKey === undefined) {
      this.encryptionKey = await this.suite.kem.deriveKeyPair(
        new TextEncoder().encode(this.config.atRestEncryptionKeySeed),
      );
    }
  }

  /**
   * replaces private keys inside GraphKeyPairDto array with an encrypted one
   * @param graphKeyPairs
   * @returns the public key hex of encryption key used or returns null if encryption was not required
   */
  public async encryptPrivateKeys(graphKeyPairs?: GraphKeyPairDto[]): Promise<EncryptionResult | null> {
    await this.init();

    if (graphKeyPairs !== null && graphKeyPairs.length > 0) {
      const sender = await this.suite.createSenderContext({
        recipientPublicKey: this.encryptionKey.publicKey,
      });

      const decryptedKeyPairs: GraphKeyPairDto[] = [];
      for (let i = 0; i < graphKeyPairs.length; i += 1) {
        const keyPair = lodash.cloneDeep(graphKeyPairs[i]);
        const encryptedBuffer = await sender.seal(hexToU8a(keyPair.privateKey).buffer);
        keyPair.privateKey = u8aToHex(new Uint8Array(encryptedBuffer));
        decryptedKeyPairs.push(keyPair);
      }

      return {
        result: decryptedKeyPairs,
        encryptionPublicKey: await this.getEncryptionPublicKeyHex(),
        senderContext: u8aToHex(new Uint8Array(sender.enc)),
      };
    }

    return null;
  }

  /**
   * replaces encrypted private keys inside GraphKeyPairDto array with decrypted one
   * @param encryptionPublicKeyHex
   * @param senderContextHex
   * @param graphKeyPairs
   */
  public async decryptPrivateKeys(
    encryptionPublicKeyHex: string | undefined,
    senderContextHex: string | undefined,
    graphKeyPairs?: GraphKeyPairDto[] | undefined,
  ): Promise<GraphKeyPairDto[] | null> {
    await this.init();

    if (graphKeyPairs !== undefined && graphKeyPairs !== null && graphKeyPairs.length > 0) {
      const servicePublicKey = await this.getEncryptionPublicKeyHex();
      if (encryptionPublicKeyHex !== servicePublicKey) {
        throw new Error(
          `Encryption key (${encryptionPublicKeyHex}) is different from what is set in the service ${servicePublicKey}`,
        );
      }
      const recipient = await this.suite.createRecipientContext({
        recipientKey: this.encryptionKey.privateKey,
        enc: hexToU8a(senderContextHex).buffer,
      });

      const decryptedKeyPairs: GraphKeyPairDto[] = [];
      for (let i = 0; i < graphKeyPairs.length; i += 1) {
        const keyPair = lodash.cloneDeep(graphKeyPairs[i]);
        try {
          const plainBuffer = await recipient.open(hexToU8a(keyPair.privateKey).buffer);
          keyPair.privateKey = u8aToHex(new Uint8Array(plainBuffer));
          decryptedKeyPairs.push(keyPair);
        } catch (err) {
          this.logger.error(err);
          throw new Error('Decryption error');
        }
      }
      return decryptedKeyPairs;
    }

    return null;
  }

  private async getEncryptionPublicKeyHex(): Promise<HexString> {
    await this.init();
    const serializedPublicKey = await this.suite.kem.serializePublicKey(this.encryptionKey.publicKey);
    return u8aToHex(new Uint8Array(serializedPublicKey));
  }
}
