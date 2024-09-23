import Joi from 'joi';
import { ConfigModuleOptions } from '@nestjs/config';

export const configModuleOptions: ConfigModuleOptions = {
  isGlobal: true,
  validationSchema: Joi.object({
    BLOCKCHAIN_SCAN_INTERVAL_SECONDS: Joi.number().min(1).default(6),
    TRUST_UNFINALIZED_BLOCKS: Joi.bool().default(false),
    ASSET_EXPIRATION_INTERVAL_SECONDS: Joi.number().min(1).required(),
    BATCH_INTERVAL_SECONDS: Joi.number().min(1).required(),
    BATCH_MAX_COUNT: Joi.number().min(1).required(),
    ASSET_UPLOAD_VERIFICATION_DELAY_SECONDS: Joi.number().min(0).required(),
  }),
};
