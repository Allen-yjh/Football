# 腾讯云部署检查清单

## 部署前准备 ✅
- [ ] 腾讯云服务器已购买并启动
- [ ] 服务器操作系统已选择（推荐CentOS 7.6或Ubuntu 20.04）
- [ ] 服务器安全组已配置（开放80、443、22端口）
- [ ] 域名已购买（可选）
- [ ] 域名DNS解析已配置到服务器IP

## 服务器环境配置 ✅
- [ ] 连接到服务器：`ssh root@your-server-ip`
- [ ] 运行基础环境配置：`./deploy.sh`
- [ ] 检查Nginx安装：`nginx -v`
- [ ] 检查Node.js安装：`node -v`
- [ ] 检查PM2安装：`pm2 -v`
- [ ] 检查FFmpeg安装：`ffmpeg -version`

## 代码部署 ✅
- [ ] 后端代码已上传到 `/var/www/football-backend/`
- [ ] 前端代码已构建并上传到 `/var/www/football-frontend/build/`
- [ ] 后端依赖已安装：`npm install --production`
- [ ] 上传目录已创建：`mkdir -p uploads && chmod 755 uploads`

## 配置文件设置 ✅
- [ ] Nginx配置文件已复制：`cp nginx.conf /etc/nginx/conf.d/football.conf`
- [ ] PM2配置文件已复制到后端目录
- [ ] 域名配置已更新（替换nginx.conf中的your-domain.com）
- [ ] SSL证书已配置（如果使用域名）

## 服务启动 ✅
- [ ] 后端服务已启动：`pm2 start pm2.config.js`
- [ ] PM2开机自启已设置：`pm2 startup && pm2 save`
- [ ] Nginx服务已启动：`systemctl start nginx && systemctl enable nginx`
- [ ] 防火墙已配置：`firewall-cmd --permanent --add-service=http --add-service=https`

## 功能测试 ✅
- [ ] 前端页面可访问：`https://your-domain.com` 或 `http://your-server-ip`
- [ ] 后端API可访问：`https://your-domain.com/api/` 或 `http://your-server-ip:3001/api/`
- [ ] 文件上传功能正常
- [ ] 球员管理功能正常
- [ ] 训练计划生成功能正常

## 监控和维护 ✅
- [ ] 日志目录已创建：`mkdir -p /var/log/pm2`
- [ ] 备份脚本已配置：`chmod +x backup.sh`
- [ ] 自动备份已设置（可选）：`crontab -e` 添加 `0 2 * * * /path/to/backup.sh`
- [ ] SSL证书自动续期已设置：`crontab -e` 添加 `0 12 * * * /usr/bin/certbot renew --quiet`

## 性能优化 ✅
- [ ] Nginx Gzip压缩已启用
- [ ] 静态资源缓存已配置
- [ ] PM2进程监控已设置
- [ ] 系统资源监控已配置

## 安全检查 ✅
- [ ] 防火墙规则已配置
- [ ] 不必要的端口已关闭
- [ ] 安全头已设置
- [ ] 定期更新计划已制定

## 故障排除工具 ✅
- [ ] 服务状态检查命令已准备
- [ ] 日志查看命令已准备
- [ ] 重启服务命令已准备
- [ ] 备份恢复流程已制定

## 部署完成确认 ✅
- [ ] 所有服务正常运行
- [ ] 功能测试全部通过
- [ ] 性能指标满足要求
- [ ] 安全配置符合标准
- [ ] 监控和维护工具可用

---

## 常用命令速查

### 服务管理
```bash
# 查看服务状态
pm2 status
systemctl status nginx

# 重启服务
pm2 restart football-backend
systemctl restart nginx

# 查看日志
pm2 logs football-backend
tail -f /var/log/nginx/error.log
```

### 监控命令
```bash
# 系统资源
htop
df -h
free -h

# 网络连接
netstat -tlnp
ss -tlnp

# 进程监控
pm2 monit
```

### 备份恢复
```bash
# 创建备份
./backup.sh

# 恢复备份
tar -xzf backup-file.tar.gz
cp -r backup-data/* /var/www/football-backend/
```

### 故障排除
```bash
# 检查端口占用
lsof -i :3001
netstat -tlnp | grep :3001

# 检查权限
ls -la /var/www/football-backend/
chown -R nginx:nginx /var/www/football-backend/

# 检查配置
nginx -t
pm2 list
``` 