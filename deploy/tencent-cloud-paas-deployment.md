# 腾讯云PaaS平台部署方案

## 项目概述
- **项目名称**: 足球青训管理系统
- **技术栈**: React前端 + Node.js后端 + Ollama AI服务
- **部署平台**: 腾讯云PaaS平台

## 部署架构

### 1. 腾讯云PaaS服务选择

#### 前端部署 - 腾讯云静态网站托管
- **服务**: 腾讯云静态网站托管 (COS + CDN)
- **优势**: 
  - 自动CDN加速
  - HTTPS证书自动配置
  - 全球边缘节点
  - 按量计费，成本低

#### 后端部署 - 腾讯云云开发CloudBase
- **服务**: 腾讯云云开发 (CloudBase)
- **优势**:
  - 无服务器架构
  - 自动扩缩容
  - 内置数据库
  - 函数计算支持

#### 数据库 - 腾讯云数据库
- **服务**: 腾讯云MySQL/PostgreSQL
- **优势**:
  - 高可用性
  - 自动备份
  - 安全防护

#### AI服务 - 腾讯云容器服务
- **服务**: 腾讯云容器服务 (TKE)
- **用途**: 部署Ollama AI模型服务

## 详细部署步骤

### 第一阶段：环境准备

#### 1.1 腾讯云账号配置
```bash
# 安装腾讯云CLI
npm install -g @tencent/cloud-cli

# 配置腾讯云账号
tccli configure
# 输入SecretId和SecretKey
```

#### 1.2 项目结构调整
```
Football/
├── frontend/          # React前端
├── backend/           # Node.js后端
├── ai-service/        # Ollama AI服务
├── deploy/
│   ├── tencent-cloud/
│   │   ├── frontend-deploy.sh
│   │   ├── backend-deploy.sh
│   │   ├── ai-deploy.sh
│   │   └── database-setup.sh
│   └── docker/
│       ├── ai-service.Dockerfile
│       └── docker-compose.yml
└── README.md
```

### 第二阶段：前端部署

#### 2.1 构建前端项目
```bash
cd frontend
npm install
npm run build
```

#### 2.2 配置静态网站托管
```bash
# 创建存储桶
tccli cos create-bucket --bucket football-frontend-{appid}

# 配置静态网站托管
tccli cos put-bucket-website --bucket football-frontend-{appid} \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
  }'
```

#### 2.3 上传前端文件
```bash
# 上传构建文件到COS
tccli cos upload --bucket football-frontend-{appid} \
  --key / --local-path ./build/
```

### 第三阶段：后端部署

#### 3.1 配置云开发环境
```bash
# 创建云开发环境
tccli tcb create-env --name football-backend \
  --region ap-shanghai \
  --package-version 1.0.0
```

#### 3.2 部署后端函数
```javascript
// cloudbase/functions/api/index.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// 导入原有路由
const playerRoutes = require('./routes/players');
const coachRoutes = require('./routes/coaches');
const analysisRoutes = require('./routes/analysis');

app.use('/api/players', playerRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/analysis', analysisRoutes);

exports.main = app;
```

#### 3.3 配置数据库
```bash
# 创建MySQL实例
tccli cdb create-db-instance \
  --engine mysql \
  --engine-version 8.0 \
  --instance-name football-db \
  --memory 1024 \
  --volume 20
```

### 第四阶段：AI服务部署

#### 4.1 创建容器镜像
```dockerfile
# ai-service/Dockerfile
FROM ubuntu:20.04

# 安装Ollama
RUN curl -fsSL https://ollama.ai/install.sh | sh

# 安装Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# 复制应用代码
COPY . /app
WORKDIR /app

# 安装依赖
RUN npm install

# 启动Ollama和Node.js服务
CMD ["sh", "-c", "ollama serve & npm start"]
```

#### 4.2 部署到容器服务
```bash
# 创建TKE集群
tccli tke create-cluster \
  --cluster-name football-ai \
  --region ap-shanghai \
  --cluster-type managed

# 构建并推送镜像
docker build -t football-ai .
docker tag football-ai ccr.ccs.tencentyun.com/{namespace}/football-ai
docker push ccr.ccs.tencentyun.com/{namespace}/football-ai
```

### 第五阶段：域名和SSL配置

#### 5.1 域名配置
```bash
# 配置自定义域名
tccli cos put-bucket-domain --bucket football-frontend-{appid} \
  --domain-configuration '{
    "Domain": "football.yourdomain.com",
    "Status": "ENABLED"
  }'
```

#### 5.2 SSL证书配置
```bash
# 申请SSL证书
tccli ssl apply-certificate \
  --domain football.yourdomain.com \
  --package-id 1

# 配置HTTPS
tccli cos put-bucket-https --bucket football-frontend-{appid} \
  --https-configuration '{
    "Status": "Enabled",
    "CertId": "your-cert-id"
  }'
```

## 自动化部署脚本

### 一键部署脚本
```bash
#!/bin/bash
# deploy/tencent-cloud/deploy-all.sh

echo "开始部署足球青训管理系统到腾讯云..."

# 1. 构建前端
echo "构建前端项目..."
cd frontend
npm install
npm run build
cd ..

# 2. 部署前端
echo "部署前端到静态网站托管..."
./deploy/tencent-cloud/frontend-deploy.sh

# 3. 部署后端
echo "部署后端到云开发..."
./deploy/tencent-cloud/backend-deploy.sh

# 4. 部署AI服务
echo "部署AI服务到容器服务..."
./deploy/tencent-cloud/ai-deploy.sh

# 5. 配置域名
echo "配置域名和SSL..."
./deploy/tencent-cloud/domain-setup.sh

echo "部署完成！"
echo "前端地址: https://football.yourdomain.com"
echo "后端API: https://api.football.yourdomain.com"
```

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

## 故障恢复

### 1. 备份策略
- 数据库自动备份
- 代码版本控制
- 配置文件备份

### 2. 灾难恢复
- 多地域备份
- 快速恢复流程
- 定期演练

## 总结

腾讯云PaaS平台提供了完整的部署解决方案，具有以下优势：

1. **成本效益**: 按量计费，初期成本低
2. **易用性**: 全托管服务，运维简单
3. **可扩展性**: 自动扩缩容，支持业务增长
4. **安全性**: 企业级安全防护
5. **生态完整**: 一站式云服务解决方案

建议按照上述方案逐步部署，确保系统稳定运行。 