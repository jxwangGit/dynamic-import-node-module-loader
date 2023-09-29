const babelTypes = require('@babel/types');
const babelParser = require("@babel/parser");
const babelTraverse = require("@babel/traverse").default;
const babelGenerate = require("@babel/generator").default;

const isPromiseNode = (node) => {
  const thenCalleeNode = node.callee;
  if (
    babelTypes.isMemberExpression(thenCalleeNode)
    && thenCalleeNode.property.name === 'then'
    && babelTypes.isCallExpression(thenCalleeNode.object)
  ) {
    const resolveNodeCallee = thenCalleeNode.object.callee;
    if (
      babelTypes.isMemberExpression(resolveNodeCallee)
      && resolveNodeCallee.property.name === 'resolve'
    ) {
      const promiseNode = resolveNodeCallee.object;
      // _promise["default"].resolve().then(
      const is_promiseFlag = babelTypes.isMemberExpression(promiseNode)
        && promiseNode.property && promiseNode.property.value === 'default'
        && babelTypes.isIdentifier(promiseNode.object) && promiseNode.object.name === '_promise';
      // Promise.resolve().then
      const isPromiseFlag = (babelTypes.isIdentifier(promiseNode) && promiseNode.name === 'Promise');
      return is_promiseFlag || isPromiseFlag;
    }
  }
  return false;
};

const findRequirePath = (node) => {
  if (node && babelTypes.isFunctionExpression(node)) {
    const ReturnStatementNode = node.body && node.body.body && node.body.body.length && node.body.body[0];
    const ReturnStatementNodeArguments = ReturnStatementNode.argument && ReturnStatementNode.argument.arguments;
    const requireNode = ReturnStatementNodeArguments && ReturnStatementNodeArguments.length && ReturnStatementNodeArguments[0];
    if (
      babelTypes.isCallExpression(requireNode)
      && babelTypes.isIdentifier(requireNode.callee)
      && requireNode.callee.name === 'require'
    ) {
      return requireNode.arguments && requireNode.arguments.length && requireNode.arguments[0].value;
    }
  }
  return '';
};

const importPromisePlugin = function () {
  return {
    visitor: {
      CallExpression(path) {
        const { node } = path;
        const argumentNode = node.arguments && node.arguments.length && node.arguments[0];
        const promiseNode = isPromiseNode(node);
        if (promiseNode) {
          const importPath = findRequirePath(argumentNode);
          if (typeof importPath === 'string') {
            const importNode = babelTypes.import();
            const importArgument = babelTypes.stringLiteral(importPath);
            const importExpression = babelTypes.callExpression(importNode, [ importArgument ]);
            path.replaceWith(importExpression);
          }
        }
      }
    }
  };
};
// 根据babel 编译后的源代码不同进行正则匹配
const _promiseReg = /\.resolve\(\)\.then\(function \(\) \{[\s\S]*return [\s\S]*require\(/;

const dynamicImportNodeModuleLoader = function (sourceCode) {
  const sourcePath = this.resourcePath;
  // 先进行一层拦截 避免处理过多 只处理第三方被编译过的代码
  if (
    sourcePath && sourcePath.includes('node_modules')
    && (_promiseReg.test(sourceCode))
  ) {
    const ast = babelParser.parse(sourceCode);
    babelTraverse(ast, importPromisePlugin().visitor);
    const { code } = babelGenerate(ast);
    return code;
  }
  return sourceCode;
};
module.exports = dynamicImportNodeModuleLoader;
