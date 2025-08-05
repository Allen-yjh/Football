#!/bin/bash

# 腾讯云服务器(CVM)一键部署脚本（CentOS 版）

set -e

echo "=========================================="
echo "足球青训管理系统 - 云服务器部署 (CentOS)"
echo "=========================================="

echo "请确保目标云服务器操作系统为 CentOS 7/8。"

# 配置变量
INSTANCE_NAME="football-cvm"
REGION="ap-shanghai-2"
INSTANCE_TYPE="S5.MEDIUM2"
IMAGE_ID="img-9qabwvbn"

# 检查环境变量
if [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ]; then
    echo "错误: 请设置腾讯云密钥环境变量"
    exit 1
fi

# 创建云服务器
create_cvm_instance() {
    echo "创建云服务器..."
    INSTANCE_ID=$(tccli cvm run-instances \
        --instance-type "$INSTANCE_TYPE" \
        --image-id "$IMAGE_ID" \
        --instance-name "$INSTANCE_NAME" \
        --zone "$REGION" \
        --query "InstanceIdSet[0]" \
        --output text)
    echo "实例创建成功: $INSTANCE_ID"
    echo "等待实例启动..."
    sleep 60
    PUBLIC_IP=$(tccli cvm describe-instances --instance-ids "$INSTANCE_ID" --query "InstanceSet[0].PublicIpAddresses[0]" --output text)
    echo "实例公网IP: $PUBLIC_IP"
    echo "INSTANCE_ID=$INSTANCE_ID" > .instance-info
    echo "PUBLIC_IP=$PUBLIC_IP" >> .instance-info
}

# 配置服务器环境
setup_server() {
    echo "配置服务器环境..."
    source .instance-info
    if [ ! -f ~/.ssh/id_rsa ]; then
        ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""
    fi
    ssh-copy-id -i ~/.ssh/id_rsa.pub root@"$PUBLIC_IP"
    scp setup-cvm.sh root@"$PUBLIC_IP":/root/
    ssh root@"$PUBLIC_IP" "chmod +x /root/setup-cvm.sh && /root/setup-cvm.sh"
}

# 部署应用
deploy_application() {
    echo "部署应用..."
    source .instance-info
    tar -czf football-app.tar.gz --exclude=node_modules --exclude=.git .
    scp football-app.tar.gz root@"$PUBLIC_IP":/root/
    ssh root@"$PUBLIC_IP" "cd /root && tar -xzf football-app.tar.gz -C /var/www/"
    scp deploy-app.sh root@"$PUBLIC_IP":/root/
    ssh root@"$PUBLIC_IP" "chmod +x /root/deploy-app.sh && /root/deploy-app.sh"
    rm -f football-app.tar.gz
}

# 显示结果
show_results() {
    echo "=========================================="
    echo "部署完成！"
    echo "=========================================="
    source .instance-info
    echo "服务器信息:"
    echo "实例ID: $INSTANCE_ID"
    echo "公网IP: $PUBLIC_IP"
    echo "访问地址: http://$PUBLIC_IP"
    echo ""
    echo "管理命令:"
    echo "SSH连接: ssh root@$PUBLIC_IP"
    echo "查看日志: ssh root@$PUBLIC_IP 'pm2 logs'"
    echo ""
    echo "成本信息:"
    echo "- 云服务器: ¥120/月"
    echo "- 云数据库: ¥100/月"
    echo "- 对象存储: ¥10/月"
    echo "- CDN加速: ¥20/月"
    echo "- 域名和SSL: ¥20/月"
    echo "- 总计: ¥270/月"
}

main() {
    echo "开始部署流程..."
    create_cvm_instance
    setup_server
    deploy_application
    show_results
    echo "=========================================="
    echo "部署流程完成！"
    echo "=========================================="
}

main "$@" 