# 2核2G服务器部署指南

## 服务器配置分析

### 当前配置
- **CPU**: 2核
- **内存**: 2GB
- **存储**: 根据云服务器配置

### 可行性评估
✅ **可以部署，但需要优化配置**

## 资源使用预估

### 内存分配
```
系统开销: ~500MB
Node.js后端: ~300MB
Nginx: ~50MB
Ollama AI模型: ~800MB-1.2GB
可用内存: ~1.2GB
```

### CPU使用
- 2核可以满足基本并发需求
- AI推理会占用较多CPU资源
- 建议并发用户数控制在10-20人

## 优化部署步骤

### 1. 基础环境配置
```bash
# 运行优化后的部署脚本
chmod +x deploy.sh
./deploy.sh

# 运行低配置优化脚本
chmod +x optimize-low-spec.sh
./optimize-low-spec.sh
```

### 2. 使用优化配置文件
```bash
# 使用低配置Nginx配置
cp nginx.conf.low-spec /etc/nginx/conf.d/football.conf

# 使用低配置PM2配置
cp pm2.config.low-spec.js /var/www/football-backend/pm2.config.js
```

### 3. 启动服务
```bash
# 启动优化后的服务
chmod +x start-services.sh
./start-services.sh
```

## 性能优化措施

### 1. 内存优化
- ✅ 创建1GB swap文件
- ✅ 优化内存参数
- ✅ 限制Node.js内存使用（512MB）
- ✅ 单进程Nginx配置

### 2. CPU优化
- ✅ 降低Nginx连接数（256）
- ✅ 优化AI处理超时设置
- ✅ 启用Gzip压缩

### 3. 系统优化
- ✅ 禁用不必要的系统服务
- ✅ 设置文件描述符限制
- ✅ 定时清理日志和临时文件

## 使用限制和建议

### 并发用户数
- **推荐**: 10-20个并发用户
- **最大**: 30个并发用户
- **超出**: 考虑升级到2核4G

### AI功能使用
- Ollama模型推理较慢（30-60秒）
- 建议用户耐心等待
- 可考虑使用更小的模型

### 文件上传
- 限制单个文件大小：50MB
- 建议压缩视频文件
- 定期清理上传目录

## 监控和维护

### 资源监控
```bash
# 查看系统资源
/usr/local/bin/monitor-resources.sh

# 实时监控
htop
pm2 monit

# 内存使用
free -h
```

### 性能指标
- **内存使用率**: 应保持在80%以下
- **CPU使用率**: 应保持在70%以下
- **响应时间**: API响应应在5秒内

### 告警阈值
```bash
# 内存告警（超过1.8GB）
if [ $(free -m | awk 'NR==2{printf "%.0f", $3*100/$2}') -gt 90 ]; then
    echo "内存使用率过高！"
fi

# CPU告警（超过80%）
if [ $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1 | cut -d'.' -f1) -gt 80 ]; then
    echo "CPU使用率过高！"
fi
```

## 升级建议

### 何时需要升级
1. **内存使用率持续超过90%**
2. **CPU使用率持续超过80%**
3. **并发用户数超过30人**
4. **AI功能响应时间超过2分钟**
5. **频繁出现服务重启**

### 升级路径
```
2核2G → 2核4G → 4核8G → 8核16G
```

## 故障排除

### 常见问题

1. **内存不足**
```bash
# 检查内存使用
free -h
ps aux --sort=-%mem | head -10

# 重启服务
pm2 restart football-backend
systemctl restart nginx
```

2. **AI功能缓慢**
```bash
# 检查Ollama状态
curl http://localhost:11434/api/tags

# 重启Ollama服务
systemctl restart ollama
```

3. **服务频繁重启**
```bash
# 查看PM2日志
pm2 logs football-backend

# 检查内存限制
pm2 show football-backend
```

### 应急措施
```bash
# 临时增加swap
sudo fallocate -l 2G /swapfile2
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2

# 清理内存
sync && echo 3 > /proc/sys/vm/drop_caches
```

## 成本对比

### 2核2G服务器
- **月费用**: ~80-120元
- **适用场景**: 小规模使用，测试环境
- **用户数**: 10-20人

### 2核4G服务器
- **月费用**: ~120-180元
- **适用场景**: 正式生产环境
- **用户数**: 20-50人

### 建议
- **开发测试**: 使用2核2G
- **正式部署**: 建议2核4G起步
- **大规模使用**: 考虑4核8G或更高配置

## 总结

2核2G服务器**可以部署**您的足球青训管理系统，但需要：

1. **严格遵循优化配置**
2. **控制并发用户数**
3. **定期监控资源使用**
4. **准备升级方案**

如果预算允许，建议直接选择2核4G配置，可以获得更好的用户体验和系统稳定性。 