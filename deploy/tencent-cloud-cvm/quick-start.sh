#!/bin/bash

# 腾讯云服务器(CVM)快速启动脚本
# 一键部署足球青训管理系统

set -e

echo "=========================================="
echo "足球青训管理系统 - 云服务器快速启动"
echo "=========================================="

# 检查环境变量
if [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ]; then
    echo "请先设置腾讯云API密钥:"
    echo "export TENCENT_SECRET_ID=your_secret_id"
    echo "export TENCENT_SECRET_KEY=your_secret_key"
    echo ""
    echo "或者编辑 env.sh 文件设置密钥"
    exit 1
fi

# 检查必要工具
check_tools() {
    echo "检查必要工具..."
    
    if ! command -v tccli &> /dev/null; then
        echo "安装腾讯云CLI..."
        pip install tccli
    fi
    
    if ! command -v ssh &> /dev/null; then
        echo "错误: 请安装SSH客户端"
        exit 1
    fi
    
    echo "工具检查完成"
}

# 显示成本信息
show_cost_info() {
    echo ""
    echo "💰 成本信息:"
    echo "├─ 云服务器 (2核4G): ¥120/月"
    echo "├─ 云数据库 MySQL: ¥100/月"
    echo "├─ 对象存储 COS: ¥10/月"
    echo "├─ CDN加速: ¥20/月"
    echo "└─ 总计: ¥250/月"
    echo ""
    echo "💡 相比PaaS方案节省: 65%"
    echo ""
}

# 显示部署选项
show_options() {
    echo "请选择部署选项:"
    echo "1) 一键部署 (推荐)"
    echo "2) 分步部署"
    echo "3) 仅创建服务器"
    echo "4) 查看成本对比"
    echo "5) 退出"
    echo ""
    read -p "请输入选项 (1-5): " choice
    
    case $choice in
        1)
            echo "开始一键部署..."
            ./deploy-cvm.sh
            ;;
        2)
            echo "分步部署选项:"
            echo "a) 创建服务器"
            echo "b) 配置环境"
            echo "c) 部署应用"
            echo "d) 配置域名"
            read -p "选择步骤 (a-d): " step
            case $step in
                a) echo "创建服务器..." && tccli cvm run-instances --instance-type S5.MEDIUM2 --image-id img-9qabwvbn --instance-name football-cvm --zone ap-shanghai-2 ;;
                b) echo "配置环境..." && echo "请先创建服务器" ;;
                c) echo "部署应用..." && echo "请先配置环境" ;;
                d) echo "配置域名..." && echo "请先部署应用" ;;
                *) echo "无效选项" ;;
            esac
            ;;
        3)
            echo "创建云服务器..."
            tccli cvm run-instances --instance-type S5.MEDIUM2 --image-id img-9qabwvbn --instance-name football-cvm --zone ap-shanghai-2
            echo "服务器创建完成！"
            ;;
        4)
            echo ""
            echo "📊 成本对比:"
            echo "┌─────────────────┬─────────────┬─────────────┐"
            echo "│ 部署方案        │ 月度成本    │ 节省比例    │"
            echo "├─────────────────┼─────────────┼─────────────┤"
            echo "│ PaaS平台        │ ¥430-1220   │ -           │"
            echo "│ 轻量应用服务器   │ ¥240        │ 60%         │"
            echo "│ 云服务器        │ ¥250        │ 65%         │"
            echo "└─────────────────┴─────────────┴─────────────┘"
            echo ""
            echo "💡 云服务器优势:"
            echo "   • 成本最低"
            echo "   • 完全控制"
            echo "   • 性能稳定"
            echo "   • 无厂商锁定"
            echo ""
            ;;
        5)
            echo "退出部署"
            exit 0
            ;;
        *)
            echo "无效选项，请重新选择"
            show_options
            ;;
    esac
}

# 主函数
main() {
    echo "欢迎使用足球青训管理系统部署工具！"
    echo ""
    
    # 检查工具
    check_tools
    
    # 显示成本信息
    show_cost_info
    
    # 显示选项
    show_options
}

# 执行主函数
main "$@" 