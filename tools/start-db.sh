#!/bin/bash
set -e

SERVER="postgres";
PW="admin";
DB="nodets_dash_dev";

# Uncomment code below to remove current docker container and initiate a new fresh instance
# NOTE: your current databases will be removed
#(docker kill $SERVER || :) && \
#  (docker rm $SERVER || :) && \
#  docker run --name $SERVER -e POSTGRES_PASSWORD=$PW \
#  -e PGPASSWORD=$PW \
#  -p 5432:5432 \
#  -d postgres

# wait for pg to start
echo "sleep wait for pg-server [$SERVER] to start";
SLEEP="/bin/sleep"
$SLEEP 4;

# create the db
echo "CREATE DATABASE $DB ENCODING 'UTF-8';" | docker exec -i $SERVER psql -U postgres
echo "\l" | docker exec -i $SERVER psql -U postgres