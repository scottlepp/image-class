deno run \
--allow-net \
--allow-write=./cars \
--allow-read=./,./cars \
./server/server.ts