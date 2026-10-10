import type { Compilation, Data, Operation, RuntimeResult } from '../core/types';
import type { ViewContext } from '../core/context';

export type Scenario = 'rack' | 'gpu' | 'network';
export type EventLog = { id: number; time: string; kind: string; detail: string };
export interface Turn {
  id: string;
  prompt: string;
  context?: ViewContext;
  source: string;
  mode: 'demo' | 'live';
  model: string;
  scenario?: Scenario;
  status: 'streaming' | 'done' | 'stopped' | 'error';
  error?: string;
  compilation?: Compilation;
  appData: Data;
  duration: number;
  chunks: number;
  modelCalls: number;
  interactions: number;
  operationCount: number;
  lastOperations: Operation[];
  report?: RuntimeResult;
  events: EventLog[];
  view: 'native' | 'markdown';
}

export const examples: {
  id: Scenario;
  title: string;
  description: string;
  prompt: string;
  tag: string;
}[] = [
  {
    id: 'rack',
    title: '机架运行总览',
    description: '从物理 U 位，下钻到每一台设备',
    prompt:
      '生成 Dell Private Cloud 的 Rack A01 机架总览，监控服务器、交换机和 GPU 节点的状态与指标',
    tag: '机架视图 · 设备联动',
  },
  {
    id: 'gpu',
    title: 'GPU 算力监控',
    description: '利用率、显存与温度，尽在掌握',
    prompt: '监控 Rack A01 的 GPU 利用率、显存、温度和功耗，温度阈值 80°C，可筛选越限 GPU',
    tag: 'GPU 矩阵 · 温度阈值',
  },
  {
    id: 'network',
    title: '交换机与链路',
    description: '从端口状态，追踪到流量与异常',
    prompt: '查看 Rack A01 的交换机和网络链路，展示端口状态、流量趋势和 CRC 错误',
    tag: '端口面板 · 链路告警',
  },
];
