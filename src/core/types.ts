export type Scalar = string | number | boolean | null;
export type Value = Scalar | Value[] | { [key: string]: Value };
export type Data = Record<string, Value>;

export interface Expression {
  type: string;
  value?: Scalar;
  name?: string;
  operator?: string;
  argument?: Expression;
  left?: Expression;
  right?: Expression;
  test?: Expression;
  consequent?: Expression;
  alternate?: Expression;
  object?: Expression;
  property?: Expression;
  computed?: boolean;
  callee?: Expression;
  arguments?: Expression[];
  elements?: Expression[];
}

export type Binding =
  | { kind: 'literal'; value: Value }
  | { kind: 'constant'; key: string }
  | { kind: 'expression'; expression: Expression }
  | { kind: 'template'; parts: Binding[] }
  | { kind: 'handler'; name: string; argument?: Expression };

export interface TemplateNode {
  id: string;
  type: string;
  props: Record<string, Binding>;
  children: TemplateNode[];
}

export interface Program {
  version: 1;
  states: Record<string, Scalar>;
  derives: { name: string; expression: Expression }[];
  roots: TemplateNode[];
}

export interface Diagnostic {
  code: string;
  message: string;
  offset: number;
  recovery?: boolean;
}

export interface Compilation {
  program: Program;
  constants: Record<string, string>;
  diagnostics: Diagnostic[];
  fallbackMarkdown: string;
}

export interface RenderNode {
  id: string;
  type: string;
  props: Data;
  children: string[];
}

export interface RenderTree {
  roots: string[];
  nodes: Record<string, RenderNode>;
}

export type Operation =
  | { op: 'CREATE'; node: RenderNode }
  | { op: 'SET'; id: string; props: Data }
  | { op: 'PLACE'; id: string; children: string[] }
  | { op: 'ROOT'; children: string[] }
  | { op: 'REMOVE'; id: string };

export interface RuntimeResult {
  operations: Operation[];
  state: Data;
  diagnostics: string[];
  duration: number;
  context?: import('./context').ViewContext;
  action?: { type: 'issueNewTurn' | 'copy'; text: string };
}

export type WorkerInput =
  | { type: 'LOAD'; id: number; compilation: Compilation; appData: Data }
  | { type: 'EVENT'; id: number; handler: string; value?: Value };

export type WorkerOutput =
  | { type: 'RESULT'; id: number; result: RuntimeResult }
  | { type: 'ERROR'; id: number; message: string };

export type StreamEvent =
  | { type: 'meta'; mode: 'demo' | 'live'; scenario: string; model: string; modelCalls: number }
  | {
      type: 'patch';
      append: string;
      delta: Partial<Compilation>;
      update: 'program' | 'constants' | 'source';
      sequence: number;
    }
  | { type: 'data'; appData: Data }
  | { type: 'done'; duration: number }
  | { type: 'error'; message: string };
