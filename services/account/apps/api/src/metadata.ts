/* eslint-disable */
export default async () => {
  const t = {
    ['../../../libs/common/src/types/enums']: await import('../../../libs/common/src/types/enums'),
    ['@polkadot/types-codec/primitive/U32']: await import('@polkadot/types-codec/primitive/U32'),
    ['../../../libs/common/src/types/dtos/accounts.dto']: await import(
      '../../../libs/common/src/types/dtos/accounts.dto'
    ),
    ['../../../libs/common/src/types/dtos/delegation.dto']: await import(
      '../../../libs/common/src/types/dtos/delegation.dto'
    ),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('../../../libs/common/src/types/dtos/handles.dto'),
          {
            HandleRequest: {
              accountId: { required: true, type: () => String },
              proof: { required: true, type: () => String },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/wallet.login.response.dto'),
          {
            WalletLoginResponseDTO: {
              accessToken: { required: true, type: () => String },
              expires: { required: true, type: () => Number },
              referenceId: { required: false, type: () => String },
              msaId: { required: false, type: () => String },
            },
            SIWFSignupRequest: {
              calls: { required: true, type: () => [Object] },
              publicKey: { required: true, type: () => String },
              type: {
                required: true,
                type: () => String,
                enum: t['../../../libs/common/src/types/enums'].TransactionType.SIWF_SIGNUP,
              },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/transaction.dto'),
          {
            TransactionRepsonse: { referenceId: { required: true, type: () => String } },
            TransactionNotification: {
              msaId: { required: true, type: () => Number },
              data: { required: true, type: () => Object },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/accounts.dto'),
          {
            Account: {
              msaId: { required: true, type: () => Number },
              handle: { required: false, type: () => Object, nullable: true },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/wallet.login.request.dto'),
          {
            WalletLoginRequestDTO: {
              signIn: { required: true, type: () => Object },
              signUp: { required: true, type: () => Object },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/delegation.dto'),
          {
            DelegationResponse: {
              providerId: { required: true, type: () => Number },
              schemaPermissions: { required: true },
              revokedAt: { required: true, type: () => t['@polkadot/types-codec/primitive/U32'].u32 },
            },
          },
        ],
      ],
      controllers: [
        [import('./controllers/api.controller'), { ApiController: { health: {} } }],
        [
          import('./controllers/accounts.controller'),
          {
            AccountsController: {
              getAccount: { type: t['../../../libs/common/src/types/dtos/accounts.dto'].Account },
              signInWithFrequency: { type: Object },
            },
          },
        ],
        [
          import('./controllers/handles.controller'),
          {
            HandlesController: {
              createHandle: { type: String },
              changeHandle: { type: String },
              getHandle: { type: Object },
            },
          },
        ],
        [
          import('./controllers/delegation.controller'),
          {
            DelegationController: {
              getDelegation: { type: t['../../../libs/common/src/types/dtos/delegation.dto'].DelegationResponse },
            },
          },
        ],
        [import('./controllers/keys.controller'), { KeysController: { getKeys: {} } }],
      ],
    },
  };
};
