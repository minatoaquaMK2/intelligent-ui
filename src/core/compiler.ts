import { catalog, isAllowedValue } from './catalog';
import { parseExpression } from './expression';
import type { Binding, Compilation, Scalar, TemplateNode } from './types';

// A deterministic streaming parser. It never evaluates model-written JavaScript.
export function compile(source: string): Compilation {
  if (source.length > 64000) throw new Error('DSL 超过 64,000 字符限制');
  const output: Compilation = {
    program: { version: 1, states: Object.create(null), derives: [], roots: [] },
    constants: Object.create(null),
    diagnostics: [],
    fallbackMarkdown: '',
  };
  const stack: { type: string; node: TemplateNode | null }[] = [];
  let nodeCount = 0;
  const diag = (code: string, message: string, offset: number, recovery = false) => {
    if (output.diagnostics.length < 100)
      output.diagnostics.push({ code, message, offset, ...(recovery ? { recovery } : {}) });
  };
  const constant = (key: string, value: string): Binding => {
    output.constants[key] = value;
    return { kind: 'constant', key };
  };
  const append = (node: TemplateNode) => {
    if (++nodeCount > 300) throw new Error('组件数量超过 300 个限制');
    if (stack.some((frame) => frame.node === null)) return;
    (stack.at(-1)?.node?.children ?? output.program.roots).push(node);
  };
  const expression = (text: string, offset: number): Binding | null => {
    try {
      return { kind: 'expression', expression: parseExpression(text) };
    } catch (error) {
      diag('invalid_expression', (error as Error).message, offset);
      return null;
    }
  };

  const readBraces = (text: string, start: number): number => {
    let level = 0;
    let quote = '';
    for (let i = start; i < text.length; i++) {
      const char = text[i];
      if (quote) {
        if (char === '\\') i++;
        else if (char === quote) quote = '';
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '{') level++;
      if (char === '}' && --level === 0) return i;
    }
    return -1;
  };

  const template = (text: string, key: string, offset: number): Binding => {
    const parts: Binding[] = [];
    let position = 0;
    while (position < text.length) {
      const next = text.indexOf('{', position);
      if (next === -1) {
        parts.push(constant(`${key}:${position}`, text.slice(position)));
        break;
      }
      if (next > position) parts.push(constant(`${key}:${position}`, text.slice(position, next)));
      const end = readBraces(text, next);
      if (end < 0) {
        diag('unterminated_expression', '等待完整的表达式', offset + next, true);
        break;
      }
      const binding = expression(text.slice(next + 1, end), offset + next);
      if (binding) parts.push(binding);
      position = end + 1;
    }
    return { kind: 'template', parts };
  };

  const addText = (text: string, offset: number) => {
    if (stack.some((frame) => frame.node === null)) return;
    let lineOffset = offset;
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed) {
        const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
        const content = heading ? heading[2] : trimmed;
        const id = `n${lineOffset}`;
        append({
          id,
          type: heading ? 'title' : 'text',
          props: {
            content: template(content, id, lineOffset),
            ...(heading ? { size: { kind: 'literal' as const, value: 'lg' } } : {}),
          },
          children: [],
        });
        output.fallbackMarkdown += `${heading ? '## ' : ''}${content.replace(/\{[^}]*\}/g, '〔交互计算〕')}\n\n`;
      }
      lineOffset += line.length + 1;
    }
  };

  const parseProps = (raw: string, type: string, offset: number): Record<string, Binding> => {
    const props: Record<string, Binding> = Object.create(null);
    let i = 0;
    while (i < raw.length) {
      while (/\s/.test(raw[i] ?? '') && i < raw.length) i++;
      if (i >= raw.length) break;
      const match = raw.slice(i).match(/^([A-Za-z][\w-]*)/);
      if (!match) {
        diag('invalid_prop', '属性格式无效', offset + i);
        break;
      }
      const name = match[1];
      i += name.length;
      while (i < raw.length && /\s/.test(raw[i])) i++;
      let binding: Binding | null = { kind: 'literal', value: true };
      if (raw[i] === '=') {
        i++;
        while (i < raw.length && /\s/.test(raw[i])) i++;
        if (raw[i] === '"' || raw[i] === "'") {
          const quote = raw[i++];
          let value = '';
          while (i < raw.length && raw[i] !== quote) {
            if (raw[i] === '\\' && i + 1 < raw.length) i++;
            value += raw[i++];
          }
          i++;
          binding = { kind: 'literal', value };
        } else if (raw[i] === '{') {
          const end = readBraces(raw, i);
          if (end < 0) {
            diag('unterminated_prop', '等待完整属性', offset + i, true);
            break;
          }
          const value = raw.slice(i + 1, end).trim();
          if (catalog[type]?.[name] === 'handler') {
            const setter = value.match(/^set([A-Z][\w]*)$/);
            const action = value.match(/^(issueNewTurn|copy)\(([\s\S]*)\)$/);
            if (setter) {
              const state = setter[1][0].toLowerCase() + setter[1].slice(1);
              if (Object.hasOwn(output.program.states, state))
                binding = { kind: 'handler', name: value };
              else {
                diag('unknown_handler', `未声明状态：${state}`, offset + i);
                binding = null;
              }
            } else if (action) {
              const argument = expression(action[2], offset + i);
              binding =
                argument?.kind === 'expression'
                  ? { kind: 'handler', name: action[1], argument: argument.expression }
                  : null;
            } else {
              diag('invalid_handler', '事件只允许状态 setter、issueNewTurn 或 copy', offset + i);
              binding = null;
            }
          } else binding = expression(value, offset + i);
          i = end + 1;
        } else {
          const unquoted = raw.slice(i).match(/^[^\s]+/)?.[0] ?? '';
          i += unquoted.length;
          diag('invalid_literal', '字符串请使用引号，数值请使用 {number}', offset + i);
          binding = null;
        }
      }
      const rule = Object.hasOwn(catalog[type] ?? {}, name) ? catalog[type][name] : undefined;
      if (!rule) {
        diag('unknown_prop', `${type} 不支持属性 ${name}`, offset);
        continue;
      }
      if (rule === 'handler' && binding && binding.kind !== 'handler') {
        diag('invalid_handler', '事件属性必须使用受限处理器表达式', offset);
        continue;
      }
      if (binding?.kind === 'expression' && binding.expression.type === 'Literal')
        binding = { kind: 'literal', value: binding.expression.value ?? null };
      if (binding?.kind === 'literal' && !isAllowedValue(rule, binding.value)) {
        diag('invalid_literal', `${type}.${name} 的值类型不正确`, offset);
        continue;
      }
      if (binding?.kind === 'literal' && typeof binding.value === 'string')
        binding = constant(`n${offset}:${name}`, binding.value);
      if (binding) props[name] = binding;
    }
    return props;
  };

  let cursor = 0;
  while (cursor < source.length) {
    if (source.startsWith('{@', cursor)) {
      const end = readBraces(source, cursor);
      if (end < 0) {
        diag('unclosed_declaration', '等待完整声明', cursor, true);
        break;
      }
      const declaration = source
        .slice(cursor + 2, end)
        .match(/^(state|derive)\s+([A-Za-z][\w]*)\s*=\s*([\s\S]*)$/);
      if (!declaration) diag('invalid_declaration', '只支持 @state 和 @derive 声明', cursor);
      else {
        const [, kind, name, value] = declaration;
        try {
          parseExpression(name);
          if (
            name === 'data' ||
            Object.hasOwn(output.program.states, name) ||
            output.program.derives.some((d) => d.name === name)
          )
            throw new Error(`重复或保留变量：${name}`);
          const ast = parseExpression(value);
          if (kind === 'state') {
            if (ast.type !== 'Literal')
              throw new Error('状态初始值必须是字符串、非负数字、布尔值或 null');
            output.program.states[name] = ast.value as Scalar;
          } else output.program.derives.push({ name, expression: ast });
        } catch (error) {
          diag('invalid_declaration', (error as Error).message, cursor);
        }
      }
      cursor = end + 1;
      continue;
    }
    if (source[cursor] === '<') {
      let end = cursor + 1;
      let quote = '';
      for (; end < source.length; end++) {
        if (quote) {
          if (source[end] === '\\') end++;
          else if (source[end] === quote) quote = '';
          continue;
        }
        if (source[end] === '"' || source[end] === "'") {
          quote = source[end];
          continue;
        }
        if (source[end] === '{') {
          const braceEnd = readBraces(source, end);
          if (braceEnd < 0) {
            end = source.length;
            break;
          }
          end = braceEnd;
          continue;
        }
        if (source[end] === '>') break;
      }
      if (end >= source.length) {
        diag('unterminated_tag', '等待组件标签闭合', cursor, true);
        break;
      }
      const tag = source.slice(cursor + 1, end).trim();
      if (tag.startsWith('/')) {
        const name = tag.slice(1).trim();
        if (stack.at(-1)?.type === name) stack.pop();
        else diag('mismatched_tag', `闭合标签不匹配：${name}`, cursor);
      } else {
        const match = tag.match(/^([A-Za-z][\w]*)([\s\S]*?)\/?$/);
        if (!match) diag('invalid_tag', '无效的组件标签', cursor);
        else {
          const [, type, raw] = match;
          const known = Object.hasOwn(catalog, type);
          const node: TemplateNode | null = known
            ? { id: `n${cursor}`, type, props: parseProps(raw, type, cursor), children: [] }
            : null;
          if (node) append(node);
          else diag('unknown_component', `组件 ${type} 不在目录内，已丢弃`, cursor);
          if (!tag.endsWith('/')) {
            if (stack.length >= 24) throw new Error('组件嵌套超过 24 层限制');
            stack.push({ type, node });
          }
        }
      }
      cursor = end + 1;
      continue;
    }
    let end = cursor;
    while (end < source.length && source[end] !== '<' && !source.startsWith('{@', end)) {
      if (source[end] === '{') {
        const braceEnd = readBraces(source, end);
        if (braceEnd >= 0) end = braceEnd;
      }
      end++;
    }
    addText(source.slice(cursor, end), cursor);
    cursor = end;
  }
  for (const frame of stack)
    diag('unclosed_tag', `流式恢复：自动闭合 ${frame.type}`, source.length, true);
  output.fallbackMarkdown = output.fallbackMarkdown.trim();
  return output;
}
