import jsep from 'jsep';
import type { Data, Expression, Value } from './types';
import { monitoringHelpers } from './monitoring';

const blocked = new Set([
  '__proto__',
  'prototype',
  'constructor',
  'globalThis',
  'window',
  'document',
  'eval',
  'Function',
  'fetch',
  'import',
  'self',
]);
const operators = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
  '>',
  '>=',
  '<',
  '<=',
  '===',
  '!==',
  '==',
  '!=',
  '&&',
  '||',
]);
const helpers: Record<string, (...args: Value[]) => Value> = Object.assign(Object.create(null), {
  round: (n: Value) => Math.round(Number(n)),
  min: (...ns: Value[]) => Math.min(...ns.map(Number)),
  max: (...ns: Value[]) => Math.max(...ns.map(Number)),
  money: (n: Value) => Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 0 }),
  percent: (n: Value) => `${Math.round(Number(n) * 100)}%`,
  ...monitoringHelpers,
});

export function parseExpression(source: string): Expression {
  if (source.length > 2000) throw new Error('表达式超过 2,000 字符限制');
  const ast = jsep(source) as Expression;
  let nodes = 0;
  const validate = (node: Expression, depth = 0): void => {
    if (++nodes > 200 || depth > 24) throw new Error('表达式过于复杂');
    const visit = (child?: Expression) => {
      if (!child) throw new Error('不完整的表达式');
      validate(child, depth + 1);
    };
    switch (node.type) {
      case 'Literal':
        if (typeof node.value === 'number' && !Number.isFinite(node.value))
          throw new Error('数值必须有限');
        break;
      case 'Identifier':
        if (!node.name || blocked.has(node.name)) throw new Error('不允许访问此标识符');
        break;
      case 'BinaryExpression':
      case 'LogicalExpression':
        if (!operators.has(node.operator!)) throw new Error('不支持的运算符');
        visit(node.left);
        visit(node.right);
        break;
      case 'UnaryExpression':
        if (!['!', '+', '-'].includes(node.operator!)) throw new Error('不支持的一元运算符');
        visit(node.argument);
        break;
      case 'ConditionalExpression':
        visit(node.test);
        visit(node.consequent);
        visit(node.alternate);
        break;
      case 'MemberExpression':
        visit(node.object);
        visit(node.property);
        if (node.property?.type === 'Literal' && blocked.has(String(node.property.value)))
          throw new Error('不允许访问此属性');
        break;
      case 'ArrayExpression':
        (node.elements ?? []).forEach(visit);
        break;
      case 'CallExpression':
        if (node.callee?.type !== 'Identifier' || !Object.hasOwn(helpers, node.callee.name!))
          throw new Error('仅允许调用内置纯函数');
        (node.arguments ?? []).forEach(visit);
        break;
      default:
        throw new Error(`不支持的表达式类型：${node.type}`);
    }
  };
  validate(ast);
  return ast;
}

export function evaluate(node: Expression, scope: Data, depth = 0): Value {
  if (depth > 32) throw new Error('表达式求值深度超限');
  const run = (child?: Expression): Value => (child ? evaluate(child, scope, depth + 1) : null);
  let result: Value;
  switch (node.type) {
    case 'Literal':
      return node.value ?? null;
    case 'Identifier':
      if (!node.name || blocked.has(node.name) || !Object.hasOwn(scope, node.name))
        throw new Error(`未知变量：${node.name}`);
      return scope[node.name];
    case 'ArrayExpression':
      return (node.elements ?? []).map(run);
    case 'MemberExpression': {
      const obj = run(node.object);
      const key = node.computed ? String(run(node.property)) : (node.property?.name ?? '');
      if (blocked.has(key)) throw new Error('不允许访问此属性');
      if (obj === null || typeof obj !== 'object' || !Object.hasOwn(obj, key))
        throw new Error(`数据尚不可用：${key}`);
      return (obj as Data)[key];
    }
    case 'CallExpression': {
      const name = node.callee?.name ?? '';
      if (node.callee?.type !== 'Identifier' || !Object.hasOwn(helpers, name))
        throw new Error('不允许调用此函数');
      result = helpers[name](...(node.arguments ?? []).map(run));
      break;
    }
    case 'ConditionalExpression':
      return run(node.test) ? run(node.consequent) : run(node.alternate);
    case 'UnaryExpression': {
      const arg = run(node.argument);
      if (node.operator === '!') return !arg;
      result = node.operator === '-' ? -Number(arg) : Number(arg);
      break;
    }
    case 'BinaryExpression':
    case 'LogicalExpression': {
      const a = run(node.left);
      if (node.operator === '&&') return a ? run(node.right) : a;
      if (node.operator === '||') return a ? a : run(node.right);
      const b = run(node.right);
      switch (node.operator) {
        case '+':
          result =
            typeof a === 'string' || typeof b === 'string'
              ? String(a) + String(b)
              : Number(a) + Number(b);
          break;
        case '-':
          result = Number(a) - Number(b);
          break;
        case '*':
          result = Number(a) * Number(b);
          break;
        case '/':
          result = Number(a) / Number(b);
          break;
        case '%':
          result = Number(a) % Number(b);
          break;
        case '**':
          result = Number(a) ** Number(b);
          break;
        case '>':
          return Number(a) > Number(b);
        case '>=':
          return Number(a) >= Number(b);
        case '<':
          return Number(a) < Number(b);
        case '<=':
          return Number(a) <= Number(b);
        case '==':
        case '===':
          return a === b;
        case '!=':
        case '!==':
          return a !== b;
        default:
          throw new Error('不支持的运算符');
      }
      break;
    }
    default:
      throw new Error('不支持的表达式');
  }
  if (typeof result === 'number' && !Number.isFinite(result))
    throw new Error('计算结果不是有限数值');
  if (typeof result === 'string' && result.length > 16000) throw new Error('计算结果过长');
  return result;
}
