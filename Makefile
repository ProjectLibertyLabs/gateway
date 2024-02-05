######
###### Build targets
######

.PHONY: build
build: build-graph-service

.PHONY:  build-graph-service
build-graph-service:
	@(npm run build)

clean: clean-graph-service
	@cat /dev/null

.PHONY: clean-graph-service
clean-graph-service:
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

.PHONY: start-graph-service
start-graph-service:
	@(nest start api --watch)

######
###### Misc targets
######

.PHONY: lint
lint:
	@(npm run lint )
