FROM us-central1-docker.pkg.dev/serverless-runtimes/google-22-full/runtimes/nodejs20

USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends firebird3.0-server firebird3.0-utils && \
    rm -rf /var/lib/apt/lists/* && \
    (service firebird3.0 start || true)

USER node
