SERVICES=account content-publishing content-watcher graph

BUILD_TARGETS=$(SERVICES:%=build-%)
TEST_TARGETS=$(SERVICES:%=test-%)
E2E_TARGETS=$(SERVICES:%=test-e2e-%)
K6_TARGETS=$(SERVICES:%=test-k6-%)
DOCKER_BUILD_TARGETS=$(SERVICES:%=docker-build-%)


.PHONY: build test test-e2e lint format docker-build $(TEST_TARGETS) $(E2E_TARGETS) $(DOCKER_BUILD_TARGETS)

deps:
	@npm ci

update-packages:
	@npm i

build:
	@npm run build

generate-metadata:
	@npm run generate:metadata

generate-openapi:
	@npm run generate:openapi

generate-swagger-ui:
	@npm run generate:swagger-ui

.PHONY test: $(TEST_TARGETS)
test-e2e: $(E2E_TARGETS)
# test-k6: $(K6_TARGETS)

lint:
	@npm run lint

format:
	@npm run format

docker-build: $(DOCKER_BUILD_TARGETS)

$(BUILD_TARGETS): build-%: deps
	@npm run build:$(@:build-%=%)

$(METADATA_TARGETS): metadata-%: deps
	@npm run generate:metadata:$(@:metadata-%=%)

$(OPENAPI_TARGETS): openapi-%: deps
	@npm run generate:openapi:$(@:openapi-%=%)

$(SWAGGER_TARGETS): swagger-%: openapi-%
	@npm run generate:swagger-ui:$(@:swagger-%=%)

$(TEST_TARGETS):
	@npm run test:$(@:test-%=%)

$(E2E_TARGETS):
	@npm run test:e2e:$(@:test-e2e-%=%)

# $(K6_TARGETS):
# 	@( cd apps/$(@:test-k6-%=%) ; npm run test:k6 )

$(DOCKER_BUILD_TARGETS):
	@docker build -t $(@:docker-build-%=%)-service -f Docker/Dockerfile.$(@:docker-build-%=%) .

docker-build: $(DOCKER_BUILD_TARGETS)

start-account-api: update-packages
	@npm run start:account-api:watch

start-account-worker: update-packages
	@npm run start:account-worker:watch

start-content-publishing-api: update-packages
	@npm run start:content-publishing-api:watch

start-content-publishing-worker: update-packages
	@npm run start:content-publishing-worker:watch

start-content-watcher: update-packages
	@npm run start:content-watcher:watch

start-graph-api: update-packages
	@npm run start:graph-api:watch

start-graph-worker: update-packages
	@npm run start:graph-worker:watch
