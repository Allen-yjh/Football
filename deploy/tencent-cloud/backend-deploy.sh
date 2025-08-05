#!/bin/bash

# 腾讯云后端部署脚本
# 用于将Node.js后端部署到腾讯云云开发

set -e

echo "开始部署后端到腾讯云云开发..."

# 配置变量
ENV_NAME="football-backend"
REGION="ap-shanghai"
FUNCTION_NAME="api"
RUNTIME="Nodejs16.13"

# 检查环境变量
if [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ]; then
    echo "错误: 请设置腾讯云密钥环境变量"
    echo "export TENCENT_SECRET_ID=your_secret_id"
    echo "export TENCENT_SECRET_KEY=your_secret_key"
    exit 1
fi

# 创建临时部署目录
echo "准备部署文件..."
DEPLOY_DIR="../../backend-deploy"
mkdir -p "$DEPLOY_DIR"

# 复制后端文件
cp -r ../../backend/* "$DEPLOY_DIR/"

# 创建云开发函数配置文件
cat > "$DEPLOY_DIR/cloudbase.json" << EOF
{
  "version": "2.0",
  "envId": "${ENV_NAME}",
  "functions": [
    {
      "name": "${FUNCTION_NAME}",
      "runtime": "${RUNTIME}",
      "memory": 512,
      "timeout": 30,
      "triggers": [
        {
          "name": "http",
          "type": "http",
          "config": {
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
          }
        }
      ],
      "installDependency": true,
      "ignore": [
        "node_modules",
        "uploads",
        "*.log"
      ]
    }
  ]
}
EOF

# 创建函数入口文件
cat > "$DEPLOY_DIR/index.js" << 'EOF'
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Ollama } = require('ollama');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// 文件上传配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 初始化Ollama客户端
const ollama = new Ollama();

// 基础路由
app.get('/', (req, res) => {
  res.json({ message: '足球青训管理系统后端服务' });
});

// 球员管理接口
app.get('/api/players', (req, res) => {
  try {
    const playersData = fs.readFileSync('players.json', 'utf8');
    const players = JSON.parse(playersData);
    res.json(players);
  } catch (error) {
    console.error('读取球员数据失败:', error);
    res.status(500).json({ error: '读取球员数据失败' });
  }
});

app.post('/api/players', (req, res) => {
  try {
    const playersData = fs.readFileSync('players.json', 'utf8');
    const players = JSON.parse(playersData);
    
    const newPlayer = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    players.push(newPlayer);
    fs.writeFileSync('players.json', JSON.stringify(players, null, 2));
    
    res.json({ success: true, player: newPlayer });
  } catch (error) {
    console.error('添加球员失败:', error);
    res.status(500).json({ error: '添加球员失败' });
  }
});

// 教练管理接口
app.get('/api/coaches', (req, res) => {
  try {
    const coachesData = fs.readFileSync('coaches.json', 'utf8');
    const coaches = JSON.parse(coachesData);
    res.json(coaches);
  } catch (error) {
    console.error('读取教练数据失败:', error);
    res.status(500).json({ error: '读取教练数据失败' });
  }
});

// AI分析接口
app.post('/api/analysis', upload.single('video'), async (req, res) => {
  try {
    // 这里添加AI分析逻辑
    res.json({ 
      success: true, 
      message: 'AI分析完成',
      analysis: {
        // 分析结果
      }
    });
  } catch (error) {
    console.error('AI分析失败:', error);
    res.status(500).json({ error: 'AI分析失败' });
  }
});

// 云开发函数入口
exports.main = async (event, context) => {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      
      // 处理HTTP请求
      const { httpMethod, path, headers, body, queryString } = event;
      
      const req = {
        method: httpMethod,
        url: path,
        headers: headers || {},
        body: body || '',
        query: queryString || {}
      };
      
      const res = {
        statusCode: 200,
        headers: {},
        body: '',
        setHeader: function(name, value) {
          this.headers[name] = value;
        },
        json: function(data) {
          this.body = JSON.stringify(data);
          this.headers['Content-Type'] = 'application/json';
        },
        send: function(data) {
          this.body = data;
        }
      };
      
      // 模拟请求处理
      app._router.handle(req, res, () => {
        server.close();
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: res.body
        });
      });
    });
  });
};

// 本地开发服务器
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
  });
}
EOF

# 检查云开发环境是否存在
echo "检查云开发环境..."
if ! tccli tcb describe-envs --env-ids "$ENV_NAME" --region "$REGION" 2>/dev/null; then
    echo "创建云开发环境: $ENV_NAME"
    tccli tcb create-env \
        --name "$ENV_NAME" \
        --region "$REGION" \
        --package-version "1.0.0"
fi

# 部署函数
echo "部署云函数..."
cd "$DEPLOY_DIR"

# 使用腾讯云CLI部署
tccli tcb deploy-function \
    --env-id "$ENV_NAME" \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --code-source "local" \
    --code-path "." \
    --memory 512 \
    --timeout 30

# 配置HTTP触发器
echo "配置HTTP触发器..."
tccli tcb create-trigger \
    --env-id "$ENV_NAME" \
    --function-name "$FUNCTION_NAME" \
    --trigger-name "http" \
    --trigger-type "http" \
    --config '{"methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}'

# 获取函数访问地址
echo "获取函数访问地址..."
FUNCTION_URL=$(tccli tcb describe-functions --env-id "$ENV_NAME" --function-name "$FUNCTION_NAME" --query "Functions[0].Triggers[0].Config" --output text 2>/dev/null || echo "")

if [ -z "$FUNCTION_URL" ]; then
    FUNCTION_URL="https://${ENV_NAME}.service.tcloudbase.com/${FUNCTION_NAME}"
fi

# 清理临时文件
cd ..
rm -rf "$DEPLOY_DIR"

echo "后端部署完成！"
echo "函数名称: $FUNCTION_NAME"
echo "环境ID: $ENV_NAME"
echo "访问地址: $FUNCTION_URL"
echo "区域: $REGION" 