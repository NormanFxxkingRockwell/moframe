# moframe

一个用于验证“摩托车在线配色”想法的 Web MVP。

## 当前版本

- `Vite + React`
- `Three.js / React Three Fiber`
- 当前首台真实车模改为本地 `GLB`
- 使用模型：`Ducati Panigale V4`
- 支持自动读取材质列表
- 支持对材质实时改色
- 其余车型仍保留为待接入状态

## 启动

```bash
npm install
npm run dev
```

## 下一步

1. 继续筛一台适合本地化部署的 `Yamaha R1`
2. 当前 Ducati 已经在本地 `GLB/GLTF` 渲染链路上
3. 将材质名映射成业务分区，例如 `fairing / tank / frame / rims / seat`
4. 增加截图导出和方案持久化

## 当前模型文件

- 模型页：<https://sketchfab.com/3d-models/ducati-panigale-v4-47f87e3d70f644289e34cbff91255d0c>
- 作者：`ROY`
- 许可证：`CC Attribution 4.0`
- 本地文件：`public/models/ducati/ducati_panigale_v4.glb`
