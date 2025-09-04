import { InjectionToken, ValueProvider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';

export function GenerateMockProvider<T>(
  token: InjectionToken,
  target: Partial<Record<keyof T, any>>,
): ValueProvider<T> {
  return {
    provide: token,
    useValue: target as T,
  };
}

export function GenerateMockConfigProvider<T>(configName: ConfigFactoryKeyHost['KEY'], target: T): ValueProvider<T> {
  const configObj = {};
  // Create a dynamic class from the plain object
  Object.keys(target).forEach((key) =>
    Object.defineProperty(configObj, key, {
      get: jest.fn(() => target[key]),
      enumerable: true,
      configurable: true,
    }),
  );

  // Make sure we construct the proper token regardless of whether we're passed a base string, or the token itself.
  // ex: many tests may pass 'ipfs'; but some (correctly) pass `ipfsConfig.KEY`
  const configNameStr = configName.toString();
  const provide = /^CONFIGURATION\(.*\)$/.test(configNameStr) ? configNameStr : `CONFIGURATION(${configNameStr})`;

  return {
    provide,
    useValue: configObj,
  } as ValueProvider<T>;
}

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
      const re = new RegExp(`"${key}" is required`);
      await expect(setupConfigService(obj)).rejects.toThrow(re);
    },
    shouldBeOptional: async (baseObj: object, key: string) => {
      const obj = { ...baseObj };
      delete obj[key];
      await expect(setupConfigService(obj)).resolves.toBeDefined();
    },
    shouldFailBadValues: async (baseObj: object, key: string, values: any[]) => {
      const obj = { ...baseObj };
      delete obj[key];
      await Promise.all(
        values.map((v) => {
          const badObj = { ...obj };
          badObj[key] = v;
          const re = new RegExp(`"${key}" (must|failed custom validation)`);
          return expect(setupConfigService(badObj)).rejects.toThrow(re);
        }),
      );
    },
  };
};
