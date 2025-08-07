#!/bin/bash
# Nginx配置脚本（CentOS 版）
set -e

echo "开始配置Nginx..."

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then
    echo "请使用root权限运行此脚本"
    exit 1
fi

# 获取域名（如果没有提供）
if [ -z "$1" ]; then
    echo "请输入您的域名（例如：football.yourdomain.com）："
    read DOMAIN
else
    DOMAIN="$1"
fi

if [ -z "$DOMAIN" ]; then
    echo "错误：域名不能为空"
    exit 1
fi

echo "配置域名: $DOMAIN"

# 备份原始Nginx配置
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# 创建主配置文件
cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # 包含站点配置
    include /etc/nginx/conf.d/*.conf;
}
EOF

# 创建足球应用配置
cat > /etc/nginx/conf.d/football.conf << EOF
# 重定向HTTP到HTTPS
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# HTTPS配置
server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    root /var/www/football/frontend;
    index index.html;

    # SSL配置
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    # 前端静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # AI服务代理
    location /ai/ {
        proxy_pass http://localhost:11434/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 长连接支持
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    # 文件上传
    location /uploads/ {
        alias /var/www/football/backend/uploads/;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # 错误页面
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}

# 备用HTTP配置（用于SSL证书验证）
server {
    listen 80;
    server_name $DOMAIN;
    root /var/www/football/frontend;
    index index.html;

    # 前端静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # AI服务代理
    location /ai/ {
        proxy_pass http://localhost:11434/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 文件上传
    location /uploads/ {
        alias /var/www/football/backend/uploads/;
    }
}
EOF

# 测试Nginx配置
echo "测试Nginx配置..."
nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx配置测试通过"
else
    echo "Nginx配置测试失败，恢复备份配置"
    cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
    exit 1
fi

# 重启Nginx
echo "重启Nginx..."
systemctl restart nginx
systemctl enable nginx

# 配置SSL证书
echo "配置SSL证书..."

# 检查是否已安装certbot
if ! command -v certbot &> /dev/null; then
    echo "安装certbot..."
    yum install -y certbot python3-certbot-nginx
fi

# 获取SSL证书
echo "获取SSL证书..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@$DOMAIN

# 创建SSL证书自动续期脚本
cat > /root/renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL证书自动续期脚本
certbot renew --quiet
systemctl reload nginx
EOF

chmod +x /root/renew-ssl.sh

# 添加到定时任务（每天凌晨2点检查续期）
(crontab -l 2>/dev/null; echo "0 2 * * * /root/renew-ssl.sh") | crontab -

# 创建日志轮转配置
cat > /etc/logrotate.d/football-nginx << 'EOF'
/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 nginx nginx
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF

# 创建性能优化配置
cat > /etc/nginx/conf.d/performance.conf << 'EOF'
# 性能优化配置
client_body_buffer_size 128k;
client_header_buffer_size 1k;
large_client_header_buffers 4 4k;
output_buffers 1 32k;
postpone_output 1460;

# 文件上传优化
client_max_body_size 100M;
client_body_timeout 60s;
client_header_timeout 60s;

# 代理缓冲
proxy_buffering on;
proxy_buffer_size 4k;
proxy_buffers 8 4k;
proxy_busy_buffers_size 8k;
EOF

# 重启Nginx应用新配置
systemctl reload nginx

echo "Nginx配置完成！"
echo ""
echo "配置信息："
echo "- 域名: $DOMAIN"
echo "- HTTPS: https://$DOMAIN"
echo "- 前端: https://$DOMAIN"
echo "- 后端API: https://$DOMAIN/api"
echo "- AI服务: https://$DOMAIN/ai"
echo ""
echo "SSL证书："
echo "- 证书位置: /etc/letsencrypt/live/$DOMAIN/"
echo "- 自动续期: 每天凌晨2点"
echo "- 手动续期: certbot renew"
echo ""
echo "日志文件："
echo "- 访问日志: /var/log/nginx/access.log"
echo "- 错误日志: /var/log/nginx/error.log"
echo "- 日志轮转: 每天自动轮转，保留52天"
echo ""
echo "管理命令："
echo "- 测试配置: nginx -t"
echo "- 重载配置: systemctl reload nginx"
echo "- 重启服务: systemctl restart nginx"
echo "- 查看状态: systemctl status nginx"
echo "- 查看日志: tail -f /var/log/nginx/error.log"
