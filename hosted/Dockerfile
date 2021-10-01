FROM ubuntu:focal

ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8

ENV DEBIAN_FRONTEND=noninteractive

ADD hosted/requirements.txt .

ADD server/ server/
ADD client/ client/
ADD Makefile Makefile
ADD common.mk common.mk
ADD environment.default.json environment.default.json

RUN apt-get update && \
    apt-get install -y gettext moreutils build-essential libxml2-dev python3-dev python3-pip zlib1g-dev python3-requests python3-aiohttp llvm jq npm git && \
    rm -rf /var/lib/apt/lists/*

RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.8 1

RUN python3 -m pip install psycopg2-binary
RUN python3 -m pip install -r requirements.txt

COPY hosted/config-rdev.yaml /config/config.yaml

RUN make build-client
# COPY server/eb/artifact.dir/server/common/web server/eb/common
COPY server/eb/artifact.dir/server/common/web server/common/web

WORKDIR server/eb
ENV CXG_CONFIG_FILE=/config/config.yaml

ENV FLASK_ENV=development

CMD ["flask", "run", "--host", "0.0.0.0", "--port", "6000"]