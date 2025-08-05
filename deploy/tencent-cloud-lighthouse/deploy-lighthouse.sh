#!/bin/bash

# 腾讯云轻量应用服务器一键部署脚本
# 用于将足球青训管理系统部署到轻量应用服务器

set -e

echo "=========================================="
echo "足球青训管理系统 - 轻量应用服务器部署"
echo "=========================================="

# 配置变量
INSTANCE_NAME="football-server"
REGION="ap-shanghai-2"
BUNDLE_ID="lhins-1vcpu-2gb"  # 2核4G配置
BLUEPRINT_ID="lhbp-f1lkcd1k"  # Ubuntu 20.04 LTS
DOMAIN_NAME="football.yourdomain.com"

# 检查环境变量
if [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ]; then
    echo "错误: 请设置腾讯云密钥环境变量"
    echo "export TENCENT_SECRET_ID=your_secret_id"
    echo "export TENCENT_SECRET_KEY=your_secret_key"
    exit 1
fi

# 创建轻量应用服务器
create_lighthouse_instance() {
    echo "创建轻量应用服务器..."
    
    # 检查是否已存在同名实例
    EXISTING_INSTANCE=$(tccli lighthouse describe-instances --filters "Name=instance-name,Values=$INSTANCE_NAME" --query "InstanceSet[0].InstanceId" --output text 2>/dev/null || echo "")
    
    if [ "$EXISTING_INSTANCE" != "None" ] && [ -n "$EXISTING_INSTANCE" ]; then
        echo "实例已存在: $EXISTING_INSTANCE"
        INSTANCE_ID="$EXISTING_INSTANCE"
    else
        # 创建新实例
        INSTANCE_ID=$(tccli lighthouse create-instances \
            --bundle-id "$BUNDLE_ID" \
            --blueprint-id "$BLUEPRINT_ID" \
            --instance-name "$INSTANCE_NAME" \
            --zone "$REGION" \
            --quantity 1 \
            --query "InstanceIdSet[0]" \
            --output text)
        
        echo "实例创建成功: $INSTANCE_ID"
        
        # 等待实例启动
        echo "等待实例启动..."
        sleep 30
        
        # 等待实例完全启动
        while true; do
            STATUS=$(tccli lighthouse describe-instances --instance-ids "$INSTANCE_ID" --query "InstanceSet[0].InstanceState" --output text)
            if [ "$STATUS" = "RUNNING" ]; then
                break
            fi
            echo "实例状态: $STATUS, 等待中..."
            sleep 10
        done
    fi
    
    # 获取实例公网IP
    PUBLIC_IP=$(tccli lighthouse describe-instances --instance-ids "$INSTANCE_ID" --query "InstanceSet[0].PublicIpAddress" --output text)
    echo "实例公网IP: $PUBLIC_IP"
    
    # 保存实例信息
    echo "INSTANCE_ID=$INSTANCE_ID" > .instance-info
    echo "PUBLIC_IP=$PUBLIC_IP" >> .instance-info
}

# 配置服务器环境
setup_server() {
    echo "配置服务器环境..."
    
    # 读取实例信息
    source .instance-info
    
    # 生成SSH密钥（如果不存在）
    if [ ! -f ~/.ssh/id_rsa ]; then
        echo "生成SSH密钥..."
        ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    fi
    
    # 上传SSH公钥到服务器
    echo "上传SSH公钥到服务器..."
    ssh-copy-id -i ~/.ssh/id_rsa.pub root@"$PUBLIC_IP" || {
        echo "无法连接到服务器，请检查网络连接和防火墙设置"
        exit 1
    }
    
    # 执行服务器配置脚本
    echo "执行服务器配置..."
    scp setup-server.sh root@"$PUBLIC_IP":/root/
    ssh root@"$PUBLIC_IP" "chmod +x /root/setup-server.sh && /root/setup-server.sh"
}

# 部署应用
deploy_application() {
    echo "部署应用..."
    
    source .instance-info
    
    # 上传应用代码
    echo "上传应用代码..."
    tar -czf football-app.tar.gz --exclude=node_modules --exclude=.git .
    scp football-app.tar.gz root@"$PUBLIC_IP":/root/
    ssh root@"$PUBLIC_IP" "cd /root && tar -xzf football-app.tar.gz -C /var/www/"
    
    # 执行应用部署脚本
    echo "执行应用部署..."
    scp deploy-app.sh root@"$PUBLIC_IP":/root/
    ssh root@"$PUBLIC_IP" "chmod +x /root/deploy-app.sh && /root/deploy-app.sh"
    
    # 清理临时文件
    rm -f football-app.tar.gz
}

# 配置Nginx
configure_nginx() {
    echo "配置Nginx..."
    
    source .instance-info
    
    # 上传Nginx配置
    scp nginx-config.sh root@"$PUBLIC_IP":/root/
    ssh root@"$PUBLIC_IP" "chmod +x /root/nginx-config.sh && /root/nginx-config.sh $DOMAIN_NAME"
}

# 配置SSL证书
setup_ssl() {
    if [ -n "$DOMAIN_NAME" ] && [ "$DOMAIN_NAME" != "football.yourdomain.com" ]; then
        echo "配置SSL证书..."
        
        source .instance-info
        
        ssh root@"$PUBLIC_IP" "certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME"
    else
        echo "跳过SSL配置（未设置有效域名）"
    fi
}

# 健康检查
health_check() {
    echo "执行健康检查..."
    
    source .instance-info
    
    # 检查服务状态
    echo "检查服务状态..."
    ssh root@"$PUBLIC_IP" "systemctl status nginx"
    ssh root@"$PUBLIC_IP" "pm2 status"
    ssh root@"$PUBLIC_IP" "docker ps"
    
    # 检查端口
    echo "检查端口状态..."
    ssh root@"$PUBLIC_IP" "netstat -tlnp | grep -E ':(80|443|3001|11434)'"
}

# 显示部署结果
show_results() {
    echo "=========================================="
    echo "部署完成！"
    echo "=========================================="
    
    source .instance-info
    
    echo "服务器信息:"
    echo "实例ID: $INSTANCE_ID"
    echo "公网IP: $PUBLIC_IP"
    
    if [ -n "$DOMAIN_NAME" ] && [ "$DOMAIN_NAME" != "football.yourdomain.com" ]; then
        echo "域名: https://$DOMAIN_NAME"
    else
        echo "访问地址: http://$PUBLIC_IP"
    fi
    
    echo ""
    echo "管理命令:"
    echo "SSH连接: ssh root@$PUBLIC_IP"
    echo "查看日志: ssh root@$PUBLIC_IP 'pm2 logs'"
    echo "重启服务: ssh root@$PUBLIC_IP 'pm2 restart all'"
    echo "查看状态: ssh root@$PUBLIC_IP 'htop'"
    
    echo ""
    echo "监控和维护:"
    echo "- 腾讯云控制台: https://console.cloud.tencent.com/lighthouse"
    echo "- 服务器监控: ssh root@$PUBLIC_IP 'htop'"
    echo "- 应用监控: ssh root@$PUBLIC_IP 'pm2 monit'"
    
    echo ""
    echo "成本信息:"
    echo "- 轻量应用服务器: ¥90/月"
    echo "- 云数据库: ¥100/月"
    echo "- 对象存储: ¥10/月"
    echo "- CDN加速: ¥20/月"
    echo "- 总计: ¥220/月"
}

# 主函数
main() {
    echo "开始部署流程..."
    
    # 创建轻量应用服务器
    create_lighthouse_instance
    
    # 配置服务器环境
    setup_server
    
    # 部署应用
    deploy_application
    
    # 配置Nginx
    configure_nginx
    
    # 配置SSL证书
    setup_ssl
    
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