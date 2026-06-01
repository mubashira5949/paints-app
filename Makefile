.PHONY: help \
	dev-create dev-deploy dev-start dev-stop dev-config dev-logs dev-setup-ssl dev-backup-ssl dev-restore-ssl \
	prod-create prod-deploy prod-start prod-stop prod-config prod-logs prod-setup-ssl prod-backup-ssl prod-restore-ssl

# --- Environment definitions -------------------------------------------------
# Dev and prod share docker-compose.yml; what differs is the docker context
# (which EC2 host commands are sent to) and the --env-file (which sets domains,
# DATABASE_URL, JWT keys, VITE_API_URL, etc. for compose interpolation).

DEV_CTX  := beautyflex-development-server
DEV_HOST := ssh://ubuntu@ec2-13-205-200-44.ap-south-1.compute.amazonaws.com
DEV_ENV  := .env.development

PROD_CTX  := beautyflex-production-server
PROD_HOST := ssh://ubuntu@ec2-13-205-196-188.ap-south-1.compute.amazonaws.com
PROD_ENV  := .env.production

COMPOSE_FILE := docker-compose.yml

DEV_COMPOSE  := docker --context $(DEV_CTX)  compose -f $(COMPOSE_FILE) --env-file $(DEV_ENV)
PROD_COMPOSE := docker --context $(PROD_CTX) compose -f $(COMPOSE_FILE) --env-file $(PROD_ENV)

help:
	@echo "Local dev:    npm run dev          (starts postgres + backend + frontend)"
	@echo "              npm run dev:db       (postgres only)"
	@echo ""
	@echo "Remote dev:   make dev-create      (one-time docker context for $(DEV_HOST))"
	@echo "              make dev-deploy      (build + push + up on dev EC2)"
	@echo "              make dev-start|stop|logs|config|setup-ssl"
	@echo ""
	@echo "Production:   make prod-create     (one-time docker context for $(PROD_HOST))"
	@echo "              make prod-deploy     (build + push + up on prod EC2)"
	@echo "              make prod-start|stop|logs|config|setup-ssl"

# --- Dev (remote) ------------------------------------------------------------
dev-create:
	docker context create $(DEV_CTX) --docker "host=$(DEV_HOST)"

dev-deploy:
	$(DEV_COMPOSE) up --build -d

dev-start:
	$(DEV_COMPOSE) up -d

dev-stop:
	$(DEV_COMPOSE) down

dev-config:
	$(DEV_COMPOSE) config

dev-logs:
	$(DEV_COMPOSE) logs -f

dev-setup-ssl:
	@$(MAKE) --no-print-directory _setup-ssl COMPOSE="$(DEV_COMPOSE)" ENV_FILE=$(DEV_ENV)

dev-backup-ssl:
	@$(MAKE) --no-print-directory _backup-ssl COMPOSE="$(DEV_COMPOSE)"

dev-restore-ssl:
	@$(MAKE) --no-print-directory _restore-ssl COMPOSE="$(DEV_COMPOSE)"

# --- Prod (remote) -----------------------------------------------------------
prod-create:
	docker context create $(PROD_CTX) --docker "host=$(PROD_HOST)"

prod-deploy:
	$(PROD_COMPOSE) up --build -d

prod-start:
	$(PROD_COMPOSE) up -d

prod-stop:
	$(PROD_COMPOSE) down

prod-config:
	$(PROD_COMPOSE) config

prod-logs:
	$(PROD_COMPOSE) logs -f

prod-setup-ssl:
	@$(MAKE) --no-print-directory _setup-ssl COMPOSE="$(PROD_COMPOSE)" ENV_FILE=$(PROD_ENV)

prod-backup-ssl:
	@$(MAKE) --no-print-directory _backup-ssl COMPOSE="$(PROD_COMPOSE)"

prod-restore-ssl:
	@$(MAKE) --no-print-directory _restore-ssl COMPOSE="$(PROD_COMPOSE)"

# --- Internal SSL targets, parametrised by COMPOSE / ENV_FILE ----------------
.PHONY: _setup-ssl _backup-ssl _restore-ssl

_backup-ssl:
	@echo "### Backing up SSL certificates to ssl_backup.tar.gz..."
	$(COMPOSE) run --rm --entrypoint "tar czf - /etc/letsencrypt/" certbot > ssl_backup.tar.gz
	@echo "### Backup complete!"

_restore-ssl:
	@echo "### Restoring SSL certificates from ssl_backup.tar.gz..."
	cat ssl_backup.tar.gz | $(COMPOSE) run -i --rm --entrypoint "tar xzf - -C /" certbot
	@echo "### Restore complete! Run the matching '*-start' target to apply."

# _setup-ssl reads DOMAIN_FRONTEND / DOMAIN_BACKEND / LETSENCRYPT_EMAIL from
# $(ENV_FILE) so the same flow works for whichever env the caller passed in.
_setup-ssl: DOMAIN_FRONTEND  = $(shell grep -E '^DOMAIN_FRONTEND='  $(ENV_FILE) | head -n1 | cut -d= -f2- | tr -d '"')
_setup-ssl: DOMAIN_BACKEND   = $(shell grep -E '^DOMAIN_BACKEND='   $(ENV_FILE) | head -n1 | cut -d= -f2- | tr -d '"')
_setup-ssl: LETSENCRYPT_EMAIL = $(shell grep -E '^LETSENCRYPT_EMAIL=' $(ENV_FILE) | head -n1 | cut -d= -f2- | tr -d '"')
_setup-ssl:
	@echo "### Domains: $(DOMAIN_FRONTEND), $(DOMAIN_BACKEND)  (from $(ENV_FILE))"

	@echo "### Downloading recommended TLS parameters..."
	$(COMPOSE) run --rm --entrypoint sh certbot -c \
		'wget -qO /etc/letsencrypt/options-ssl-nginx.conf https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf && \
		wget -qO /etc/letsencrypt/ssl-dhparams.pem https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem'

	@echo "### Creating dummy certificates..."
	$(COMPOSE) run --rm --entrypoint sh certbot -c \
		'mkdir -p /etc/letsencrypt/live/$(DOMAIN_FRONTEND) /etc/letsencrypt/live/$(DOMAIN_BACKEND) && \
		openssl req -x509 -nodes -newkey rsa:4096 -days 1 -keyout /etc/letsencrypt/live/$(DOMAIN_FRONTEND)/privkey.pem -out /etc/letsencrypt/live/$(DOMAIN_FRONTEND)/fullchain.pem -subj "/CN=localhost" && \
		openssl req -x509 -nodes -newkey rsa:4096 -days 1 -keyout /etc/letsencrypt/live/$(DOMAIN_BACKEND)/privkey.pem -out /etc/letsencrypt/live/$(DOMAIN_BACKEND)/fullchain.pem -subj "/CN=localhost"'

	@echo "### Starting Nginx..."
	$(COMPOSE) up --build --force-recreate -d nginx

	@echo "### Deleting dummy certificates..."
	$(COMPOSE) run --rm --entrypoint sh certbot -c \
		'rm -Rf /etc/letsencrypt/live/$(DOMAIN_FRONTEND) && \
		rm -Rf /etc/letsencrypt/archive/$(DOMAIN_FRONTEND) && \
		rm -Rf /etc/letsencrypt/renewal/$(DOMAIN_FRONTEND).conf && \
		rm -Rf /etc/letsencrypt/live/$(DOMAIN_BACKEND) && \
		rm -Rf /etc/letsencrypt/archive/$(DOMAIN_BACKEND) && \
		rm -Rf /etc/letsencrypt/renewal/$(DOMAIN_BACKEND).conf'

	@echo "### Requesting Let's Encrypt certificates..."
	$(COMPOSE) run --rm --entrypoint certbot certbot certonly \
		--webroot -w /var/www/certbot --email $(LETSENCRYPT_EMAIL) -d $(DOMAIN_FRONTEND) --rsa-key-size 4096 --agree-tos --force-renewal --non-interactive
	$(COMPOSE) run --rm --entrypoint certbot certbot certonly \
		--webroot -w /var/www/certbot --email $(LETSENCRYPT_EMAIL) -d $(DOMAIN_BACKEND) --rsa-key-size 4096 --agree-tos --force-renewal --non-interactive

	@echo "### Reloading Nginx..."
	$(COMPOSE) exec nginx nginx -s reload
