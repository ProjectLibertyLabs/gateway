# General Notes for Contributors

Collected below are some general notes on coding conventions and other tips for contributors.

## Adding Controllers

When adding a new endpoint controller, be sure to do the following:

- [ ] Include the following decorators on the main controller class:

```typescript
@Controller({ version: 'API-version-number-as-string', path: 'controller-path' })`
@ApiTags(`v${API-version-number}/${controller-path})
```

- [ ] Add the new controller to the `x-tagGroups` Redocly OpenAPI extension in the app's `main.ts:generateSwaggerDoc()` call

## Documenting Endpoints and Payloads

### App Service Endpoints

For actual application endpoints, document the payloads and endpoints with the appropriate `@nestjs/swagger` decorators and JSDoc comments and run `npm run generate:openapi` to update the OpenAPI specs. When doing so, observe the following conventions:

- Avoid using the `@ApiProperty(...)` decorator if possible; instead, just use appropriate types for the DTO classes, include optional `?` indicators, and use a JSDoc comment to specify the description and `@example` properties.
  - One notable exception; in order to properly annotate enum types, you must use the `@ApiProperty()` decorator with the `enum` and `enumName` properties.

### Webhook Endpoints

Because the `@nestjs/swagger` package doesn't support extracting documentation for types and paths not attached to a controller in the app, webhook specifications are maintained manually and used to generate types used in the app. Add any updates or new types and paths to the appropriate YAML or JSON file, and run `npm generate:types` to update the generated types in the code.
