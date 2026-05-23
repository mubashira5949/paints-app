DATABASE_URL=postgresql://postgres:@localhost:5432/postgres;

SCRIPT_DIR=$(dirname "$0");
psql $DATABASE_URL -c "DROP SCHEMA IF EXISTS builder CASCADE;";
psql $DATABASE_URL -f $SCRIPT_DIR/../packages/app/sql/ddl.sql -1;
npm exec pgtyped -- -c $SCRIPT_DIR/../pgtyped.config.json --uri $DATABASE_URL;
