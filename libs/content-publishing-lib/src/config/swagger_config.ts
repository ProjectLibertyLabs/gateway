import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import metadata from '#content-publishing-api/metadata';

export const generateSwaggerDoc = async (app: INestApplication) => {
  const options = new DocumentBuilder()
    .setTitle('Content Publishing Service API')
    .setDescription('Content Publishing Service API')
    .setVersion('1.0')
    .build();
  await SwaggerModule.loadPluginMetadata(metadata);
  return SwaggerModule.createDocument(app, options, {
    extraModels: [],
  });
};

export const initSwagger = async (app: INestApplication, apiPath: string) => {
  const document = await generateSwaggerDoc(app);

  // write swagger.json to disk
  fs.writeFileSync(
    './swagger.json',
    JSON.stringify(document, (_, v) => v, 2),
  );
  SwaggerModule.setup(apiPath, app, document);
};
