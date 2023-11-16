######
###### Build targets
######

.PHONY: build
build: build-watcher

.PHONY: build-watcher
build-watcher:
	@(npm run build)

clean: clean-watcher
	@cat /dev/null

.PHONY: clean-watcher
clean-watcher:
	@rm -rf dist

######
###### Running apps targets
######

.PHONY: start-watcher
start-watcher:
	@(nest start api --watch)

######
###### Testing targets
######

.PHONY: test-services-start
test-services-start:
	@scripts/local-setup.sh -n cw-e2e -i

.PHONY: test-services-stop
test-services-stop:
	@scripts/local-setup.sh -n cw-e2e -d

######
###### Misc targets
######

.PHONY: lint
lint:
	@(npm run lint )
