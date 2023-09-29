# 0.0.1
** 当在一个组件里使用了webpack 提供的懒加载语法import() 时，由于 babel 编译后会将此语法编译成 _promise["default"].resolve().then(function () {
    return _interopRequireWildcard(require('XXX'));
  });
typescript 会编译成Promise.resolve().then...
导致使用webpack 打包的时候无法识别到此语法 不能当作懒加载处理 所以在第三方包中使用import() 目前实际上是不生效的。

** dynamic-import-node-module-loader 位此场景提供了解决方案

** 使用方式

在webpack module 配置添加此loader

const dynamicImportNodeModuleLoader = require('dynamic-import-node-module-loader');

{
  test: /\.(js|ts)$/,
  use: [
    {
      loader: dynamicImportNodeModuleLoader
    }
  ]
}