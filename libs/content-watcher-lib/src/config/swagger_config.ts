import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import metadata from '#content-watcher/metadata';

export const apiFile = './openapi-specs/content-watcher.openapi.json';

export const generateSwaggerDoc = async (app: INestApplication) => {
  const options = new DocumentBuilder()
    .setTitle('Content Watcher Service API')
    .setDescription('Content Watcher Service API')
    .setVersion('1.0')
    .build();
  await SwaggerModule.loadPluginMetadata(metadata);
  return SwaggerModule.createDocument(app, options, {
    extraModels: [],
  });
};

export const initSwagger = async (app: INestApplication, apiPath: string) => {
  const document = await generateSwaggerDoc(app);
  fs.writeFileSync(
    apiFile,
    JSON.stringify(document, (_, v) => v, 2),
  );
  SwaggerModule.setup(apiPath, app, document);
};
