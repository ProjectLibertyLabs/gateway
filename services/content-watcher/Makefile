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
###### Misc targets
######

.PHONY: lint
lint:
	@(npm run lint )
