/* eslint-disable */
export default async () => {
  const t = {
    ['../../../libs/common/src/dtos/accounts.dto']: await import(
      '../../../libs/common/src/types/dtos/accounts.dto'
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
              baseHandle: { required: true, type: () => String },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/transaction.dto'),
          {
            TransactionRepsonse: { referenceId: { required: true, type: () => String } },
            TransactionNotification: {
              msaId: { required: true, type: () => String },
              data: { required: true, type: () => Object },
            },
          },
        ],
        [
          import('../../../libs/common/src/types/dtos/accounts.dto'),
          {
            CreateAccountResponse: {
              accessToken: { required: true, type: () => String },
              expires: { required: true, type: () => Number },
            },
            Account: {
              msaId: { required: true, type: () => Number },
              handle: { required: false, type: () => Object, nullable: true },
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
              getAccount: { type: t['../../../libs/common/src/dtos/accounts.dto'].Account },
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
      ],
    },
  };
};
