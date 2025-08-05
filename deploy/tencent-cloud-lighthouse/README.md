# 腾讯云轻量应用服务器部署方案

## 概述

这是一个经济高效的部署方案，使用腾讯云轻量应用服务器，成本比PaaS方案节省60%以上。

## 成本对比

| 方案 | 月度成本 | 节省比例 |
|------|---------|----------|
| PaaS平台 | ¥430-1220/月 | - |
| 轻量应用服务器 | ¥240/月 | **60%** |
| 云服务器 | ¥270/月 | **55%** |

## 推荐配置

### 轻量应用服务器方案 (推荐)

- **轻量应用服务器 2核4G**: ¥90/月
- **云数据库MySQL 1核1G**: ¥100/月  
- **对象存储COS**: ¥10/月
- **CDN加速**: ¥20/月
- **域名和SSL**: ¥20/月

**总计**: ¥240/月

## 部署架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端服务       │    │   后端服务       │    │   AI服务        │
│  React + Antd   │    │  Node.js +      │    │  Ollama +       │
│                 │    │  Express        │    │  Node.js        │
│ 对象存储 + CDN   │    │ 轻量应用服务器    │    │ 轻量应用服务器    │
│  (COS + CDN)    │    │  (Lighthouse)   │    │  (Lighthouse)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   数据库服务     │
                    │   MySQL         │
                    │ 腾讯云数据库      │
                    └─────────────────┘
```

## 优势

### 1. 成本优势
- ✅ 比PaaS方案节省60%成本
- ✅ 按量计费，无隐藏费用
- ✅ 新用户有免费试用

### 2. 性能优势
- ✅ 独立CPU和内存资源
- ✅ SSD存储，性能更好
- ✅ 支持Docker容器

### 3. 易用性
- ✅ 一键部署应用
- ✅ 内置安全防护
- ✅ 可视化控制台

### 4. 扩展性
- ✅ 可以平滑升级到云服务器
- ✅ 支持负载均衡
- ✅ 支持自动备份

## 部署步骤

### 1. 创建轻量应用服务器

```bash
# 使用腾讯云CLI创建轻量应用服务器
tccli lighthouse create-instances \
  --bundle-id lhins-1vcpu-2gb \
  --blueprint-id lhbp-f1lkcd1k \
  --instance-name football-server \
  --zone ap-shanghai-2 \
  --quantity 1
```

### 2. 配置服务器环境

```bash
# 连接到服务器
ssh root@your-server-ip

# 安装Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装Nginx
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 3. 部署应用

```bash
# 克隆项目
git clone <your-repo-url>
cd Football

# 构建前端
cd frontend
npm install
npm run build

# 部署后端
cd ../backend
npm install
pm2 start index.js --name football-backend

# 部署AI服务
cd ../ai-service
docker build -t football-ai .
docker run -d -p 11434:11434 -p 3001:3001 --name football-ai football-ai
```

### 4. 配置Nginx反向代理

```nginx
# /etc/nginx/sites-available/football
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/football/frontend/build;
        try_files $uri $uri/ /index.html;
    }

    # 后端API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # AI服务
    location /ai/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 自动化部署脚本

我已经准备了完整的自动化部署脚本：

- `deploy-lighthouse.sh` - 一键部署脚本
- `setup-server.sh` - 服务器环境配置
- `deploy-app.sh` - 应用部署脚本
- `nginx-config.sh` - Nginx配置脚本

## 监控和维护

### 1. 系统监控
```bash
# 安装监控工具
apt-get install -y htop iotop nethogs

# 查看系统状态
htop
df -h
free -h
```

### 2. 应用监控
```bash
# 使用PM2监控Node.js应用
pm2 monit
pm2 logs football-backend

# 查看Docker容器状态
docker ps
docker logs football-ai
```

### 3. 自动备份
```bash
# 创建备份脚本
cat > /root/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup"

# 备份数据库
mysqldump -u root -p football > $BACKUP_DIR/db_$DATE.sql

# 备份应用文件
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /var/www/football

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

# 添加到定时任务
chmod +x /root/backup.sh
crontab -e
# 添加: 0 2 * * * /root/backup.sh
```

## 安全配置

### 1. 防火墙配置
```bash
# 只开放必要端口
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2. SSH安全
```bash
# 修改SSH端口
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# 禁用root登录
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config

# 重启SSH服务
systemctl restart sshd
```

### 3. SSL证书
```bash
# 安装Certbot
apt-get install -y certbot python3-certbot-nginx

# 申请SSL证书
certbot --nginx -d your-domain.com
```

## 扩展方案

### 1. 负载均衡
当访问量增大时，可以添加更多轻量应用服务器并使用负载均衡器。

### 2. 数据库分离
可以将数据库迁移到独立的云数据库实例，提高性能和可靠性。

### 3. 缓存优化
可以添加Redis缓存，提高应用性能。

## 总结

轻量应用服务器方案具有以下优势：

1. **成本低**: 比PaaS方案节省60%成本
2. **性能好**: 独立资源，SSD存储
3. **易管理**: 可视化控制台，一键部署
4. **可扩展**: 支持平滑升级到云服务器

这个方案非常适合中小型项目，既能满足功能需求，又能控制成本。 