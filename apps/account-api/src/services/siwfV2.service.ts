import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  generateEncodedSignedRequest,
  generateAuthenticationUrl,
  VerifiedPhoneNumberCredential,
  VerifiedEmailAddressCredential,
  VerifiedGraphKeyCredential,
  SiwfCredentialRequest,
  SiwfResponse,
  validateSiwfResponse,
  getLoginResult,
  isCredentialEmail,
  isCredentialPhone,
  isCredentialGraph,
} from '@projectlibertylabs/siwfv2';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { WalletV2RedirectResponseDto } from '#types/dtos/account/wallet.v2.redirect.response.dto';
import { WalletV2LoginRequestDto } from '#types/dtos/account/wallet.v2.login.request.dto';
import { WalletV2LoginResponseDto } from '#types/dtos/account/wallet.v2.login.response.dto';

@Injectable()
export class SiwfV2Service {
  private readonly logger: Logger;

  constructor(
    @Inject(apiConfig.KEY) private readonly apiConf: IAccountApiConfig,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainRpcQueryService,
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

  async getPayload(request: WalletV2LoginRequestDto): Promise<SiwfResponse> {
    if (request.authorizationPayload) {
      try {
        // Await here so the error is caught
        return await validateSiwfResponse(request.authorizationPayload);
      } catch (e) {
        this.logger.warn('Failed to parse "authorizationPayload"', { error: e });
        throw new BadRequestException('Invalid `authorizationPayload` in request.');
      }
    }

    // This is used by Frequency Access
    if (request.authorizationCode) {
      try {
        // Await here so the error is caught
        return await getLoginResult(request.authorizationCode, { endpoint: this.swifV2Endpoint() });
      } catch (e) {
        this.logger.warn('Failed to retrieve valid payload from "authorizationCode"', { error: e });
        throw new BadRequestException('Invalid response from `authorizationCode` payload fetch.');
      }
    }

    throw new BadRequestException('No `authorizationPayload` or `authorizationCode` in request.');
  }

  async getSiwfV2LoginResponse(payload: SiwfResponse): Promise<WalletV2LoginResponseDto> {
    const response = new WalletV2LoginResponseDto();

    response.controlKey = payload.userPublicKey.encodedValue;

    // Try to look up the MSA id, if there is no createSponsoredAccountWithDelegation request
    if (payload.payloads.every((x) => x.endpoint.extrinsic !== 'createSponsoredAccountWithDelegation')) {
      // Get the MSA Id from the chain
      const msaId = await this.blockchainService.publicKeyToMsaId(response.controlKey);
      if (msaId) response.msaId = msaId;
    }

    // Parse out the email, phone, and graph
    const email = payload.credentials.find(isCredentialEmail)?.credentialSubject.emailAddress;
    if (email) response.email = email;

    const phoneNumber = payload.credentials.find(isCredentialPhone)?.credentialSubject.phoneNumber;
    if (phoneNumber) response.phoneNumber = phoneNumber;

    const graphKey = payload.credentials.find(isCredentialGraph)?.credentialSubject;
    if (graphKey) response.graphKey = graphKey;

    response.rawCredentials = payload.credentials;
    return response;
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
      this.logger.warn('Error during SIWF V2 Redrect URL request', { error: e });
      throw new BadRequestException('Failed to get SIWF V2 Redirect URL');
    }
    return response;
  }
}
