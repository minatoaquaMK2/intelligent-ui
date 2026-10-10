import { Runtime } from './core/runtime';
import type { WorkerInput, WorkerOutput } from './core/types';

const runtime = new Runtime();
self.onmessage = (event: MessageEvent<WorkerInput>) => {
  const message = event.data;
  let response: WorkerOutput;
  try {
    const result =
      message.type === 'LOAD'
        ? runtime.load(message.compilation, message.appData)
        : runtime.event(message.handler, message.value);
    response = { type: 'RESULT', id: message.id, result };
  } catch (error) {
    response = { type: 'ERROR', id: message.id, message: (error as Error).message };
  }
  self.postMessage(response);
};
