import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// TODO: Add more swagger options and document the API
export const initSwagger = (app: INestApplication, apiPath: string) => {
  const options = new DocumentBuilder()
    .setTitle('Content Publishing Service API')
    .setDescription('Content Publishing Service API')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      description: 'Enter JWT token',
    })
    .addCookieAuth('SESSION')
    .build();
  const document = SwaggerModule.createDocument(app, options, {
    extraModels: [],
  });
  SwaggerModule.setup(apiPath, app, document);
};
