#!/bin/sh

attempt=1
while [ "$attempt" -le 3 ]; do
  if npx prisma generate --schema prisma/schema.prisma; then
    exit 0
  fi

  if [ "$attempt" -lt 3 ]; then
    echo "Prisma Client generation failed; retrying..." >&2
    sleep "$((attempt * 2))"
  fi

  attempt=$((attempt + 1))
done

exit 1
