#!/bin/zsh
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  python3 server.py --open
else
  echo "运行预览需要 Python 3。安装后重新双击此文件即可。"
  read -r "?按回车关闭窗口。"
fi
