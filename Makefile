.PHONY: setup-ssl start-prod stop-prod test-env logs

DOMAINS_FRONTEND = app.beautyflexinks.com
DOMAINS_BACKEND = service.beautyflexinks.com
EMAIL = your.email@example.com

start-prod:
	docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

stop-prod:
	docker-compose -f docker-compose.prod.yml down

test-env:
	docker-compose -f docker-compose.prod.yml --env-file .env.production config

logs:
	docker-compose -f docker-compose.prod.yml logs -f

setup-ssl:
	@echo "### Downloading recommended TLS parameters..."
	mkdir -p certbot/conf
	curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "certbot/conf/options-ssl-nginx.conf"
	curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "certbot/conf/ssl-dhparams.pem"
	@echo

	@echo "### Creating dummy certificates..."
	mkdir -p certbot/conf/live/$(DOMAINS_FRONTEND) certbot/conf/live/$(DOMAINS_BACKEND)
	docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
		openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
		-keyout '/etc/letsencrypt/live/$(DOMAINS_FRONTEND)/privkey.pem' \
		-out '/etc/letsencrypt/live/$(DOMAINS_FRONTEND)/fullchain.pem' \
		-subj '/CN=localhost'" certbot
	docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
		openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
		-keyout '/etc/letsencrypt/live/$(DOMAINS_BACKEND)/privkey.pem' \
		-out '/etc/letsencrypt/live/$(DOMAINS_BACKEND)/fullchain.pem' \
		-subj '/CN=localhost'" certbot
	@echo

	@echo "### Starting Nginx..."
	docker-compose -f docker-compose.prod.yml up --force-recreate -d nginx
	@echo

	@echo "### Deleting dummy certificates..."
	docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
		rm -Rf /etc/letsencrypt/live/$(DOMAINS_FRONTEND) && \
		rm -Rf /etc/letsencrypt/archive/$(DOMAINS_FRONTEND) && \
		rm -Rf /etc/letsencrypt/renewal/$(DOMAINS_FRONTEND).conf && \
		rm -Rf /etc/letsencrypt/live/$(DOMAINS_BACKEND) && \
		rm -Rf /etc/letsencrypt/archive/$(DOMAINS_BACKEND) && \
		rm -Rf /etc/letsencrypt/renewal/$(DOMAINS_BACKEND).conf" certbot
	@echo

	@echo "### Requesting Let's Encrypt certificates..."
	docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
		certbot certonly --webroot -w /var/www/certbot \
		--email $(EMAIL) -d $(DOMAINS_FRONTEND) \
		--rsa-key-size 4096 --agree-tos --force-renewal" certbot
	docker-compose -f docker-compose.prod.yml run --rm --entrypoint "\
		certbot certonly --webroot -w /var/www/certbot \
		--email $(EMAIL) -d $(DOMAINS_BACKEND) \
		--rsa-key-size 4096 --agree-tos --force-renewal" certbot
	@echo

	@echo "### Reloading Nginx..."
	docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
	@echo
