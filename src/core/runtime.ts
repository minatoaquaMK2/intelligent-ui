import { catalog, isAllowedValue } from './catalog';
import { evaluate } from './expression';
import { records } from './monitoring';
import { contextFromScope } from './context';
import type {
  Binding,
  Compilation,
  Data,
  Operation,
  RenderTree,
  RuntimeResult,
  TemplateNode,
  Value,
} from './types';

export const emptyTree = (): RenderTree => ({ roots: [], nodes: Object.create(null) });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export function diffTrees(previous: RenderTree, next: RenderTree): Operation[] {
  const ops: Operation[] = [];
  for (const node of Object.values(next.nodes)) {
    const old = previous.nodes[node.id];
    if (!old || old.type !== node.type) ops.push({ op: 'CREATE', node });
    else {
      if (!same(old.props, node.props)) ops.push({ op: 'SET', id: node.id, props: node.props });
      if (!same(old.children, node.children))
        ops.push({ op: 'PLACE', id: node.id, children: node.children });
    }
  }
  if (!same(previous.roots, next.roots)) ops.push({ op: 'ROOT', children: next.roots });
  for (const id of Object.keys(previous.nodes)) if (!next.nodes[id]) ops.push({ op: 'REMOVE', id });
  return ops;
}

export function applyOperations(tree: RenderTree, operations: Operation[]): RenderTree {
  const next = { roots: tree.roots, nodes: { ...tree.nodes } };
  for (const op of operations) {
    switch (op.op) {
      case 'CREATE':
        next.nodes[op.node.id] = op.node;
        break;
      case 'SET':
        if (next.nodes[op.id]) next.nodes[op.id] = { ...next.nodes[op.id], props: op.props };
        break;
      case 'PLACE':
        if (next.nodes[op.id]) next.nodes[op.id] = { ...next.nodes[op.id], children: op.children };
        break;
      case 'ROOT':
        next.roots = op.children;
        break;
      case 'REMOVE':
        delete next.nodes[op.id];
        break;
    }
  }
  return next;
}

type Handler = { binding: Extract<Binding, { kind: 'handler' }>; node: TemplateNode; props: Data };

export class Runtime {
  private compilation?: Compilation;
  private appData: Data = {};
  private state: Data = Object.create(null);
  private scope: Data = Object.create(null);
  private tree = emptyTree();
  private handlers = new Map<string, Handler>();

  load(compilation: Compilation, appData: Data): RuntimeResult {
    const snapshot = { compilation: this.compilation, appData: this.appData, state: this.state };
    this.compilation = compilation;
    this.appData = appData;
    this.state = { ...compilation.program.states, ...this.state };
    try {
      return this.render();
    } catch (error) {
      Object.assign(this, snapshot);
      throw error;
    }
  }

  event(id: string, value: Value = null): RuntimeResult {
    const handler = this.handlers.get(id);
    if (!handler) throw new Error('事件处理器不存在或已失效');
    const { binding, node, props } = handler;
    if (props.disabled === true) throw new Error('当前操作不可用');
    if (binding.name === 'issueNewTurn' || binding.name === 'copy') {
      const text = String(binding.argument ? evaluate(binding.argument, this.scope) : '');
      if (!text.trim() || text.length > 4000) throw new Error('操作文本为空或过长');
      return {
        operations: [],
        state: this.state,
        diagnostics: [],
        duration: 0,
        context: contextFromScope(this.scope),
        action: { type: binding.name, text },
      };
    }
    const key = binding.name.slice(3, 4).toLowerCase() + binding.name.slice(4);
    if (!this.compilation || !Object.hasOwn(this.compilation.program.states, key))
      throw new Error('状态不存在');
    if (node.type === 'slider') {
      if (typeof value !== 'number' || !Number.isFinite(value))
        throw new Error('滑块只接受有限数值');
      const min = Number(props.min ?? 0),
        max = Math.max(min, Number(props.max ?? 100));
      const step = Math.max(0.01, Number(props.step ?? 1));
      value = Math.max(min, Math.min(max, min + Math.round((value - min) / step) * step));
    } else if (node.type === 'toggle') {
      if (typeof value !== 'boolean') throw new Error('开关只接受布尔值');
    } else if (node.type === 'select') {
      if (!Array.isArray(props.options) || !props.options.includes(value))
        throw new Error('选项不在白名单内');
    } else if (['rack', 'gpus', 'ports'].includes(node.type)) {
      const items =
        props[node.type === 'rack' ? 'devices' : node.type === 'gpus' ? 'cards' : 'ports'];
      if (typeof value !== 'string' || !records(items).some((item) => item.id === value))
        throw new Error('设备或端口不在当前视图内');
    } else throw new Error('该组件不能修改状态');
    const previous = this.state;
    this.state = { ...previous, [key]: value };
    try {
      return this.render();
    } catch (error) {
      this.state = previous;
      throw error;
    }
  }

  private render(): RuntimeResult {
    const started = performance.now();
    const compilation = this.compilation;
    if (!compilation) throw new Error('尚未加载程序');
    const diagnostics: string[] = [];
    const scope: Data = Object.assign(Object.create(null), this.state, { data: this.appData });
    for (const derived of compilation.program.derives) {
      try {
        scope[derived.name] = evaluate(derived.expression, scope);
      } catch (error) {
        scope[derived.name] = null;
        diagnostics.push(`${derived.name}: ${(error as Error).message}`);
      }
    }
    const tree = emptyTree();
    const handlers = new Map<string, Handler>();
    const resolve = (binding: Binding): Value => {
      switch (binding.kind) {
        case 'literal':
          return binding.value;
        case 'constant':
          return compilation.constants[binding.key] ?? '';
        case 'expression':
          return evaluate(binding.expression, scope);
        case 'template':
          return binding.parts
            .map((part) => {
              const result = resolve(part);
              return result === null ? '—' : String(result);
            })
            .join('');
        case 'handler':
          return null;
      }
    };
    const visit = (node: TemplateNode): string | null => {
      if (!Object.hasOwn(catalog, node.type)) return null;
      const props: Data = {};
      for (const [key, binding] of Object.entries(node.props)) {
        if (!Object.hasOwn(catalog[node.type], key)) continue;
        try {
          if (binding.kind === 'handler') {
            const id = `fn:${node.id}:${key}`;
            props[key] = id;
            handlers.set(id, { binding, node, props });
          } else {
            const value = resolve(binding);
            if (isAllowedValue(catalog[node.type][key], value)) props[key] = value;
            else diagnostics.push(`${node.type}.${key}: 动态值类型不正确`);
          }
        } catch (error) {
          diagnostics.push(`${node.type}.${key}: ${(error as Error).message}`);
        }
      }
      const children = node.children.map(visit).filter((id): id is string => id !== null);
      tree.nodes[node.id] = { id: node.id, type: node.type, props, children };
      return node.id;
    };
    tree.roots = compilation.program.roots.map(visit).filter((id): id is string => id !== null);
    const operations = diffTrees(this.tree, tree);
    this.tree = tree;
    this.handlers = handlers;
    this.scope = scope;
    return {
      operations,
      state: { ...this.state },
      diagnostics: diagnostics.slice(0, 30),
      duration: performance.now() - started,
      context: contextFromScope(scope),
    };
  }
}
