#!/bin/bash

# 腾讯云AI服务部署脚本
# 用于将Ollama AI服务部署到腾讯云容器服务

set -e

echo "开始部署AI服务到腾讯云容器服务..."

# 配置变量
CLUSTER_NAME="football-ai"
REGION="ap-shanghai"
NAMESPACE="football"
IMAGE_NAME="football-ai"

# 检查环境变量
if [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ]; then
    echo "错误: 请设置腾讯云密钥环境变量"
    exit 1
fi

# 创建AI服务目录
echo "准备AI服务文件..."
AI_SERVICE_DIR="../../ai-service"
mkdir -p "$AI_SERVICE_DIR"

# 创建Dockerfile
cat > "$AI_SERVICE_DIR/Dockerfile" << 'EOF'
FROM ubuntu:20.04

ENV DEBIAN_FRONTEND=noninteractive
ENV OLLAMA_HOST=0.0.0.0

RUN apt-get update && apt-get install -y \
    curl wget git build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 安装Ollama
RUN curl -fsSL https://ollama.ai/install.sh | sh

# 安装Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN mkdir -p uploads

EXPOSE 11434 3001

CMD ["sh", "-c", "ollama serve & npm start"]
EOF

# 创建package.json
cat > "$AI_SERVICE_DIR/package.json" << 'EOF'
{
  "name": "football-ai-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "ollama": "^0.5.16"
  }
}
EOF

# 创建AI服务主文件
cat > "$AI_SERVICE_DIR/index.js" << 'EOF'
const express = require('express');
const cors = require('cors');
const { Ollama } = require('ollama');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const ollama = new Ollama({
  host: process.env.OLLAMA_HOST || 'http://localhost:11434'
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/analyze', async (req, res) => {
  try {
    const response = await ollama.chat({
      model: 'llama2',
      messages: [{ role: 'user', content: '分析足球训练视频' }]
    });

    res.json({
      success: true,
      analysis: response.message.content
    });
  } catch (error) {
    res.status(500).json({ error: 'AI分析失败' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AI服务运行在端口 ${PORT}`);
});
EOF

# 构建和推送镜像
echo "构建Docker镜像..."
cd "$AI_SERVICE_DIR"
docker build -t "$IMAGE_NAME" .
docker tag "$IMAGE_NAME" "ccr.ccs.tencentyun.com/${NAMESPACE}/${IMAGE_NAME}:latest"
docker push "ccr.ccs.tencentyun.com/${NAMESPACE}/${IMAGE_NAME}:latest"

echo "AI服务部署完成！"
echo "镜像: ccr.ccs.tencentyun.com/${NAMESPACE}/${IMAGE_NAME}:latest" 