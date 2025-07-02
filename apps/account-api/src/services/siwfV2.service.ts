import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
  hasChainSubmissions,
  isPayloadLogin,
  isPayloadAddProvider,
  SiwfResponsePayload,
} from '@projectlibertylabs/siwfv2';
import apiConfig, { IAccountApiConfig } from '#account-api/api.config';
import blockchainConfig, { IBlockchainConfig } from '#blockchain/blockchain.config';
import { BlockchainRpcQueryService } from '#blockchain/blockchain-rpc-query.service';
import { EnqueueService } from '#account-lib/services/enqueue-request.service';
import { WalletV2RedirectResponseDto } from '#types/dtos/account/wallet.v2.redirect.response.dto';
import { WalletV2LoginRequestDto } from '#types/dtos/account/wallet.v2.login.request.dto';
import { WalletV2LoginResponseDto } from '#types/dtos/account/wallet.v2.login.response.dto';
import { PublishSIWFSignupRequestDto, SIWFEncodedExtrinsic, TransactionResponse } from '#types/dtos/account';
import { TransactionType } from '#types/account-webhook';
import { isNotNull } from '#utils/common/common.utils';
import {
  chainSignature,
  getTypesForKeyUriOrPrivateKey,
  getUnifiedAddressFromAddress,
  statefulStoragePayload,
} from '#utils/common/signature.util';
import { ApiPromise } from '@polkadot/api';
import { Logger, pino } from 'pino';
import { getBasicPinoOptions } from '#logger-lib';

interface IAuthCode {
  authorizationCode?: string;
}

@Injectable()
export class SiwfV2Service {
  private readonly logger: Logger;

  constructor(
    @Inject(apiConfig.KEY)
    private readonly apiConf: IAccountApiConfig,
    @Inject(blockchainConfig.KEY) private readonly blockchainConf: IBlockchainConfig,
    private blockchainService: BlockchainRpcQueryService,
    private enqueueService: EnqueueService,
  ) {
    this.logger = pino(getBasicPinoOptions(SiwfV2Service.name));
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

  private async siwfV2PayloadToEncodedExtrinsic(
    payload: SiwfResponsePayload,
    userPublicKey: string,
  ): Promise<SIWFEncodedExtrinsic | null> {
    if (!payload.endpoint) {
      return null;
    }

    const api = await this.blockchainService.getApi();
    const { pallet, extrinsic: extrinsicName } = payload.endpoint;

    switch (`${pallet}.${extrinsicName}`) {
      case 'handles.claimHandle':
      case 'msa.grantDelegation':
      case 'msa.createSponsoredAccountWithDelegation':
        return {
          pallet,
          extrinsicName,
          encodedExtrinsic: api.tx[pallet][extrinsicName](
            userPublicKey,
            chainSignature(payload.signature),
            payload.payload,
          ).toHex(),
        };
      case 'statefulStorage.applyItemActionsWithSignatureV2':
        return {
          pallet,
          extrinsicName,
          encodedExtrinsic: (api as ApiPromise).tx.statefulStorage
            .applyItemActionsWithSignatureV2(
              userPublicKey,
              chainSignature(payload.signature),
              // TS is not smart enough to figure it out from the case
              statefulStoragePayload(api.registry, payload.payload as any),
            )
            .toHex(),
        };
      default:
        throw new Error(`Unknown payload request: ${pallet}.${extrinsicName}`);
    }
  }

  async getPayload(request: WalletV2LoginRequestDto): Promise<SiwfResponse> {
    let payload: SiwfResponse;
    const loginMsgURIValidation = this.apiConf.siwfV2URIValidation;
    if (request.authorizationPayload) {
      try {
        // Await here so the error is caught
        payload = await validateSiwfResponse(request.authorizationPayload, {
          endpoint: '',
          chainType: this.blockchainService.chainType,
          loginMsgUri: loginMsgURIValidation,
        });
        this.logger.debug(`Validated payload (${payload.userPublicKey.encodedValue})`);
      } catch (e) {
        this.logger.warn(`Failed to parse "authorizationPayload" ${e.toString()}`);
        throw new BadRequestException('Invalid `authorizationPayload` in request.');
      }
    } else if (request.authorizationCode) {
      // This is used by Frequency Access
      try {
        payload = await getLoginResult(request.authorizationCode, {
          endpoint: this.swifV2Endpoint(),
          chainType: this.blockchainService.chainType,
          loginMsgUri: loginMsgURIValidation,
        });
        this.logger.debug(
          `Retrieved payload from SIWFv2 for authorizationCode '${request.authorizationCode}' (${payload.userPublicKey.encodedValue})`,
        );
      } catch (e) {
        this.logger.error(e, 'Failed to retrieve valid payload from "authorizationCode"');
        throw new BadRequestException('Invalid response from `authorizationCode` payload fetch.');
      }
    } else {
      throw new BadRequestException('No `authorizationPayload` or `authorizationCode` in request.');
    }

    const login = payload.payloads.find(isPayloadLogin);
    const addProvider = payload.payloads.find(isPayloadAddProvider);

    // Make sure this either is a login OR delegation
    if (!login && !addProvider) {
      throw new BadRequestException(
        'Received a WalletV2LoginRequestDto that has neither a login NOR an add provider payload.',
      );
    } else if (login) {
      // Make sure the login is for me!
      // @todo
    } else if (addProvider) {
      // Make sure I'm the provider
      if (addProvider.payload.authorizedMsaId.toString() !== this.blockchainConf.providerId.toString()) {
        this.logger.error(
          `Got a request to add the Provider Id "${addProvider.payload.authorizedMsaId}", but configured for Provider Id: "${this.blockchainConf.providerId.toString()}"`,
        );
        throw new BadRequestException('Received a request for the wrong Provider Id.');
      }
    }

    this.logger.trace(`Payload: ${JSON.stringify(payload)}`);
    return payload;
  }

  async getSiwfV2LoginResponse(payload: SiwfResponse): Promise<WalletV2LoginResponseDto> {
    this.logger.debug('Generating login response');
    const response = new WalletV2LoginResponseDto();

    response.controlKey = getUnifiedAddressFromAddress(payload.userPublicKey.encodedValue);

    this.logger.trace(`controlKey = ${response.controlKey} .... response: `);

    // Get the MSA Id from the chain, if it exists
    const msaId = await this.blockchainService.publicKeyToMsaId(response.controlKey);
    this.logger.debug(`Result of MSA check: ${msaId}`);
    if (msaId) response.msaId = msaId;

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

  async queueChainActions(
    response: SiwfResponse,
    { authorizationCode }: IAuthCode,
  ): Promise<TransactionResponse | null> {
    // Don't do anything if there is nothing to do
    if (!hasChainSubmissions(response)) return null;

    try {
      const calls: PublishSIWFSignupRequestDto['calls'] = (
        await Promise.all(
          response.payloads.map((p) => this.siwfV2PayloadToEncodedExtrinsic(p, response.userPublicKey.encodedValue)),
        )
      ).filter(isNotNull);

      return this.enqueueService.enqueueRequest<PublishSIWFSignupRequestDto>({
        calls,
        type: TransactionType.SIWF_SIGNUP,
        authorizationCode,
      });
    } catch (e) {
      this.logger.warn('Error during SIWF V2 Chain Action Queuing', { error: e.toString() });
      throw new BadRequestException('Failed to process payloads');
    }
  }

  async getRedirectUrl(
    callbackUrl: string,
    permissions: number[],
    requestCredentials: string[],
  ): Promise<WalletV2RedirectResponseDto> {
    let response: WalletV2RedirectResponseDto;
    try {
      const { siwfNodeRpcUrl }: IAccountApiConfig = this.apiConf;
      const { providerKeyUriOrPrivateKey } = this.blockchainConf;
      const { encodingType, formatType, keyType } = getTypesForKeyUriOrPrivateKey(providerKeyUriOrPrivateKey);

      const signedRequest = await generateEncodedSignedRequest(
        encodingType,
        formatType,
        keyType,
        providerKeyUriOrPrivateKey,
        callbackUrl,
        permissions,
        SiwfV2Service.requestedCredentialTypesToFullRequest(requestCredentials),
      );
      const frequencyRpcUrl = siwfNodeRpcUrl.toString();
      response = {
        signedRequest,
        redirectUrl: generateAuthenticationUrl(signedRequest, new URLSearchParams({ frequencyRpcUrl }), {
          endpoint: this.swifV2Endpoint(),
          chainType: this.blockchainService.chainType,
        }),
        frequencyRpcUrl,
      };
    } catch (e) {
      this.logger.warn('Error during SIWF V2 Redrect URL request', { error: e.toString() });
      throw new BadRequestException('Failed to get SIWF V2 Redirect URL');
    }
    return response;
  }
}
