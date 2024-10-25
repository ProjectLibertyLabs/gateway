import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

export interface ISwaggerDocOptions {
  title?: string;

  description?: string;

  version?: string;

  extensions?: Map<string, any>;
}

const logger = new Logger('Swagger');

export async function generateSwaggerDoc(
  app: INestApplication,
  { title, description, version, extensions }: ISwaggerDocOptions,
) {
  let builder = new DocumentBuilder();

  if (title) {
    builder = builder.setTitle(title);
  }

  if (description) {
    builder = builder.setDescription(description);
  }

  if (version) {
    builder = builder.setVersion(version);
  }

  if (extensions) {
    // eslint-disable-next-line no-restricted-syntax
    for (const [extension, value] of extensions.entries()) {
      builder = builder.addExtension(extension, value);
    }
  }

  const config = builder.build();

  return SwaggerModule.createDocument(app, config, {
    extraModels: [],
  });
}

export function initializeSwaggerUI(app: INestApplication, openapiObj: OpenAPIObject, apiPath = '/docs/swagger') {
  logger.log(`Swagger UI mounted on '${apiPath}'`);
  SwaggerModule.setup(apiPath, app, openapiObj);
}

export function writeOpenApiFile(openapiObj: OpenAPIObject, apiFile: string) {
  fs.writeFileSync(
    apiFile,
    JSON.stringify(openapiObj, (_, v) => v, 2),
  );

  logger.log(`Wrote OpenAPI spec file ${apiFile}`);
}
