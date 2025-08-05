#!/bin/bash

# 腾讯云一键部署脚本
# 用于将整个足球青训管理系统部署到腾讯云PaaS平台

set -e

echo "=========================================="
echo "足球青训管理系统 - 腾讯云PaaS部署"
echo "=========================================="

# 检查环境变量
if [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ]; then
    echo "错误: 请设置腾讯云密钥环境变量"
    echo "export TENCENT_SECRET_ID=your_secret_id"
    echo "export TENCENT_SECRET_KEY=your_secret_key"
    echo "export TENCENT_APPID=your_app_id"
    exit 1
fi

# 检查必要工具
check_tools() {
    echo "检查必要工具..."
    
    if ! command -v tccli &> /dev/null; then
        echo "安装腾讯云CLI..."
        pip install tccli
    fi
    
    if ! command -v docker &> /dev/null; then
        echo "错误: 请安装Docker"
        exit 1
    fi
    
    if ! command -v kubectl &> /dev/null; then
        echo "错误: 请安装kubectl"
        exit 1
    fi
    
    echo "工具检查完成"
}

# 配置腾讯云CLI
configure_tencent_cli() {
    echo "配置腾讯云CLI..."
    
    # 创建配置文件
    mkdir -p ~/.tccli
    cat > ~/.tccli/config.json << EOF
{
    "secretId": "${TENCENT_SECRET_ID}",
    "secretKey": "${TENCENT_SECRET_KEY}",
    "region": "ap-shanghai",
    "output": "json"
}
EOF
    
    echo "腾讯云CLI配置完成"
}

# 部署前端
deploy_frontend() {
    echo "=========================================="
    echo "步骤 1: 部署前端到静态网站托管"
    echo "=========================================="
    
    if [ -f "./frontend-deploy.sh" ]; then
        chmod +x ./frontend-deploy.sh
        ./frontend-deploy.sh
    else
        echo "错误: 前端部署脚本不存在"
        exit 1
    fi
}

# 部署后端
deploy_backend() {
    echo "=========================================="
    echo "步骤 2: 部署后端到云开发"
    echo "=========================================="
    
    if [ -f "./backend-deploy.sh" ]; then
        chmod +x ./backend-deploy.sh
        ./backend-deploy.sh
    else
        echo "错误: 后端部署脚本不存在"
        exit 1
    fi
}

# 部署AI服务
deploy_ai_service() {
    echo "=========================================="
    echo "步骤 3: 部署AI服务到容器服务"
    echo "=========================================="
    
    if [ -f "./ai-deploy.sh" ]; then
        chmod +x ./ai-deploy.sh
        ./ai-deploy.sh
    else
        echo "错误: AI服务部署脚本不存在"
        exit 1
    fi
}

# 配置域名和SSL
setup_domain() {
    echo "=========================================="
    echo "步骤 4: 配置域名和SSL证书"
    echo "=========================================="
    
    if [ -n "$DOMAIN_NAME" ]; then
        echo "配置域名: $DOMAIN_NAME"
        
        # 申请SSL证书
        echo "申请SSL证书..."
        tccli ssl apply-certificate \
            --domain "$DOMAIN_NAME" \
            --package-id 1
        
        echo "SSL证书申请完成，请在腾讯云控制台完成域名验证"
    else
        echo "跳过域名配置（未设置DOMAIN_NAME环境变量）"
    fi
}

# 健康检查
health_check() {
    echo "=========================================="
    echo "步骤 5: 健康检查"
    echo "=========================================="
    
    # 检查前端
    if [ -n "$FRONTEND_URL" ]; then
        echo "检查前端服务..."
        if curl -f -s "$FRONTEND_URL" > /dev/null; then
            echo "✓ 前端服务正常"
        else
            echo "✗ 前端服务异常"
        fi
    fi
    
    # 检查后端
    if [ -n "$BACKEND_URL" ]; then
        echo "检查后端服务..."
        if curl -f -s "$BACKEND_URL/health" > /dev/null; then
            echo "✓ 后端服务正常"
        else
            echo "✗ 后端服务异常"
        fi
    fi
    
    # 检查AI服务
    if [ -n "$AI_SERVICE_URL" ]; then
        echo "检查AI服务..."
        if curl -f -s "$AI_SERVICE_URL/health" > /dev/null; then
            echo "✓ AI服务正常"
        else
            echo "✗ AI服务异常"
        fi
    fi
}

# 显示部署结果
show_results() {
    echo "=========================================="
    echo "部署完成！"
    echo "=========================================="
    
    echo "服务访问地址:"
    if [ -n "$FRONTEND_URL" ]; then
        echo "前端: $FRONTEND_URL"
    fi
    if [ -n "$BACKEND_URL" ]; then
        echo "后端API: $BACKEND_URL"
    fi
    if [ -n "$AI_SERVICE_URL" ]; then
        echo "AI服务: $AI_SERVICE_URL"
    fi
    
    echo ""
    echo "监控和运维:"
    echo "- 腾讯云控制台: https://console.cloud.tencent.com/"
    echo "- 云开发控制台: https://console.cloud.tencent.com/tcb"
    echo "- 容器服务控制台: https://console.cloud.tencent.com/tke"
    
    echo ""
    echo "下一步操作:"
    echo "1. 在腾讯云控制台完成域名验证和SSL证书配置"
    echo "2. 配置监控告警规则"
    echo "3. 设置自动备份策略"
    echo "4. 配置CDN加速（可选）"
}

# 主函数
main() {
    echo "开始部署流程..."
    
    # 检查工具
    check_tools
    
    # 配置CLI
    configure_tencent_cli
    
    # 执行部署步骤
    deploy_frontend
    deploy_backend
    deploy_ai_service
    setup_domain
    
    # 健康检查
    health_check
    
    # 显示结果
    show_results
    
    echo "=========================================="
    echo "部署流程完成！"
    echo "=========================================="
}

# 错误处理
trap 'echo "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@" 