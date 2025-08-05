# 腾讯云PaaS平台部署指南

## 概述

本指南将帮助您将足球青训管理系统部署到腾讯云PaaS平台，包括前端、后端和AI服务的完整部署方案。

## 部署架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端服务       │    │   后端服务       │    │   AI服务        │
│  React + Antd   │    │  Node.js +      │    │  Ollama +       │
│                 │    │  Express        │    │  Node.js        │
│ 腾讯云静态网站托管 │    │ 腾讯云云开发      │    │ 腾讯云容器服务    │
│  (COS + CDN)    │    │  (CloudBase)    │    │  (TKE)          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   数据库服务     │
                    │   MySQL/        │
                    │   PostgreSQL    │
                    │ 腾讯云数据库      │
                    └─────────────────┘
```

## 前置要求

### 1. 腾讯云账号
- 注册腾讯云账号
- 开通相关服务：COS、CloudBase、TKE、数据库等
- 获取API密钥（SecretId和SecretKey）

### 2. 本地环境
- Docker
- kubectl
- 腾讯云CLI (tccli)
- Node.js 16+

### 3. 域名（可选）
- 准备一个域名用于生产环境
- 确保域名已备案（中国大陆要求）

## 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <your-repo-url>
cd Football

# 设置环境变量
export TENCENT_SECRET_ID="your_secret_id"
export TENCENT_SECRET_KEY="your_secret_key"
export TENCENT_APPID="your_app_id"
export DOMAIN_NAME="football.yourdomain.com"  # 可选
```

### 2. 一键部署

```bash
# 进入部署目录
cd deploy/tencent-cloud

# 执行一键部署
chmod +x deploy-all.sh
./deploy-all.sh
```

### 3. 分步部署

如果您希望分步部署，可以单独执行各个脚本：

```bash
# 部署前端
./frontend-deploy.sh

# 部署后端
./backend-deploy.sh

# 部署AI服务
./ai-deploy.sh
```

## 详细配置

### 前端部署配置

前端将部署到腾讯云静态网站托管服务，支持：
- 自动CDN加速
- HTTPS证书自动配置
- 全球边缘节点

**配置参数：**
- 存储桶名称：`football-frontend-{appid}`
- 区域：`ap-shanghai`
- 访问控制：公开读取

### 后端部署配置

后端将部署到腾讯云云开发平台，支持：
- 无服务器架构
- 自动扩缩容
- 内置数据库

**配置参数：**
- 环境名称：`football-backend`
- 函数名称：`api`
- 运行时：`Nodejs16.13`
- 内存：512MB
- 超时：30秒

### AI服务部署配置

AI服务将部署到腾讯云容器服务，支持：
- 容器化部署
- 自动扩缩容
- 负载均衡

**配置参数：**
- 集群名称：`football-ai`
- 命名空间：`football`
- 镜像名称：`football-ai`
- 端口：11434 (Ollama), 3001 (API)

## 监控和运维

### 1. 日志监控
- 使用腾讯云日志服务 (CLS)
- 配置告警规则
- 设置日志保留策略

### 2. 性能监控
- 使用腾讯云监控 (Cloud Monitor)
- 配置CPU、内存、网络监控
- 设置自动扩缩容规则

### 3. 安全防护
- 配置WAF防护
- 启用DDoS防护
- 定期安全扫描

## 成本估算

### 月度成本预估
- **静态网站托管**: ¥10-50/月
- **云开发**: ¥50-200/月
- **数据库**: ¥100-300/月
- **容器服务**: ¥200-500/月
- **CDN加速**: ¥50-150/月
- **域名和SSL**: ¥20/月

**总计**: ¥430-1220/月

## 故障排除

### 常见问题

1. **部署失败**
   - 检查API密钥是否正确
   - 确认服务已开通
   - 查看错误日志

2. **服务无法访问**
   - 检查网络配置
   - 确认安全组设置
   - 验证域名解析

3. **AI服务异常**
   - 检查Ollama模型是否下载
   - 确认容器资源是否充足
   - 查看容器日志

### 日志查看

```bash
# 查看云函数日志
tccli tcb describe-function-logs --env-id football-backend --function-name api

# 查看容器日志
kubectl logs -f deployment/football-ai -n football

# 查看前端访问日志
tccli cos get-bucket-logging --bucket football-frontend-{appid}
```

## 扩展方案

### 1. 高并发优化
- 使用腾讯云负载均衡
- 配置多实例部署
- 启用Redis缓存

### 2. 全球化部署
- 使用腾讯云全球加速
- 配置多地域部署
- 就近接入优化

### 3. 微服务架构
- 拆分为多个微服务
- 使用腾讯云API网关
- 配置服务网格

## 备份和恢复

### 1. 数据备份
- 数据库自动备份
- 代码版本控制
- 配置文件备份

### 2. 灾难恢复
- 多地域备份
- 快速恢复流程
- 定期演练

## 联系支持

如果在部署过程中遇到问题，可以：

1. 查看腾讯云官方文档
2. 联系腾讯云技术支持
3. 查看项目GitHub Issues

## 更新日志

- v1.0.0 - 初始版本，支持基础部署
- v1.1.0 - 添加AI服务部署
- v1.2.0 - 优化部署脚本，添加监控配置 