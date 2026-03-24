// Vite Web Worker import — ?worker suffix tells Vite to bundle as Worker
import AIWorker from './worker?worker'

let instance: Worker | null = null

export function getAIWorker(): Worker {
  if (!instance) {
    instance = new AIWorker()
  }
  return instance
}

export function terminateAIWorker(): void {
  instance?.terminate()
  instance = null
}
