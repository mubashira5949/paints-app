.PHONY: setup-ssl start-prod stop-prod test-env logs backup-ssl restore-ssl \
	db-setup db-migrate db-seed db-seed-demo db-init db-init-demo

DOMAINS_FRONTEND = app.beautyflexinks.com
DOMAINS_BACKEND = service.beautyflexinks.com
EMAIL = smushaheed@gmail.com
COMPOSE = docker --context beautyflex-production-server compose -f deploy/prod/docker-compose.yml --env-file .env.production

create-prod:
	docker context create beautyflex-production-server --docker "host=ssh://ubuntu@ec2-13-205-196-188.ap-south-1.compute.amazonaws.com"

deploy-remote-prod:
	${COMPOSE} up --build -d

start-prod:
	${COMPOSE} up -d

stop-prod:
	${COMPOSE} down

test-env:
	${COMPOSE} config

logs:
	${COMPOSE} logs -f
backup-ssl:
	@echo "### Backing up SSL certificates to ssl_backup.tar.gz..."
	${COMPOSE} run --rm --entrypoint "tar czf - /etc/letsencrypt/" certbot > ssl_backup.tar.gz
	@echo "### Backup complete!"

restore-ssl:
	@echo "### Restoring SSL certificates from ssl_backup.tar.gz..."
	cat ssl_backup.tar.gz | ${COMPOSE} run -i --rm --entrypoint "tar xzf - -C /" certbot
	@echo "### Restore complete! Run 'make start-prod' to apply."

setup-ssl:
	@echo "### Downloading recommended TLS parameters..."
	${COMPOSE} run --rm --entrypoint sh certbot -c \
		'wget -qO /etc/letsencrypt/options-ssl-nginx.conf https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf && \
		wget -qO /etc/letsencrypt/ssl-dhparams.pem https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem'
	@echo

	@echo "### Creating dummy certificates..."
	${COMPOSE} run --rm --entrypoint sh certbot -c \
		'mkdir -p /etc/letsencrypt/live/$(DOMAINS_FRONTEND) /etc/letsencrypt/live/$(DOMAINS_BACKEND) && \
		openssl req -x509 -nodes -newkey rsa:4096 -days 1 -keyout /etc/letsencrypt/live/$(DOMAINS_FRONTEND)/privkey.pem -out /etc/letsencrypt/live/$(DOMAINS_FRONTEND)/fullchain.pem -subj "/CN=localhost" && \
		openssl req -x509 -nodes -newkey rsa:4096 -days 1 -keyout /etc/letsencrypt/live/$(DOMAINS_BACKEND)/privkey.pem -out /etc/letsencrypt/live/$(DOMAINS_BACKEND)/fullchain.pem -subj "/CN=localhost"'
	@echo

	@echo "### Starting Nginx..."
	${COMPOSE} up --build --force-recreate -d nginx
	@echo

	@echo "### Deleting dummy certificates..."
	${COMPOSE} run --rm --entrypoint sh certbot -c \
		'rm -Rf /etc/letsencrypt/live/$(DOMAINS_FRONTEND) && \
		rm -Rf /etc/letsencrypt/archive/$(DOMAINS_FRONTEND) && \
		rm -Rf /etc/letsencrypt/renewal/$(DOMAINS_FRONTEND).conf && \
		rm -Rf /etc/letsencrypt/live/$(DOMAINS_BACKEND) && \
		rm -Rf /etc/letsencrypt/archive/$(DOMAINS_BACKEND) && \
		rm -Rf /etc/letsencrypt/renewal/$(DOMAINS_BACKEND).conf'
	@echo

	@echo "### Requesting Let's Encrypt certificates..."
	${COMPOSE} run --rm --entrypoint certbot certbot certonly \
		--webroot -w /var/www/certbot --email smushaheed@gmail.com -d $(DOMAINS_FRONTEND) --rsa-key-size 4096 --agree-tos --force-renewal --non-interactive
	${COMPOSE} run --rm --entrypoint certbot certbot certonly \
		--webroot -w /var/www/certbot --email smushaheed@gmail.com -d $(DOMAINS_BACKEND) --rsa-key-size 4096 --agree-tos --force-renewal --non-interactive
	@echo

	@echo "### Reloading Nginx..."
	${COMPOSE} exec nginx nginx -s reload
	@echo
