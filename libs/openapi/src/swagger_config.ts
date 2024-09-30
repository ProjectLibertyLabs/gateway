import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';

export interface ISwaggerDocOptions {
  title?: string;

  description?: string;

  version?: string;
}

const logger = new Logger('Swagger');

export async function generateSwaggerDoc(
  app: INestApplication,
  metadata: () => Promise<Record<string, any>>,
  { title, description, version }: ISwaggerDocOptions,
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

  const config = builder.build();
  await SwaggerModule.loadPluginMetadata(metadata);

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
