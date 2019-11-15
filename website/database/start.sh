#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"

exec docker run \
  --name liaison-website-database \
  --rm \
  --volume ${DIR}/data:/data/db \
  --publish 127.0.0.1:18889:27017 \
  --env MONGO_INITDB_ROOT_USERNAME=username \
  --env MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:4
