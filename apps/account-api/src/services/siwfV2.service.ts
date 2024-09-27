import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  generateEncodedSignedRequest,
  generateAuthenticationUrl,
  VerifiedPhoneNumberCredential,
  VerifiedEmailAddressCredential,
  VerifiedGraphKeyCredential,
  SiwaCredentialRequest,
} from '@projectlibertylabs/siwa';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import blockchainConfig, { IBlockchainConfig } from '#account-lib/blockchain/blockchain.config';
import { WalletV2RedirectResponseDto } from '#types/dtos/account/wallet.v2.redirect.response.dto';

@Injectable()
export class SiwfV2Service {
  private readonly logger: Logger;

  constructor(
    @Inject(apiConfig.KEY) private readonly apiCOnf: IAccountApiConfig,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  private static requestedCredentialTypesToFullRequest(requestCredentials: string[]): SiwaCredentialRequest[] {
    const credentials: SiwaCredentialRequest[] = [];
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

  async getRedirectUrl(
    callbackUrl: string,
    permissions: number[],
    requestCredentials: string[],
  ): Promise<WalletV2RedirectResponseDto> {
    let response: WalletV2RedirectResponseDto;
    try {
      const { frequencyHttpUrl, siwfUrl }: IAccountApiConfig = this.apiCOnf;
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
          endpoint: siwfUrl,
        }),
        frequencyRpcUrl,
      };
    } catch (e) {
      this.logger.error(`Error during SIWF config request: ${e}`);
      throw new Error('Failed to get SIWF V2 Redirect URL');
    }
    return response;
  }
}
