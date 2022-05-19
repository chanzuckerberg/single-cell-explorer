FROM ubuntu:focal

ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
ARG HAPPY_ENV
ENV HAPPY_ENV=$HAPPY_ENV
ENV DEPLOYMENT_STAGE=$HAPPY_ENV

ENV DEBIAN_FRONTEND=noninteractive

ADD hosted/requirements.txt .
ADD hosted/config.yaml .

ADD server/ server/
ADD client/ client/
ADD Makefile Makefile
ADD common.mk common.mk
ADD environment.default.json environment.default.json

RUN apt-get update && \
    apt-get install -y gettext moreutils build-essential libxml2-dev python3-dev python3-pip zlib1g-dev python3-requests python3-aiohttp llvm jq npm git zip && \
    rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.8 1

RUN python3 -m pip install psycopg2-binary
RUN python3 -m pip install -r requirements.txt

RUN make build-client

RUN mkdir -p /server/common/web/templates/

WORKDIR server/eb
RUN make build-ecs
WORKDIR /

ENV CXG_CONFIG_FILE=/config.yaml
CMD ["gunicorn", "--worker-class", "gevent", "--bind", "0.0.0.0:5000", "server.eb.app:application", "--timeout", "60"]
