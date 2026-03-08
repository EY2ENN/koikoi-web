// WebSocket 连接管理
// Fix 13.1: 加入发送队列，connect() 后 onopen 才 flush
// Fix 13.5: 自动重连 + JSON 解析错误日志 + 连接状态反馈
import { ref, onUnmounted } from 'vue'

const SERVER_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080'

export function useWebSocket(onMessage) {
  const status = ref('disconnected') // disconnected | connecting | connected | error
  let ws = null
  let pingTimer = null
  let reconnectTimer = null
  let intentionalClose = false

  // 13.1: 消息队列 —— connect() 后的 send() 先入队，onopen 后统一 flush
  const pendingQueue = []

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    intentionalClose = false
    status.value = 'connecting'
    ws = new WebSocket(SERVER_URL)

    ws.onopen = () => {
      status.value = 'connected'
      // flush 队列中的待发消息
      while (pendingQueue.length > 0) {
        const msg = pendingQueue.shift()
        ws.send(JSON.stringify(msg))
      }
      pingTimer = setInterval(() => send({ type: 'PING' }), 25000)
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        onMessage(msg)
      } catch (err) {
        console.warn('[WS] JSON parse error:', err, e.data)
      }
    }

    ws.onerror = (err) => {
      console.error('[WS] error:', err)
      status.value = 'error'
    }

    ws.onclose = () => {
      clearInterval(pingTimer)
      pingTimer = null
      status.value = 'disconnected'

      // 13.5: 自动重连（非主动断开时）
      if (!intentionalClose) {
        reconnectTimer = setTimeout(() => {
          console.log('[WS] 尝试自动重连…')
          connect()
        }, 3000)
      }
    }
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    } else {
      // 13.1: 连接尚未建立，入队等待
      pendingQueue.push(msg)
    }
  }

  function disconnect() {
    intentionalClose = true
    clearInterval(pingTimer)
    clearTimeout(reconnectTimer)
    pingTimer = null
    reconnectTimer = null
    pendingQueue.length = 0
    ws?.close()
    ws = null
    status.value = 'disconnected'
  }

  onUnmounted(disconnect)

  return { status, connect, send, disconnect }
}
