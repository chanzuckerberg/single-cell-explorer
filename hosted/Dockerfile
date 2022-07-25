FROM ubuntu:focal

ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8
ARG HAPPY_ENV
ENV HAPPY_ENV=$HAPPY_ENV
ENV DEPLOYMENT_STAGE=$HAPPY_ENV
ENV DEBIAN_FRONTEND=noninteractive
ENV NGINX_VERSION=1.19.3

RUN apt-get update && \
    apt-get install -y gettext libpcre3 libpcre3-dev openssl libssl-dev libxslt1-dev libgd-dev libgeoip-dev moreutils build-essential libxml2-dev python3-dev python3-pip zlib1g zlib1g-dev python3-requests python3-aiohttp llvm jq npm git zip curl && \
    curl -sL https://deb.nodesource.com/setup_15.x  | bash - && \
    apt-get -y install nodejs && \
    node -v && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

RUN wget https://nginx.org/download/nginx-$NGINX_VERSION.tar.gz && tar zxvf nginx-$NGINX_VERSION.tar.gz
RUN rm nginx-$NGINX_VERSION.tar.gz
RUN git clone https://github.com/eustas/ngx_brotli.git
RUN cd ngx_brotli && git submodule update --init && cd ../

RUN cd nginx-$NGINX_VERSION && \
    ./configure $(nginx -V) --add-dynamic-module=../ngx_brotli && \
    make modules

RUN mkdir /usr/share/nginx/modules && \
    cp objs/ngx_http_brotli_filter_module.so /usr/share/nginx/modules/ngx_http_brotli_filter_module.so && \
    cp objs/ngx_http_brotli_static_module.so /usr/share/nginx/modules/ngx_http_brotli_static_module.so && \
    chmod 644 /usr/share/nginx/modules/ngx_http_brotli_filter_module.so && \
    chmod 644 /usr/share/nginx/modules/ngx_http_brotli_static_module.so


ADD hosted/requirements.txt .
COPY hosted/nginx.conf /etc/nginx/sites-available/
RUN ln -s /etc/nginx/sites-available/nginx.conf /etc/nginx/sites-enabled/nginx.conf
RUN python3 -m pip install -r requirements.txt

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

ADD hosted/config.yaml config.yaml
ADD hosted/start.sh start.sh
RUN chmod +x /start.sh
ENV CXG_CONFIG_FILE=/config.yaml

CMD ["/start.sh"]