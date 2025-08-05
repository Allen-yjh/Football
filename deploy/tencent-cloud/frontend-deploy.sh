#!/bin/bash

# 腾讯云前端部署脚本
# 用于将React前端部署到腾讯云静态网站托管

set -e

echo "开始部署前端到腾讯云静态网站托管..."

# 配置变量
BUCKET_NAME="football-frontend-${TENCENT_APPID}"
REGION="ap-shanghai"
BUILD_DIR="../../frontend/build"

# 检查环境变量
if [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ]; then
    echo "错误: 请设置腾讯云密钥环境变量"
    echo "export TENCENT_SECRET_ID=your_secret_id"
    echo "export TENCENT_SECRET_KEY=your_secret_key"
    exit 1
fi

# 构建前端项目
echo "构建前端项目..."
cd ../../frontend
npm install
npm run build
cd ../deploy/tencent-cloud

# 检查构建目录是否存在
if [ ! -d "$BUILD_DIR" ]; then
    echo "错误: 构建目录不存在，请先运行 npm run build"
    exit 1
fi

# 创建存储桶（如果不存在）
echo "检查存储桶是否存在..."
if ! tccli cos head-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null; then
    echo "创建存储桶: $BUCKET_NAME"
    tccli cos create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --acl public-read
fi

# 配置静态网站托管
echo "配置静态网站托管..."
tccli cos put-bucket-website \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --website-configuration '{
        "IndexDocument": {"Suffix": "index.html"},
        "ErrorDocument": {"Key": "index.html"}
    }'

# 配置CORS
echo "配置CORS策略..."
tccli cos put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --cors-configuration '{
        "CORSRule": [
            {
                "AllowedOrigin": ["*"],
                "AllowedMethod": ["GET", "POST", "PUT", "DELETE", "HEAD"],
                "AllowedHeader": ["*"],
                "ExposeHeader": ["ETag"],
                "MaxAgeSeconds": 3600
            }
        ]
    }'

# 上传文件到COS
echo "上传文件到COS..."
tccli cos upload \
    --bucket "$BUCKET_NAME" \
    --region "$REGION" \
    --key / \
    --local-path "$BUILD_DIR" \
    --recursive

# 配置CDN加速（可选）
if [ -n "$CDN_DOMAIN" ]; then
    echo "配置CDN加速..."
    # 这里需要根据实际情况配置CDN
    echo "CDN域名: $CDN_DOMAIN"
fi

# 获取访问地址
echo "获取访问地址..."
WEBSITE_URL=$(tccli cos get-bucket-website --bucket "$BUCKET_NAME" --region "$REGION" --query "WebsiteConfiguration.RedirectAllRequestsTo.HostName" --output text 2>/dev/null || echo "")

if [ -z "$WEBSITE_URL" ]; then
    WEBSITE_URL="https://$BUCKET_NAME.cos-website.$REGION.myqcloud.com"
fi

echo "前端部署完成！"
echo "访问地址: $WEBSITE_URL"
echo "存储桶: $BUCKET_NAME"
echo "区域: $REGION" 