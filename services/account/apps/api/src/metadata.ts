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
              dsnpId: { required: true, type: () => String },
              update: { required: true, type: () => Object },
            },
          },
        ],
      ],
      controllers: [
        [
          import('./api.controller'),
          { ApiController: { health: {}, createAccount: { type: Object } } },
        ],
      ],
    },
  };
};
