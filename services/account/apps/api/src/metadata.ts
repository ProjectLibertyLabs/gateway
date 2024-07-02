/* eslint-disable */
export default async () => {
  const t = {
    ['../../../libs/common/src/types/dtos/wallet.login.request.dto']: await import(
      '../../../libs/common/src/types/dtos/wallet.login.request.dto'
    ),
    ['@polkadot/types-codec/primitive/U32']: await import('@polkadot/types-codec/primitive/U32'),
    ['../../../libs/common/src/types/dtos/wallet.login.config.response.dto']: await import(
      '../../../libs/common/src/types/dtos/wallet.login.config.response.dto'
    ),
    ['../../../libs/common/src/types/dtos/accounts.response.dto']: await import(
      '../../../libs/common/src/types/dtos/accounts.response.dto'
    ),
    ['../../../libs/common/src/types/dtos/wallet.login.response.dto']: await import(
      '../../../libs/common/src/types/dtos/wallet.login.response.dto'
    ),
    ['../../../libs/common/src/types/dtos/delegation.response.dto']: await import(
      '../../../libs/common/src/types/dtos/delegation.response.dto'
    ),
    ['../../../libs/common/src/types/dtos/transaction.response.dto']: await import(
      '../../../libs/common/src/types/dtos/transaction.response.dto'
    ),
    ['../../../libs/common/src/types/dtos/keys.response.dto']: await import(
      '../../../libs/common/src/types/dtos/keys.response.dto'
    ),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('../../../libs/common/src/types/dtos/keys.request.dto'),
          {
            KeysRequest: {
              msaOwnerAddress: { required: true, type: () => String },
              msaOwnerSignature: { required: true, type: () => String },
              newKeyOwnerSignature: { required: true, type: () => String },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/handles.request.dto'),
          {
            HandleRequest: {
              accountId: { required: true, type: () => String },
              proof: { required: true, type: () => String },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/wallet.login.request.dto'),
          {
            ErrorResponseDto: { message: { required: true, type: () => String } },
            SiwsPayloadDto: {
              message: { required: true, type: () => String },
              signature: { required: true, type: () => String },
            },
            SignInResponseDto: {
              siwsPayload: {
                required: false,
                type: () => t['../../../libs/common/src/types/dtos/wallet.login.request.dto'].SiwsPayloadDto,
              },
              error: {
                required: false,
                type: () => t['../../../libs/common/src/types/dtos/wallet.login.request.dto'].ErrorResponseDto,
              },
            },
            EncodedExtrinsicDto: {
              pallet: { required: true, type: () => String },
              extrinsicName: { required: true, type: () => String },
              encodedExtrinsic: { required: true, type: () => String },
            },
            SignUpResponseDto: {
              extrinsics: {
                required: false,
                type: () => [t['../../../libs/common/src/types/dtos/wallet.login.request.dto'].EncodedExtrinsicDto],
              },
              error: {
                required: false,
                type: () => t['../../../libs/common/src/types/dtos/wallet.login.request.dto'].ErrorResponseDto,
              },
            },
            WalletLoginRequestDto: {
              signIn: {
                required: true,
                type: () => t['../../../libs/common/src/types/dtos/wallet.login.request.dto'].SignInResponseDto,
              },
              signUp: {
                required: true,
                type: () => t['../../../libs/common/src/types/dtos/wallet.login.request.dto'].SignUpResponseDto,
              },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/transaction.response.dto'),
          { TransactionResponse: { referenceId: { required: true, type: () => String } } },
        ],
        [
          import('../../../libs/common/src/types/dtos/wallet.login.response.dto'),
          {
            WalletLoginResponse: {
              referenceId: { required: true, type: () => String },
              msaId: { required: false, type: () => String },
              publicKey: { required: false, type: () => String },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/accounts.response.dto'),
          {
            AccountResponse: {
              msaId: { required: true, type: () => String },
              handle: { required: false, type: () => Object },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/wallet.login.config.response.dto'),
          {
            WalletLoginConfigResponse: {
              providerId: { required: true, type: () => String },
              siwfUrl: { required: true, type: () => String },
              frequencyRpcUrl: { required: true, type: () => String },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/delegation.response.dto'),
          {
            DelegationResponse: {
              providerId: { required: true, type: () => String },
              schemaPermissions: { required: true },
              revokedAt: { required: true, type: () => t['@polkadot/types-codec/primitive/U32'].u32 },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/keys.response.dto'),
          { KeysResponse: { msaKeys: { required: true } } },
        ],
      ],
      controllers: [
        [
          import('./controllers/v1/accounts-v1.controller'),
          {
            AccountsControllerV1: {
              getSIWFConfig: {
                type: t['../../../libs/common/src/types/dtos/wallet.login.config.response.dto']
                  .WalletLoginConfigResponse,
              },
              getAccount: { type: t['../../../libs/common/src/types/dtos/accounts.response.dto'].AccountResponse },
              postSignInWithFrequency: {
                type: t['../../../libs/common/src/types/dtos/wallet.login.response.dto'].WalletLoginResponse,
              },
            },
          },
        ],
        [
          import('./controllers/v1/delegation-v1.controller'),
          {
            DelegationControllerV1: {
              getDelegation: {
                type: t['../../../libs/common/src/types/dtos/delegation.response.dto'].DelegationResponse,
              },
            },
          },
        ],
        [
          import('./controllers/v1/handles-v1.controller'),
          {
            HandlesControllerV1: {
              createHandle: {
                type: t['../../../libs/common/src/types/dtos/transaction.response.dto'].TransactionResponse,
              },
              changeHandle: {
                type: t['../../../libs/common/src/types/dtos/transaction.response.dto'].TransactionResponse,
              },
              getHandle: { type: Object },
            },
          },
        ],
        [
          import('./controllers/v1/keys-v1.controller'),
          {
            KeysControllerV1: {
              addKey: { type: t['../../../libs/common/src/types/dtos/transaction.response.dto'].TransactionResponse },
              getKeys: { type: t['../../../libs/common/src/types/dtos/keys.response.dto'].KeysResponse },
            },
          },
        ],
        [import('./controllers/health.controller'), { HealthController: { healthz: {}, livez: {}, readyz: {} } }],
      ],
    },
  };
};
