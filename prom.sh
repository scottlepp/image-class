PROM_PATH=`pwd`
docker run \
     -p 9090:9090 \
     -v "$PROM_PATH/prometheus.yml:/etc/prometheus/prometheus.yml" \
     prom/prometheus