<template>
  <div class="lobby-container">
    <div class="logo">🎴</div>
    <h1 class="title">花札 <span>来来</span></h1>
    <p class="subtitle">Koi-Koi Web Client</p>

    <div class="lobby-card">
      <div v-if="phase === 'lobby'" class="lobby-actions">
        <button class="btn btn-primary btn-large" @click="$emit('create')">
          <span class="icon">✨</span> 创建房间
        </button>
        
        <div class="divider">
          <span>或</span>
        </div>

        <div class="join-section">
          <input 
            type="text" 
            v-model="joinCode" 
            placeholder="输入4-6位房间号" 
            class="input-code"
            maxlength="6"
            @keyup.enter="handleJoin"
          />
          <button class="btn btn-secondary" @click="handleJoin" :disabled="!joinCode.trim()">
            加入房间
          </button>
        </div>
      </div>

      <div v-else-if="phase === 'waiting'" class="waiting-area">
        <div class="spinner"></div>
        <h2 class="room-display">房间号：<span class="highlight">{{ roomCode }}</span></h2>
        <p class="waiting-text">等待好友加入...</p>
        <button class="btn btn-ghost" @click="$emit('cancel')">取消</button>
      </div>
    </div>

    <!-- Error/Status Message -->
    <transition name="fade">
      <div class="message-toast" v-if="message && phase !== 'playing'">
        {{ message }}
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useGame } from '../composables/useGame'

const props = defineProps({
  phase: String,
  roomCode: String,
  message: String
})

const emit = defineEmits(['create', 'join', 'cancel'])

const joinCode = ref('')
const { preloadAssets } = useGame()

onMounted(() => {
  preloadAssets()
})

function handleJoin() {
  if (joinCode.value.trim()) {
    emit('join', joinCode.value.trim())
  }
}
</script>

<style scoped>
.lobby-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 24px;
  background: radial-gradient(circle at top, #1a2235 0%, #0a0f1a 100%);
  color: white;
  text-align: center;
}

.logo {
  font-size: 64px;
  margin-bottom: 8px;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
}

.title {
  font-size: 42px;
  font-weight: 800;
  margin: 0;
  letter-spacing: 2px;
}

.title span {
  color: #FF5555;
}

.subtitle {
  color: #8892b0;
  margin-top: 4px;
  margin-bottom: 48px;
  font-size: 16px;
  letter-spacing: 1px;
}

.lobby-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 32px 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 16px 32px rgba(0,0,0,0.3);
}

.lobby-actions {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.btn {
  border-radius: 8px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:active {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #FF5555 0%, #CC0000 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 85, 85, 0.4);
}

.btn-primary:hover {
  box-shadow: 0 6px 16px rgba(255, 85, 85, 0.6);
  transform: translateY(-2px);
}

.btn-large {
  font-size: 18px;
  padding: 16px 24px;
}

.divider {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 14px;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.1);
}

.divider span {
  padding: 0 16px;
}

.join-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-code {
  background: rgba(0,0,0,0.2);
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
  padding: 14px;
  border-radius: 8px;
  font-size: 20px;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 4px;
  outline: none;
  transition: border-color 0.2s;
}

.input-code:focus {
  border-color: #00FFFF;
  box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
}

.btn-secondary {
  background: rgba(255,255,255,0.1);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255,255,255,0.2);
}

.waiting-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.1);
  border-left-color: #00FFFF;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.room-display {
  font-size: 20px;
  margin: 0;
  color: #ccc;
}

.highlight {
  color: #00FFFF;
  font-size: 32px;
  font-weight: bold;
  letter-spacing: 2px;
  display: block;
  margin-top: 8px;
}

.waiting-text {
  color: #8892b0;
}

.btn-ghost {
  background: transparent;
  color: #8892b0;
  text-decoration: underline;
  padding: 8px;
  margin-top: 16px;
}

.btn-ghost:hover {
  color: white;
}

.message-toast {
  position: fixed;
  bottom: 32px;
  background: rgba(0,0,0,0.8);
  color: #FFD700;
  padding: 12px 24px;
  border-radius: 20px;
  font-size: 14px;
  pointer-events: none;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
