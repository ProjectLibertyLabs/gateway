/* eslint-disable */
export default async () => {
  const t = {
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
            WalletLoginRequest: {
              signIn: { required: true, type: () => Object },
              signUp: { required: true, type: () => Object },
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
              msaId: { required: true, type: () => Number },
              handle: { required: false, type: () => Object, nullable: true },
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
              providerId: { required: true, type: () => Number },
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
          import('./controllers/accounts.controller'),
          {
            AccountsController: {
              getSIWFConfig: {
                type: t['../../../libs/common/src/types/dtos/wallet.login.config.response.dto']
                  .WalletLoginConfigResponse,
              },
              getAccount: { type: t['../../../libs/common/src/types/dtos/accounts.response.dto'].AccountResponse },
              signInWithFrequency: {
                type: t['../../../libs/common/src/types/dtos/wallet.login.response.dto'].WalletLoginResponse,
              },
            },
          },
        ],
        [import('./controllers/api.controller'), { ApiController: { health: {} } }],
        [
          import('./controllers/delegation.controller'),
          {
            DelegationController: {
              getDelegation: {
                type: t['../../../libs/common/src/types/dtos/delegation.response.dto'].DelegationResponse,
              },
            },
          },
        ],
        [
          import('./controllers/handles.controller'),
          {
            HandlesController: {
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
          import('./controllers/keys.controller'),
          {
            KeysController: {
              addKey: { type: t['../../../libs/common/src/types/dtos/transaction.response.dto'].TransactionResponse },
              getKeys: { type: t['../../../libs/common/src/types/dtos/keys.response.dto'].KeysResponse },
            },
          },
        ],
      ],
    },
  };
};
