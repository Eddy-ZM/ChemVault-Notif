# ChemVault Notifications

ChemVault Notifications 是 ChemVault 的统一通知、消息和产品更新网站，正式入口为 `https://notify.chemvault.science`。

## 产品职责

- 展示分析完成、失败、权限变更和账户事件通知。
- 提供项目消息、会话、已读状态和通知偏好。
- 展示产品更新、管理员广播和 Web Push。
- 通过深链接返回权威产品：文件操作进入 ChemVault Files，分析结果与导出进入 ChemVault Lab，账号操作进入 User Center。

Notifications 不再作为第二套文件管理器、分析任务控制台或结果编辑器。历史文件、任务、结果和数据集页面保留兼容跳转；历史写入 API 返回 `410 Gone` 并给出权威入口。

## 产品形态

- 响应式网站，可在桌面和移动浏览器中使用。
- 可安装的浏览器 App / PWA，可在获得授权后接收系统通知。
- 本项目不包含独立 iOS 或 Android 原生 App。

## 安全与隐私

- 内部服务事件使用专用密钥、版本化契约和幂等事件 ID。
- 通知只保存完成用户提示所需的最小元数据，不复制源文件或完整分析结果。
- 账户数据导出与删除由 ChemVault User Center 统一发起。
