import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  generateEncodedSignedRequest,
  generateAuthenticationUrl,
  VerifiedPhoneNumberCredential,
  VerifiedEmailAddressCredential,
  VerifiedGraphKeyCredential,
  SiwfCredentialRequest,
} from '@projectlibertylabs/siwfv2';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BlockchainService } from '#blockchain/blockchain.service';
import { WalletV2RedirectResponseDto } from '#types/dtos/account/wallet.v2.redirect.response.dto';

@Injectable()
export class SiwfV2Service {
  private readonly logger: Logger;

  constructor(
    @Inject(apiConfig.KEY) private readonly apiConf: IAccountApiConfig,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainService,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  private static requestedCredentialTypesToFullRequest(requestCredentials: string[]): SiwfCredentialRequest[] {
    const credentials: SiwfCredentialRequest[] = [];
    if (
      requestCredentials.includes('VerifiedEmailAddressCredential') &&
      requestCredentials.includes('VerifiedPhoneNumberCredential')
    ) {
      credentials.push({
        anyOf: [VerifiedEmailAddressCredential, VerifiedPhoneNumberCredential],
      });
    } else if (requestCredentials.includes('VerifiedEmailAddressCredential')) {
      credentials.push({
        anyOf: [VerifiedEmailAddressCredential],
      });
    } else if (requestCredentials.includes('VerifiedPhoneNumberCredential')) {
      credentials.push({
        anyOf: [VerifiedPhoneNumberCredential],
      });
    }

    if (requestCredentials.includes('VerifiedGraphKeyCredential')) {
      credentials.push(VerifiedGraphKeyCredential);
    }
    return credentials;
  }

  // Default to the default "production" and "staging" endpoints for mainnet and testnet-paseo
  private swifV2Endpoint(): string {
    const { siwfV2Url }: IAccountApiConfig = this.apiConf;
    if (siwfV2Url) return siwfV2Url;
    const networkType = this.blockchainService.getNetworkType();
    if (networkType === 'mainnet') return 'production';
    if (networkType === 'testnet-paseo') return 'staging';
    throw new Error(
      'Unable to derive the SIWF V2 Redirect URL endpoint. Unknown networks require setting "SIWF_V2_URL"',
    );
  }

  async getRedirectUrl(
    callbackUrl: string,
    permissions: number[],
    requestCredentials: string[],
  ): Promise<WalletV2RedirectResponseDto> {
    let response: WalletV2RedirectResponseDto;
    try {
      const { frequencyHttpUrl }: IAccountApiConfig = this.apiConf;
      const { providerSeedPhrase } = this.blockchainConf;

      const signedRequest = await generateEncodedSignedRequest(
        providerSeedPhrase,
        callbackUrl,
        permissions,
        SiwfV2Service.requestedCredentialTypesToFullRequest(requestCredentials),
      );
      const frequencyRpcUrl = frequencyHttpUrl.toString();
      response = {
        signedRequest,
        redirectUrl: generateAuthenticationUrl(signedRequest, new URLSearchParams({ frequencyRpcUrl }), {
          endpoint: this.swifV2Endpoint(),
        }),
        frequencyRpcUrl,
      };
    } catch (e) {
      this.logger.error(`Error during SIWF V2 Redrect URL request: ${e}`);
      throw new BadRequestException('Failed to get SIWF V2 Redirect URL');
    }
    return response;
  }
}
