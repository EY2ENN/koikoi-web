<template>
  <div class="app-container">
    <Lobby 
      v-if="phase === 'lobby' || phase === 'waiting'"
      :phase="phase"
      :roomCode="roomCode"
      :message="message"
      @create="createRoom"
      @join="joinRoom"
      @cancel="backToLobby"
    />

    <div v-else class="game-board">
      <!-- Opponent Area -->
      <div class="player-area opponent-area">
        <Hand 
          :count="oppHandCount" 
          :isOpponent="true" 
        />
        <Captures 
          :captures="oppCaptures" 
          :isOpponent="true"
          :currentScore="totalScores[1 - myPlayerIndex]"
        />
      </div>

      <!-- Center Field -->
      <Field 
        :fieldCards="field"
        :drawPileCount="drawPileCount"
        :drawnCard="drawnCard"
        :matchCandidates="matchCandidates"
        @selectField="selectFieldCard"
      />

      <!-- Notification / Banner Layer -->
      <div class="notifications">
        <transition name="toast">
          <div v-if="message && !showKoiKoiDecision && !showRoundResult && !showGameOver" class="status-toast">
            {{ message }}
          </div>
        </transition>

        <transition name="pop">
          <div v-if="showYakuBanner" class="yaku-banner">
            <h2>🎉 役成立！</h2>
            <div class="yaku-tags">
              <span v-for="y in newYaku" :key="y.yaku">{{ y.name }} ({{ y.points }}文)</span>
            </div>
          </div>
        </transition>
      </div>

      <!-- Action Modals (Koi Koi Decision, Round Result, Game Over) -->
      <transition name="fade">
        <div v-if="showKoiKoiDecision && isMyTurn" class="modal-overlay">
          <div class="modal-content koi-koi-modal">
            <h2>役成立！</h2>
            <p>你获得了新的役，要继续（来来）还是结算（停止）？</p>
            <div class="modal-actions">
              <button class="btn btn-warning" @click="chooseKoiKoi">来来 (Koi-Koi)</button>
              <button class="btn btn-primary" @click="chooseStop">停止 (Stop)</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="showRoundResult || showGameOver" class="modal-overlay">
          <div class="modal-content result-modal">
            <h2>{{ showGameOver ? '游戏结束' : '对局结束' }}</h2>
            <h3 class="winner-text" :class="{ 'text-win': roundWinner.includes('你') }">{{ roundWinner }}</h3>
            
            <div class="score-board">
              <div class="score-col">
                <span class="label">你 ({{ currentRound }}/{{ totalRounds }}局)</span>
                <span class="round-pts">+{{ roundScores[myPlayerIndex] }}</span>
                <span class="total-pts">总计: {{ totalScores[myPlayerIndex] }}</span>
              </div>
              <div class="score-col">
                <span class="label">对手</span>
                <span class="round-pts">+{{ roundScores[1 - myPlayerIndex] }}</span>
                <span class="total-pts">总计: {{ totalScores[1 - myPlayerIndex] }}</span>
              </div>
            </div>

            <div class="modal-actions" v-if="showGameOver || opponentLeft">
              <button class="btn btn-primary" @click="backToLobby">返回大厅</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="opponentLeft && !showGameOver && !showRoundResult" class="modal-overlay">
          <div class="modal-content">
            <h2>连接中断</h2>
            <p>对手已离开房间。</p>
            <button class="btn btn-primary" @click="backToLobby" style="margin-top: 16px;">返回大厅</button>
          </div>
        </div>
      </transition>

      <!-- My Area -->
      <div class="player-area my-area">
        <Captures 
          :captures="myCaptures" 
          :isOpponent="false"
          :currentScore="totalScores[myPlayerIndex]"
          :yakuNames="myCapturesYakuNames"
        />
        <Hand 
          :cards="myHand" 
          :isOpponent="false"
          :matchableIds="matchableIds"
          :selectedCard="selectedCard"
          @cardClick="playHandCard"
        />
        <div v-if="!isMyTurn && phase === 'playing'" class="turn-overlay">
          <span>对手回合...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGame } from './composables/useGame'
import Lobby from './components/Lobby.vue'
import Hand from './components/Hand.vue'
import Field from './components/Field.vue'
import Captures from './components/Captures.vue'

const {
  phase, roomCode, myPlayerIndex, message,
  field, myHand, oppHandCount, drawPileCount,
  myCaptures, oppCaptures, currentPlayer, gamePhase,
  matchCandidates, drawnCard,
  roundScores, totalScores, currentRound, totalRounds,
  selectedCard, newYaku, showYakuBanner,
  showRoundResult, showGameOver, roundWinner, opponentLeft,
  isMyTurn, matchableIds,
  createRoom, joinRoom, playHandCard, selectFieldCard,
  chooseKoiKoi, chooseStop, backToLobby
} = useGame()

const showKoiKoiDecision = computed(() => gamePhase.value === 'koiKoiDecision')

// Helper to deduce exact yaku tags for myself (since useGame just gives captures)
// Note: real calculation is backend, we just map rough names for frontend display if needed.
// Actually, simple frontend tag calculation is optional since the server sends `newYaku` which we flash.
// But to keep it persistent we could compute it or leave it empty in `yakuNames`.
const myCapturesYakuNames = computed(() => {
  // Simple check for basic tags if needed, or leave to backend
  return []
})
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-board {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  gap: 8px;
  height: 100vh;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
}

.player-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
}

.opponent-area {
  /* Opponent hand at top, captures below it */
}

.my-area {
  /* My captures above my hand */
}

.turn-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.4);
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  font-weight: bold;
  color: #aaa;
  font-size: 18px;
  letter-spacing: 2px;
  border-radius: 8px;
}

/* Notifications */
.notifications {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  z-index: 100;
}

.status-toast {
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.1);
}

.yaku-banner {
  background: linear-gradient(135deg, rgba(255,215,0,0.9) 0%, rgba(255,140,0,0.9) 100%);
  color: #111;
  padding: 16px 32px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  border: 2px solid white;
}

.yaku-banner h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
}

.yaku-tags {
  display: flex;
  gap: 8px;
  justify-content: center;
  font-weight: bold;
}

/* Modals */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6);
  backdrop-filter: var(--glass-blur);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}

.modal-content {
  background: var(--color-bg-panel);
  backdrop-filter: var(--glass-blur);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 24px;
  border-radius: 16px;
  text-align: center;
  max-width: 90%;
  width: 320px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.7);
}

.modal-content h2 {
  color: white;
  margin-top: 0;
  margin-bottom: 8px;
}

.modal-content p {
  color: #aaa;
  margin-bottom: 24px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 16px;
  flex: 1;
}

.btn-primary {
  background: #2a3b5c;
  color: white;
}
.btn-primary:active { background: #1a2a4c; }

.btn-warning {
  background: #ff5555;
  color: white;
}
.btn-warning:active { background: #cc0000; }

.result-modal {
  width: 360px;
}

.winner-text {
  font-size: 28px;
  margin-bottom: 24px;
  color: #aaa;
}
.winner-text.text-win {
  color: #FFD700;
}

.score-board {
  display: flex;
  justify-content: space-around;
  margin-bottom: 24px;
  background: rgba(0,0,0,0.3);
  padding: 16px;
  border-radius: 12px;
}

.score-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.score-col .label {
  color: #888;
  font-size: 12px;
}
.score-col .round-pts {
  color: #00FFFF;
  font-size: 24px;
  font-weight: bold;
}
.score-col .total-pts {
  color: white;
  font-size: 14px;
}

/* Transitions */
.toast-enter-active, .toast-leave-active,
.fade-enter-active, .fade-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from, .toast-leave-to,
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.pop-enter-active {
  animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pop-leave-active {
  transition: all 0.3s ease;
  opacity: 0;
  transform: scale(0.8);
}
@keyframes pop-in {
  0% { opacity: 0; transform: scale(0.5) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
