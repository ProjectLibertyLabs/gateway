SERVICES := $(shell (cd services ; ls))

NPM_TARGETS=$(SERVICES:%=npm-%)
BUILD_TARGETS=$(SERVICES:%=build-%)
METADATA_TARGETS=$(SERVICES:%=metadata-%)
OPENAPI_TARGETS=$(SERVICES:%=openapi-%)
SWAGGER_TARGETS=$(SERVICES:%=swagger-%)
TEST_TARGETS=$(SERVICES:%=test-%)
E2E_TARGETS=$(SERVICES:%=test-e2e-%)
K6_TARGETS=$(SERVICES:%=test-k6-%)
LINT_TARGETS=$(SERVICES:%=lint-%)
FORMAT_TARGETS=$(SERVICES:%=format-%)
DOCKER_BUILD_TARGETS=$(SERVICES:%=docker-build-%)


.PHONY: build test test-e2e lint format docker-build $(BUILD_TARGETS) $(TEST_TARGETS) $(E2E_TARGETS) $(LINT_TARGETS) $(FORMAT_TARGETS) $(DOCKER_BUILD_TARGETS)

deps: $(NPM_TARGETS)
build: $(BUILD_TARGETS)
generate-metadata: $(METADATA_TARGETS)
generate-openapi: $(OPENAPI_TARGETS)
generate-swagger-ui: $(SWAGGER_TARGETS)
test: $(TEST_TARGETS)
test-e2e: $(E2E_TARGETS)
test-k6: $(K6_TARGETS)
lint: $(LINT_TARGETS)
format: $(FORMAT_TARGETS)
docker-build: $(DOCKER_BUILD_TARGETS)

$(NPM_TARGETS):
	( cd services/$(@:npm-%=%) ; npm i )

$(BUILD_TARGETS): build-%: npm-%
	@( cd services/$(@:build-%=%) ; npm run build )

$(METADATA_TARGETS): metadata-%: npm-%
	@( cd services/$(@:metadata-%=%) ; npm run generate:metadata )

$(OPENAPI_TARGETS): openapi-%: npm-%
	@( cd services/$(@:openapi-%=%) ; npm run generate:openapi )

$(SWAGGER_TARGETS): swagger-%: openapi-%
	@( cd services/$(@:swagger-%=%) ; npm run generate:swagger-ui )

$(TEST_TARGETS):
	@( cd services/$(@:test-%=%) ; npm run test )

$(E2E_TARGETS):
	@( cd services/$(@:test-e2e-%=%) ; npm run test:e2e )

$(K6_TARGETS):
	@( cd services/$(@:test-k6-%=%) ; npm run test:k6 )

$(LINT_TARGETS):
	@( cd services/$(@:lint-%=%) ; npm run lint )

$(FORMAT_TARGETS):
	@( cd services/$(@:format-%=%) ; npm run format )

$(DOCKER_BUILD_TARGETS):
	@( cd services/$(@:docker-build-%=%) ; npm run docker:build )
