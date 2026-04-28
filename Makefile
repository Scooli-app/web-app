# 📚 Scooli Web App Makefile

APP_NAME = scooli-web-app
DOCKER_IMAGE = $(APP_NAME):dev

# --- Development (Docker) ----------------------------------------

.PHONY: dev
dev: docker-build
	docker run -it --rm \
		-p 3000:3000 \
		--env-file .env.local \
		-v "$(CURDIR)/src:/app/src" \
		-v "$(CURDIR)/public:/app/public" \
		$(DOCKER_IMAGE)

.PHONY: dev-rebuild
dev-rebuild:
	docker build --no-cache -t $(DOCKER_IMAGE) .
	$(MAKE) dev

# --- Docker Build ------------------------------------------------

.PHONY: docker-build
docker-build:
	docker build -t $(DOCKER_IMAGE) .

.PHONY: docker-shell
docker-shell:
	docker run -it --rm \
		-p 3000:3000 \
		--env-file .env.local \
		-v "$(CURDIR)/src:/app/src" \
		-v "$(CURDIR)/public:/app/public" \
		--entrypoint sh \
		$(DOCKER_IMAGE)

# --- Clean -------------------------------------------------------

.PHONY: clean
clean:
	docker rmi $(DOCKER_IMAGE) 2>/dev/null || true
ifeq ($(OS),Windows_NT)
	if exist .next rmdir /s /q .next
else
	rm -rf .next
endif
