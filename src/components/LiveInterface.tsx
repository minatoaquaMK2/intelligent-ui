import { useEffect, useRef, useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { applyOperations, emptyTree } from '../core/runtime';
import type {
  Compilation,
  Data,
  RuntimeResult,
  Value,
  WorkerInput,
  WorkerOutput,
} from '../core/types';
import { Renderer } from './Renderer';

export function LiveInterface({
  compilation,
  appData,
  disabled,
  onResult,
  onAction,
}: {
  compilation?: Compilation;
  appData: Data;
  disabled: boolean;
  onResult: (result: RuntimeResult, interaction: boolean) => void;
  onAction: (action: NonNullable<RuntimeResult['action']>) => void;
}) {
  const [tree, setTree] = useState(emptyTree);
  const [error, setError] = useState('');
  const [restart, setRestart] = useState(0);
  const worker = useRef<Worker | null>(null);
  const pending = useRef(
    new Map<number, { timer: ReturnType<typeof setTimeout>; interaction: boolean }>(),
  );
  const counter = useRef(0);
  const callbacks = useRef({ onResult, onAction });
  callbacks.current = { onResult, onAction };

  function send(message: WorkerInput) {
    if (!worker.current) return;
    const timer = setTimeout(() => {
      worker.current?.terminate();
      worker.current = null;
      for (const task of pending.current.values()) clearTimeout(task.timer);
      pending.current.clear();
      setError('运行时响应超时，已停止 Worker。上一次成功的界面已保留。');
    }, 2000);
    pending.current.set(message.id, { timer, interaction: message.type === 'EVENT' });
    worker.current.postMessage(message);
  }

  useEffect(() => {
    const instance = new Worker(new URL('../runtime.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<WorkerOutput>) => {
      const response = event.data;
      const task = pending.current.get(response.id);
      if (task) clearTimeout(task.timer);
      pending.current.delete(response.id);
      if (response.type === 'ERROR') {
        setError(response.message);
        return;
      }
      setError('');
      setTree((current) => applyOperations(current, response.result.operations));
      callbacks.current.onResult(response.result, !!task?.interaction);
      if (response.result.action) callbacks.current.onAction(response.result.action);
    };
    instance.onerror = () => {
      instance.terminate();
      worker.current = null;
      for (const task of pending.current.values()) clearTimeout(task.timer);
      pending.current.clear();
      setError('Worker 加载失败。请重启运行时或刷新页面。');
    };
    return () => {
      instance.terminate();
      worker.current = null;
      for (const task of pending.current.values()) clearTimeout(task.timer);
      pending.current.clear();
    };
  }, [restart]);

  useEffect(() => {
    if (compilation) send({ type: 'LOAD', id: ++counter.current, compilation, appData });
  }, [compilation, appData, restart]);

  const dispatch = (handler: string, value?: Value) =>
    send({ type: 'EVENT', id: ++counter.current, handler, value });
  return (
    <>
      {error && (
        <div className="runtime-error" role="alert">
          <AlertCircle size={15} />
          <span>{error}</span>
          <button
            onClick={() => {
              setTree(emptyTree());
              setError('');
              setRestart((n) => n + 1);
            }}
          >
            <RotateCcw size={13} />
            重启运行时
          </button>
        </div>
      )}
      <Renderer tree={tree} dispatch={dispatch} disabled={disabled} />
    </>
  );
}
