MOCHA = node_modules/.bin/mocha
XYZ = node_modules/.bin/xyz --message X.Y.Z --repo git@github.com:cheeriojs/dom-serializer.git


.PHONY: release-major release-minor release-patch
release-major: LEVEL = major
release-minor: LEVEL = minor
release-patch: LEVEL = patch

release-major release-minor release-patch:
	@$(XYZ) --increment $(LEVEL)


.PHONY: setup
setup:
	npm install


.PHONY: test
test:
	$(MOCHA)
