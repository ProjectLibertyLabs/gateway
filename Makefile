######
###### Build targets
######

.PHONY: build
build: build-account-service

.PHONY:  build-account-service
build-account-service:
	@(npm run build)

clean: clean-account-service
	@cat /dev/null

.PHONY: clean-account-service
clean-account-service:
	@rm -rf dist

######
###### Testing targets
######

.PHONY: setup
setup:
	@cd apps/api/test/setup && npm install && npm run main

.PHONY: test-e2e
test-e2e:
	@(npm run test:e2e)

######
###### Running apps targets
######

.PHONY: start-account-service
start-account-service:
	@(nest start api --watch)

######
###### Misc targets
######

.PHONY: lint
lint:
	@(npm run lint )

.PHONY: dev-graphs
dev-graphs:
	madge --dot --extensions ts apps/worker/src > docs/worker-graph.gv
	madge --dot --extensions ts apps/api/src > docs/api-graph.gv

.PHONY: mock-webhook
mock-webhook:
	@cd rust-webhook-server && cargo run
