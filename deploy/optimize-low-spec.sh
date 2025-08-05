#!/bin/bash

# 2核2G服务器优化脚本
# 使用方法: ./optimize-low-spec.sh

set -e

echo "开始优化2核2G服务器配置..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用root权限运行此脚本${NC}"
    exit 1
fi

echo -e "${YELLOW}1. 优化系统内存使用...${NC}"

# 创建swap文件（如果内存不足）
if [ ! -f /swapfile ]; then
    echo "创建1GB swap文件..."
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 优化内存参数
echo "优化内存参数..."
cat >> /etc/sysctl.conf << EOF
# 内存优化
vm.swappiness = 10
vm.vfs_cache_pressure = 50
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

sysctl -p

echo -e "${YELLOW}2. 优化Nginx配置...${NC}"

# 优化Nginx主配置
cat > /etc/nginx/nginx.conf << EOF
user nginx;
worker_processes 1;  # 单进程，节省内存
worker_cpu_affinity auto;
worker_rlimit_nofile 1024;

error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 256;  # 降低连接数
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 日志格式
    log_format main '\$remote_addr - \$remote_user [\$time_local] "\$request" '
                    '\$status \$body_bytes_sent "\$http_referer" '
                    '"\$http_user_agent" "\$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    # 基础优化
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

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

    # 包含其他配置
    include /etc/nginx/conf.d/*.conf;
}
EOF

echo -e "${YELLOW}3. 优化Node.js配置...${NC}"

# 设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=512"

# 优化PM2配置
if [ -f "/var/www/football-backend/pm2.config.js" ]; then
    cp /var/www/football-backend/pm2.config.js /var/www/football-backend/pm2.config.js.backup
    cp pm2.config.low-spec.js /var/www/football-backend/pm2.config.js
fi

echo -e "${YELLOW}4. 优化系统服务...${NC}"

# 禁用不必要的服务
systemctl disable bluetooth 2>/dev/null || true
systemctl disable cups 2>/dev/null || true
systemctl disable avahi-daemon 2>/dev/null || true

# 优化文件描述符限制
cat >> /etc/security/limits.conf << EOF
nginx soft nofile 1024
nginx hard nofile 2048
root soft nofile 65536
root hard nofile 65536
EOF

echo -e "${YELLOW}5. 创建监控脚本...${NC}"

# 创建资源监控脚本
cat > /usr/local/bin/monitor-resources.sh << 'EOF'
#!/bin/bash
echo "=== 系统资源监控 ==="
echo "内存使用:"
free -h
echo ""
echo "CPU使用:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
echo ""
echo "磁盘使用:"
df -h /
echo ""
echo "进程内存使用:"
ps aux --sort=-%mem | head -10
echo ""
echo "PM2状态:"
pm2 status
EOF

chmod +x /usr/local/bin/monitor-resources.sh

echo -e "${YELLOW}6. 设置定时清理...${NC}"

# 添加定时清理任务
cat > /etc/cron.daily/cleanup-logs << 'EOF'
#!/bin/bash
# 清理旧日志
find /var/log -name "*.log" -mtime +7 -delete
find /var/log -name "*.gz" -mtime +7 -delete

# 清理临时文件
rm -rf /tmp/*
rm -rf /var/tmp/*

# 清理PM2日志
pm2 flush
EOF

chmod +x /etc/cron.daily/cleanup-logs

echo -e "${GREEN}优化完成！${NC}"
echo ""
echo -e "${YELLOW}优化内容总结：${NC}"
echo "✅ 创建1GB swap文件"
echo "✅ 优化内存参数"
echo "✅ 优化Nginx配置（单进程，降低连接数）"
echo "✅ 优化Node.js内存限制（512MB）"
echo "✅ 禁用不必要的系统服务"
echo "✅ 设置文件描述符限制"
echo "✅ 创建资源监控脚本"
echo "✅ 设置定时清理任务"
echo ""
echo -e "${YELLOW}使用建议：${NC}"
echo "1. 监控资源使用：/usr/local/bin/monitor-resources.sh"
echo "2. 定期检查内存：free -h"
echo "3. 监控PM2状态：pm2 monit"
echo "4. 如遇内存不足，考虑升级到2核4G"
echo ""
echo -e "${GREEN}2核2G服务器优化配置完成！${NC}" 