import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import metadata from '../../../../apps/api/src/metadata';

export const initSwagger = async (app: INestApplication, apiPath: string) => {
  const options = new DocumentBuilder()
    .setTitle('Content Watcher Service API')
    .setDescription('Content Watcher Service API')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      description: 'Enter JWT token',
    })
    .addCookieAuth('SESSION')
    .build();
  await SwaggerModule.loadPluginMetadata(metadata);
  const document = SwaggerModule.createDocument(app, options, {
    extraModels: [],
  });

  const fs = require('fs');
  fs.writeFileSync('./swagger-spec.json', JSON.stringify(document));
  SwaggerModule.setup(apiPath, app, document);
};
