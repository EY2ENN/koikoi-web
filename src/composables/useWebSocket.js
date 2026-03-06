// WebSocket 连接管理
import { ref, onUnmounted } from 'vue'

// 生产环境替换为实际域名，如 wss://yourdomain.com
const SERVER_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

export function useWebSocket(onMessage) {
  const status = ref('disconnected') // disconnected | connecting | connected | error
  let ws = null
  let pingTimer = null

  function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) return
    status.value = 'connecting'
    ws = new WebSocket(SERVER_URL)

    ws.onopen = () => {
      status.value = 'connected'
      pingTimer = setInterval(() => send({ type: 'PING' }), 25000)
    }
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        onMessage(msg)
      } catch {}
    }
    ws.onerror = () => { status.value = 'error' }
    ws.onclose = () => {
      status.value = 'disconnected'
      clearInterval(pingTimer)
      pingTimer = null
    }
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  function disconnect() {
    clearInterval(pingTimer)
    pingTimer = null
    ws?.close()
    ws = null
    status.value = 'disconnected'
  }

  onUnmounted(disconnect)

  return { status, connect, send, disconnect }
}
