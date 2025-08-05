# 足球青训管理系统 - 腾讯云部署指南

## 项目概述
这是一个基于React前端和Node.js后端的足球青训管理系统，包含球员管理、训练计划、营养建议等功能。

## 系统要求
- 腾讯云服务器（推荐2核4GB内存）
- CentOS 7.6+ 或 Ubuntu 20.04+
- 域名（可选，用于SSL证书）

## 部署步骤

### 1. 服务器准备
```bash
# 连接到您的腾讯云服务器
ssh root@your-server-ip

# 下载部署脚本
wget https://your-repo.com/deploy-scripts.zip
unzip deploy-scripts.zip
cd deploy
```

### 2. 基础环境配置
```bash
# 运行基础环境配置脚本
chmod +x deploy.sh
./deploy.sh
```

### 3. 上传项目代码
```bash
# 方法1：使用Git（推荐）
cd /var/www
git clone https://your-repo.com/football-backend.git
git clone https://your-repo.com/football-frontend.git

# 方法2：使用SCP上传
scp -r backend/* root@your-server-ip:/var/www/football-backend/
scp -r frontend/* root@your-server-ip:/var/www/football-frontend/
```

### 4. 构建前端
```bash
# 在本地构建前端
cd frontend
npm install
npm run build

# 上传构建文件到服务器
scp -r build/* root@your-server-ip:/var/www/football-frontend/build/
```

### 5. 配置域名和SSL
```bash
# 在腾讯云控制台配置域名解析
# 将域名解析到服务器IP

# 配置SSL证书
chmod +x ssl-setup.sh
./ssl-setup.sh

# 获取SSL证书
certbot --nginx -d your-domain.com
```

### 6. 启动服务
```bash
# 启动所有服务
chmod +x start-services.sh
./start-services.sh
```

## 配置文件说明

### Nginx配置 (nginx.conf)
- 反向代理配置
- 静态文件服务
- SSL证书配置
- 安全头设置

### PM2配置 (pm2.config.js)
- 进程管理配置
- 日志配置
- 自动重启设置

## 服务管理

### 查看服务状态
```bash
# 查看PM2进程状态
pm2 status

# 查看Nginx状态
systemctl status nginx

# 查看实时日志
pm2 logs football-backend
```

### 重启服务
```bash
# 重启后端服务
pm2 restart football-backend

# 重启Nginx
systemctl restart nginx
```

### 停止服务
```bash
# 停止后端服务
pm2 stop football-backend

# 停止Nginx
systemctl stop nginx
```

## 监控和维护

### 日志查看
```bash
# PM2日志
pm2 logs football-backend

# Nginx日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# 系统日志
journalctl -u nginx
```

### 性能监控
```bash
# PM2监控面板
pm2 monit

# 系统资源监控
htop
df -h
free -h
```

### 备份策略
```bash
# 备份数据文件
cp /var/www/football-backend/*.json /backup/

# 备份配置文件
cp /etc/nginx/conf.d/football.conf /backup/
cp /var/www/football-backend/pm2.config.js /backup/
```

## 故障排除

### 常见问题

1. **端口被占用**
```bash
# 查看端口占用
netstat -tlnp | grep :3001
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

2. **权限问题**
```bash
# 修复目录权限
chown -R nginx:nginx /var/www/football-frontend
chown -R nginx:nginx /var/www/football-backend
chmod -R 755 /var/www/football-backend/uploads
```

3. **SSL证书问题**
```bash
# 检查证书状态
certbot certificates

# 重新获取证书
certbot --nginx -d your-domain.com --force-renewal
```

### 性能优化

1. **启用Gzip压缩**
```bash
# 在nginx.conf中添加
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

2. **配置缓存**
```bash
# 静态资源缓存已在nginx.conf中配置
# 可根据需要调整缓存时间
```

3. **数据库优化**
```bash
# 当前使用JSON文件存储，如需更高性能可迁移到MySQL或MongoDB
```

## 安全建议

1. **防火墙配置**
```bash
# 只开放必要端口
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload
```

2. **定期更新**
```bash
# 系统更新
yum update -y  # CentOS
apt update && apt upgrade -y  # Ubuntu

# 依赖更新
npm update -g pm2
```

3. **日志监控**
```bash
# 设置日志轮转
logrotate /etc/logrotate.d/nginx
```

## 联系支持
如遇到部署问题，请检查：
1. 服务器配置是否满足要求
2. 网络连接是否正常
3. 域名解析是否正确
4. 防火墙设置是否允许相应端口

## 更新日志
- v1.0.0: 初始部署版本
- 支持基础功能部署
- 包含监控和维护工具 