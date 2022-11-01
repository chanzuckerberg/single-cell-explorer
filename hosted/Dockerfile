FROM ubuntu:focal

ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
ARG HAPPY_ENV
ENV HAPPY_ENV=$HAPPY_ENV
ENV DEPLOYMENT_STAGE=$HAPPY_ENV
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y gettext nginx moreutils build-essential libxml2-dev python3-dev python3-pip zlib1g-dev python3-requests python3-aiohttp llvm jq npm git zip curl && \
    curl -sL https://deb.nodesource.com/setup_16.x  | bash - && \
    apt-get -y install nodejs && \
    node -v && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

COPY hosted/nginx.conf /etc/nginx/nginx.conf

ADD hosted/requirements.txt .
RUN python3 -m pip install -r requirements.txt

ADD Makefile Makefile
ADD common.mk common.mk
ADD environment.default.json environment.default.json
ADD client/ client/
RUN make build-client

ADD server/ server/
RUN mkdir -p /server/common/web/templates/

WORKDIR server/
RUN make build-ecs
WORKDIR /

ADD hosted/config.yaml config.yaml
ADD hosted/start.sh start.sh
RUN chmod +x /start.sh
ENV CXG_CONFIG_FILE=/config.yaml

CMD ["/start.sh"]
