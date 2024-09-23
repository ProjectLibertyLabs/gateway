/* eslint-disable import/no-extraneous-dependencies */
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

export default <T>(configObj: any) => {
  const setupConfigService = async (envObj: any): Promise<T> => {
    jest.resetModules();
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    process.env = {
      ...envObj,
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [configObj],
        }),
      ],
      controllers: [],
    }).compile();

    await ConfigModule.envVariablesLoaded;

    const config = moduleRef.get<T>(configObj.KEY);
    return config;
  };

  return {
    setupConfigService,
    validateMissing: async (baseObj: object, key: string) => {
      const obj = { ...baseObj };
      delete obj[key];
      await expect(setupConfigService(obj)).rejects.toBeDefined();
    },
    shouldFailBadValues: async (baseObj: object, key: string, values: any[]) => {
      const obj = { ...baseObj };
      delete obj[key];
      await Promise.all(
        values.map((v) => {
          const badObj = { ...obj };
          badObj[key] = v;
          return expect(setupConfigService(badObj)).rejects.toBeDefined();
        }),
      );
    },
  };
};
