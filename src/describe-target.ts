import * as esprima from 'esprima';

/**
 * Returns the parameters of a function as an array of strings.
 * 
 * @param func The function to describe
 * @returns 
 */

export function describeTarget(func: (...args) => any): string[] {
  if (typeof func !== 'function') {
    throw new Error('Must pass a function');
  }

  const ast = esprima.parseScript(func.toString());
  const functionNode = ast.body.find(node =>
    node.type === 'FunctionDeclaration'
    || node.type === 'ArrowFunctionExpression'
    || node.type === 'FunctionExpression'
    || node.type === 'ExpressionStatement'
  );

  switch (functionNode.type) {
    case 'FunctionDeclaration':
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return functionNode.params.map(node => node.name);
    case 'ExpressionStatement':
      return functionNode.expression.params.map(node => node.name);
    default:
      throw new Error('No function found');
  }
}