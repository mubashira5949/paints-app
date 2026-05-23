FROM nginx:alpine
# nginx:alpine renders /etc/nginx/templates/*.template via envsubst into
# /etc/nginx/conf.d/ on startup. NGINX_ENVSUBST_FILTER restricts substitution
# to our placeholders so nginx's own $host, $uri, etc. are left untouched.
ENV NGINX_ENVSUBST_FILTER="^(DOMAIN_FRONTEND|DOMAIN_BACKEND)$"
COPY ./templates /etc/nginx/templates
