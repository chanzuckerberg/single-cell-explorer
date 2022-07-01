FROM ubuntu:focal as build

ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
ARG HAPPY_ENV
ENV HAPPY_ENV=$HAPPY_ENV
ENV STACK_NAME="roaga-somaexplorer"
ENV DEPLOYMENT_STAGE=$HAPPY_ENV

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y gettext moreutils build-essential libxml2-dev python3-dev python3-pip zlib1g-dev python3-requests python3-aiohttp llvm jq npm git zip && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    update-alternatives --install /usr/bin/python python /usr/bin/python3.8 1 && \
    python3 -m pip install psycopg2-binary 
    
ADD hosted/requirements.txt .
RUN python3 -m pip install -r requirements.txt

ADD hosted/create_env_config.py .
RUN python3 create_env_config.py

ADD Makefile Makefile
ADD common.mk common.mk
ADD environment.default.json environment.default.json
ADD client/ client/
RUN make build-client

ADD server/ server/
RUN mkdir -p /server/common/web/templates/

WORKDIR server/eb
RUN make build-ecs
WORKDIR /

# TODO/FIXME: if we move to Alpine, the image size is reduced ~60%, which also speeds up deploy.
# However, the below lines give the following error after deploy to AWS:
# "standard_init_linux.go:219: exec user process caused: no such file or directory"
# # Move to smaller base with only required files
# FROM alpine:latest as main
# COPY --from=build /usr/local /usr/local

ENV CXG_CONFIG_FILE=/config.yaml
CMD ["gunicorn", "--worker-class", "gevent", "--bind", "0.0.0.0:5000", "server.eb.app:application", "--timeout", "60"]