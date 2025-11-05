FROM php:8.2-fpm

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    nginx \
    libzip-dev \
    jpegoptim \
    optipng \
    pngquant \
    gifsicle \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ACTIVAR OPcache con revalidacion rapida para desarrollo
RUN echo "opcache.enable=1" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.memory_consumption=256" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.max_accelerated_files=20000" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.validate_timestamps=1" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.revalidate_freq=0" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.fast_shutdown=1" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.enable_cli=1" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.interned_strings_buffer=16" >> /usr/local/etc/php/conf.d/opcache.ini && \
    echo "opcache.save_comments=1" >> /usr/local/etc/php/conf.d/opcache.ini

# Configuracion PHP optimizada
RUN echo "memory_limit=512M" >> /usr/local/etc/php/conf.d/custom.ini && \
    echo "max_execution_time=300" >> /usr/local/etc/php/conf.d/custom.ini && \
    echo "upload_max_filesize=100M" >> /usr/local/etc/php/conf.d/custom.ini && \
    echo "post_max_size=100M" >> /usr/local/etc/php/conf.d/custom.ini && \
    echo "max_input_time=300" >> /usr/local/etc/php/conf.d/custom.ini && \
    echo "realpath_cache_size=4096K" >> /usr/local/etc/php/conf.d/custom.ini && \
    echo "realpath_cache_ttl=600" >> /usr/local/etc/php/conf.d/custom.ini

# Configurar PHP-FPM para mejor rendimiento
RUN echo "[www]" > /usr/local/etc/php-fpm.d/zzz-performance.conf && \
    echo "pm = dynamic" >> /usr/local/etc/php-fpm.d/zzz-performance.conf && \
    echo "pm.max_children = 50" >> /usr/local/etc/php-fpm.d/zzz-performance.conf && \
    echo "pm.start_servers = 20" >> /usr/local/etc/php-fpm.d/zzz-performance.conf && \
    echo "pm.min_spare_servers = 10" >> /usr/local/etc/php-fpm.d/zzz-performance.conf && \
    echo "pm.max_spare_servers = 30" >> /usr/local/etc/php-fpm.d/zzz-performance.conf && \
    echo "pm.max_requests = 500" >> /usr/local/etc/php-fpm.d/zzz-performance.conf && \
    echo "pm.process_idle_timeout = 10s" >> /usr/local/etc/php-fpm.d/zzz-performance.conf && \
    echo "request_terminate_timeout = 300" >> /usr/local/etc/php-fpm.d/zzz-performance.conf

# Instalar Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Configurar directorio de trabajo
WORKDIR /var/www/html

# Copiar archivos del proyecto
COPY . .

# Instalar dependencias de PHP optimizadas
RUN composer install --optimize-autoloader --classmap-authoritative --no-dev --no-scripts && \
    composer dump-autoload --optimize --classmap-authoritative

# 🔥 NUEVO: Crear symlink de storage y permisos
RUN chown -R www-data:www-data /var/www/html && \
    chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache && \
    rm -rf /var/www/html/public/storage && \
    php artisan storage:link

# Configurar Nginx optimizado
RUN echo 'user www-data;\n\
worker_processes auto;\n\
worker_rlimit_nofile 65535;\n\
pid /run/nginx.pid;\n\
\n\
events {\n\
    worker_connections 4096;\n\
    use epoll;\n\
    multi_accept on;\n\
}\n\
\n\
http {\n\
    include /etc/nginx/mime.types;\n\
    default_type application/octet-stream;\n\
    \n\
    access_log off;\n\
    error_log /var/log/nginx/error.log warn;\n\
    \n\
    sendfile on;\n\
    tcp_nopush on;\n\
    tcp_nodelay on;\n\
    keepalive_timeout 65;\n\
    keepalive_requests 1000;\n\
    types_hash_max_size 2048;\n\
    server_tokens off;\n\
    \n\
    gzip on;\n\
    gzip_vary on;\n\
    gzip_proxied any;\n\
    gzip_comp_level 6;\n\
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;\n\
    gzip_disable "msie6";\n\
    \n\
    client_body_buffer_size 128k;\n\
    client_max_body_size 100M;\n\
    client_header_buffer_size 1k;\n\
    large_client_header_buffers 4 16k;\n\
    output_buffers 1 32k;\n\
    postpone_output 1460;\n\
    \n\
    fastcgi_cache_path /tmp/nginx_cache levels=1:2 keys_zone=FASTCGI_CACHE:100m inactive=60m;\n\
    fastcgi_cache_key "$scheme$request_method$host$request_uri";\n\
    \n\
    server {\n\
        listen 80 default_server;\n\
        listen [::]:80 default_server;\n\
        server_name _;\n\
        root /var/www/html/public;\n\
        index index.php index.html;\n\
        charset utf-8;\n\
        \n\
        client_body_timeout 12;\n\
        client_header_timeout 12;\n\
        send_timeout 10;\n\
        \n\
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {\n\
            expires 1y;\n\
            add_header Cache-Control "public, immutable";\n\
            access_log off;\n\
        }\n\
        \n\
        location / {\n\
            try_files $uri $uri/ /index.php?$query_string;\n\
        }\n\
        \n\
        location = /favicon.ico { access_log off; log_not_found off; }\n\
        location = /robots.txt  { access_log off; log_not_found off; }\n\
        \n\
        error_page 404 /index.php;\n\
        \n\
        location ~ \.php$ {\n\
            try_files $uri =404;\n\
            fastcgi_split_path_info ^(.+\.php)(/.+)$;\n\
            fastcgi_pass 127.0.0.1:9000;\n\
            fastcgi_index index.php;\n\
            fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;\n\
            include fastcgi_params;\n\
            \n\
            fastcgi_buffering on;\n\
            fastcgi_buffer_size 32k;\n\
            fastcgi_buffers 8 16k;\n\
            fastcgi_busy_buffers_size 64k;\n\
            fastcgi_temp_file_write_size 64k;\n\
            fastcgi_read_timeout 300;\n\
            fastcgi_connect_timeout 300;\n\
            fastcgi_send_timeout 300;\n\
            fastcgi_keep_conn on;\n\
            \n\
            fastcgi_cache off;\n\
        }\n\
        \n\
        location ~ /\.(?!well-known).* {\n\
            deny all;\n\
        }\n\
    }\n\
}' > /etc/nginx/nginx.conf

# Crear directorio de cache
RUN mkdir -p /tmp/nginx_cache && chown -R www-data:www-data /tmp/nginx_cache

EXPOSE 80

# Script de inicio
RUN echo '#!/bin/bash\n\
php-fpm -D\n\
nginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

CMD ["/start.sh"]