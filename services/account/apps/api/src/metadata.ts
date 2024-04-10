/* eslint-disable */
export default async () => {
  const t = {};
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('../../../libs/common/src/dtos/account.change.notification.dto'),
          {
            AccountChangeNotificationDto: {
              msaId: { required: true, type: () => String },
              update: { required: true, type: () => Object },
            },
          },
        ],
      ],
      controllers: [
        [
          import('./controllers/api.controller'),
          { ApiController: { health: {} } },
          import('./controllers/accounts.controller'),
          { AccountsController: { createAccount: { type: Object }, getAccount: { type: Object } } },
          import('./controllers/handles.controller'),
          { AccountsController: { createHandle: { type: Object }, getHandle: { type: Object } } },
        ],
      ],
    },
  };
};
