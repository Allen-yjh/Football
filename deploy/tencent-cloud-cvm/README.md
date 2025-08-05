# 腾讯云服务器(CVM)部署方案

## 概述

这是最经济且完全可控的部署方案，使用腾讯云服务器(CVM)，成本最低且功能最完整。

## 成本对比

| 方案 | 月度成本 | 节省比例 |
|------|---------|----------|
| PaaS平台 | ¥430-1220/月 | - |
| 轻量应用服务器 | ¥240/月 | 60% |
| **云服务器(CVM)** | ¥270/月 | **65%** |

## 推荐配置

- **云服务器 2核4G**: ¥120/月
- **云数据库MySQL 1核1G**: ¥100/月
- **对象存储COS**: ¥10/月
- **CDN加速**: ¥20/月
- **域名和SSL**: ¥20/月

**总计**: ¥270/月

## 优势

1. **成本最低**: 比PaaS方案节省65%成本
2. **完全控制**: 可自定义任何配置
3. **性能优秀**: 独立资源，SSD存储
4. **扩展性强**: 支持弹性伸缩和负载均衡
5. **无厂商锁定**: 可随时迁移到其他平台

## 部署步骤

### 1. 创建云服务器
```bash
tccli cvm run-instances \
  --instance-type S5.MEDIUM2 \
  --image-id img-9qabwvbn \
  --instance-name football-cvm \
  --zone ap-shanghai-2
```

### 2. 配置环境
```bash
# 安装Docker、Node.js、Nginx、MySQL
./setup-cvm.sh
```

### 3. 部署应用
```bash
# 部署前端、后端、AI服务
./deploy-app.sh
```

### 4. 配置域名
```bash
# 配置Nginx和SSL证书
./nginx-config.sh
```

## 自动化脚本

- `deploy-cvm.sh` - 一键部署
- `setup-cvm.sh` - 环境配置
- `deploy-app.sh` - 应用部署
- `nginx-config.sh` - Nginx配置

## 总结

云服务器方案成本最低，控制最灵活，适合需要完全控制的项目。 