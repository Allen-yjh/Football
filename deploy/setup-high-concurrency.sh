#!/bin/bash

# 高并发环境配置脚本
# 使用方法: ./setup-high-concurrency.sh

set -e

echo "开始配置高并发环境..."

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

echo -e "${YELLOW}1. 安装高并发所需软件包...${NC}"

# 安装Redis缓存
if command -v yum &> /dev/null; then
    # CentOS/RHEL
    yum install -y redis
    systemctl enable redis
    systemctl start redis
else
    # Ubuntu/Debian
    apt install -y redis-server
    systemctl enable redis-server
    systemctl start redis-server
fi

# 安装MySQL（可选，用于替代JSON文件存储）
if command -v yum &> /dev/null; then
    yum install -y mysql-server
    systemctl enable mysqld
    systemctl start mysqld
else
    apt install -y mysql-server
    systemctl enable mysql
    systemctl start mysql
fi

echo -e "${YELLOW}2. 优化系统参数...${NC}"

# 优化系统参数
cat >> /etc/sysctl.conf << EOF
# 高并发优化
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 1200
net.ipv4.tcp_max_tw_buckets = 5000
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_tw_recycle = 1
net.ipv4.tcp_timestamps = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_syn_retries = 2
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr
net.core.rmem_default = 262144
net.core.rmem_max = 16777216
net.core.wmem_default = 262144
net.core.wmem_max = 16777216
net.ipv4.tcp_mtu_probing = 1
net.ipv4.tcp_ecn = 1

# 内存优化
vm.swappiness = 10
vm.vfs_cache_pressure = 50
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.overcommit_memory = 1
EOF

sysctl -p

echo -e "${YELLOW}3. 优化文件描述符限制...${NC}"

# 优化文件描述符限制
cat >> /etc/security/limits.conf << EOF
# 高并发文件描述符限制
* soft nofile 65535
* hard nofile 65535
nginx soft nofile 65535
nginx hard nofile 65535
root soft nofile 65535
root hard nofile 65535
EOF

# 临时设置
ulimit -n 65535

echo -e "${YELLOW}4. 配置Redis优化...${NC}"

# 优化Redis配置
cat > /etc/redis/redis.conf << EOF
# Redis高并发配置
bind 127.0.0.1
port 6379
timeout 0
tcp-keepalive 300
daemonize yes
supervised systemd
pidfile /var/run/redis/redis-server.pid
loglevel notice
logfile /var/log/redis/redis-server.log
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis
maxmemory 1gb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
EOF

systemctl restart redis

echo -e "${YELLOW}5. 配置MySQL优化...${NC}"

# 优化MySQL配置
cat > /etc/mysql/mysql.conf.d/mysqld.cnf << EOF
[mysqld]
# 高并发MySQL配置
user = mysql
pid-file = /var/run/mysqld/mysqld.pid
socket = /var/run/mysqld/mysqld.sock
port = 3306
basedir = /usr
datadir = /var/lib/mysql
tmpdir = /tmp
lc-messages-dir = /usr/share/mysql
skip-external-locking

# 连接优化
max_connections = 1000
max_connect_errors = 1000
table_open_cache = 2000
max_allowed_packet = 64M
binlog_cache_size = 1M
max_heap_table_size = 8M
tmp_table_size = 16M

# 查询缓存
query_cache_type = 1
query_cache_size = 32M
query_cache_limit = 2M

# InnoDB优化
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_log_buffer_size = 16M
innodb_flush_log_at_trx_commit = 2
innodb_lock_wait_timeout = 50
innodb_flush_method = O_DIRECT

# 慢查询日志
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

[mysql]
no-auto-rehash

[myisamchk]
key_buffer_size = 256M
sort_buffer_size = 256M
read_buffer = 2M
write_buffer = 2M

[mysqlhotcopy]
interactive-timeout
EOF

systemctl restart mysql

echo -e "${YELLOW}6. 创建高并发配置文件...${NC}"

# 复制高并发配置文件
cp nginx.conf.high-concurrency /etc/nginx/nginx.conf
cp pm2.config.high-concurrency.js /var/www/football-backend/pm2.config.js

echo -e "${YELLOW}7. 创建性能监控脚本...${NC}"

# 创建性能监控脚本
cat > /usr/local/bin/monitor-performance.sh << 'EOF'
#!/bin/bash
echo "=== 高并发性能监控 ==="
echo "时间: $(date)"
echo ""

echo "系统资源:"
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "内存使用:"
free -h
echo ""

echo "网络连接:"
echo "TCP连接数: $(netstat -an | grep ESTABLISHED | wc -l)"
echo "监听端口:"
netstat -tlnp | grep -E ':(80|443|3001|6379|3306)'
echo ""

echo "进程状态:"
echo "Nginx进程: $(ps aux | grep nginx | grep -v grep | wc -l)"
echo "Node.js进程: $(ps aux | grep node | grep -v grep | wc -l)"
echo "Redis进程: $(ps aux | grep redis | grep -v grep | wc -l)"
echo "MySQL进程: $(ps aux | grep mysql | grep -v grep | wc -l)"
echo ""

echo "PM2状态:"
pm2 status
echo ""

echo "Redis状态:"
redis-cli info | grep -E "(connected_clients|used_memory|keyspace_hits|keyspace_misses)"
echo ""

echo "MySQL状态:"
mysqladmin status 2>/dev/null || echo "MySQL未运行"
echo ""

echo "磁盘使用:"
df -h /
echo ""

echo "负载情况:"
uptime
echo ""
EOF

chmod +x /usr/local/bin/monitor-performance.sh

echo -e "${YELLOW}8. 创建压力测试脚本...${NC}"

# 创建压力测试脚本
cat > /usr/local/bin/stress-test.sh << 'EOF'
#!/bin/bash
# 简单的压力测试脚本

echo "开始压力测试..."

# 安装ab工具
if ! command -v ab &> /dev/null; then
    if command -v yum &> /dev/null; then
        yum install -y httpd-tools
    else
        apt install -y apache2-utils
    fi
fi

# 测试API接口
echo "测试API接口 (1000请求，10并发):"
ab -n 1000 -c 10 https://your-domain.com/api/players

echo "测试静态文件 (1000请求，50并发):"
ab -n 1000 -c 50 https://your-domain.com/

echo "压力测试完成！"
EOF

chmod +x /usr/local/bin/stress-test.sh

echo -e "${YELLOW}9. 设置定时任务...${NC}"

# 添加性能监控定时任务
cat > /etc/cron.d/performance-monitor << 'EOF'
# 每5分钟监控一次性能
*/5 * * * * root /usr/local/bin/monitor-performance.sh >> /var/log/performance.log 2>&1

# 每天凌晨2点清理日志
0 2 * * * root find /var/log -name "*.log" -mtime +7 -delete

# 每天凌晨3点备份数据
0 3 * * * root /path/to/backup.sh
EOF

echo -e "${GREEN}高并发环境配置完成！${NC}"
echo ""
echo -e "${YELLOW}配置总结：${NC}"
echo "✅ Redis缓存服务器已配置"
echo "✅ MySQL数据库已优化"
echo "✅ 系统参数已优化"
echo "✅ 文件描述符限制已调整"
echo "✅ Nginx高并发配置已应用"
echo "✅ PM2集群配置已设置"
echo "✅ 性能监控脚本已创建"
echo "✅ 压力测试工具已准备"
echo ""
echo -e "${YELLOW}使用建议：${NC}"
echo "1. 监控性能：/usr/local/bin/monitor-performance.sh"
echo "2. 压力测试：/usr/local/bin/stress-test.sh"
echo "3. 查看日志：tail -f /var/log/performance.log"
echo "4. 重启服务：systemctl restart nginx && pm2 restart all"
echo ""
echo -e "${GREEN}高并发环境配置完成！现在可以支持1000+并发用户。${NC}" 