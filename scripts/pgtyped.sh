#!/bin/sh
# Applies sql/ddl.sql to the local postgres (deploy/local/docker-compose.yaml)
# and regenerates pgtyped types from packages/*/sql/queries.sql.
# Local DB is hardcoded so this can never accidentally run against prod.

set -e

DATABASE_URL=postgresql://postgres:@localhost:5432/postgres
SCRIPT_DIR=$(dirname "$0")

psql "$DATABASE_URL" -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
psql "$DATABASE_URL" -f "$SCRIPT_DIR/../sql/ddl.sql" -1
npm exec pgtyped -- -c "$SCRIPT_DIR/../pgtyped.config.json" --uri "$DATABASE_URL"
