<template>
  <div class="captures-container" :class="{ opponent: isOpponent }">
    <div class="capture-header">
      <div class="player-info">
        <span class="icon">{{ isOpponent ? '🧑‍💻' : '👤' }}</span>
        <span class="score">{{ currentScore }} 文</span>
      </div>
      <div class="yaku-list" v-if="yakuNames.length > 0">
        <span v-for="name in yakuNames" :key="name" class="yaku-tag">{{ name }}</span>
      </div>
    </div>
    
    <div class="capture-groups">
      <!-- 1. 光牌 (Hikari) -->
      <div class="capture-group" v-if="hikari.length > 0">
        <div class="group-label">光</div>
        <TransitionGroup name="card-list" tag="div" class="capture-cards">
          <Card v-for="card in hikari" :key="card.id" :card="card" />
        </TransitionGroup>
      </div>
      
      <!-- 2. 种牌 (Tane) -->
      <div class="capture-group" v-if="tane.length > 0">
        <div class="group-label">種</div>
        <TransitionGroup name="card-list" tag="div" class="capture-cards">
          <Card v-for="card in tane" :key="card.id" :card="card" />
        </TransitionGroup>
      </div>
      
      <!-- 3. 短册 (Tanzaku) -->
      <div class="capture-group" v-if="tanzaku.length > 0">
        <div class="group-label">短</div>
        <TransitionGroup name="card-list" tag="div" class="capture-cards">
          <Card v-for="card in tanzaku" :key="card.id" :card="card" />
        </TransitionGroup>
      </div>
      
      <!-- 4. 粕 (Kasu) -->
      <div class="capture-group" v-if="kasu.length > 0">
        <div class="group-label">粕</div>
        <TransitionGroup name="card-list" tag="div" class="capture-cards">
          <Card v-for="card in kasu" :key="card.id" :card="card" />
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Card from './Card.vue'

const props = defineProps({
  captures: {
    type: Array,
    default: () => []
  },
  isOpponent: {
    type: Boolean,
    default: false
  },
  currentScore: {
    type: Number,
    default: 0
  },
  yakuNames: {
    type: Array,
    default: () => []
  }
})

// 分组逻辑 (按照界面流程交互.md)
const hikari = computed(() => props.captures.filter(c => c.type === 'hikari'))
const tane = computed(() => props.captures.filter(c => c.type === 'tane'))
const tanzaku = computed(() => props.captures.filter(c => c.type === 'tanzaku'))
const kasu = computed(() => props.captures.filter(c => c.type === 'kasu'))
</script>

<style scoped>
.captures-container {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-panel);
  backdrop-filter: var(--glass-blur);
  border-radius: 8px;
  padding: 8px;
  width: 100%;
  border-left: 3px solid var(--color-accent);
  font-size: 14px;
}

.captures-container.opponent {
  border-left-color: var(--color-primary);
  background: rgba(50, 40, 40, 0.4);
}

.capture-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 4px;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  color: #DDD;
}

.score {
  color: #FFD700;
  font-size: 16px;
  text-shadow: 0 0 5px rgba(255,215,0,0.5);
}

.yaku-list {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.yaku-tag {
  background: rgba(255, 215, 0, 0.2);
  color: #FFD700;
  border: 1px solid rgba(255, 215, 0, 0.5);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  white-space: nowrap;
}

.capture-groups {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.capture-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  background: rgba(0,0,0,0.3);
  border-radius: 4px;
  overflow-x: auto;
  /* hide scrollbar */
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.capture-group::-webkit-scrollbar { 
  display: none; 
}

.group-label {
  padding: 4px 8px;
  font-size: 10px;
  font-weight: bold;
  color: #aaa;
  writing-mode: vertical-rl;
  text-orientation: upright;
  letter-spacing: 2px;
  background: rgba(255,255,255,0.05);
  height: 100%;
}

.capture-cards {
  display: flex;
  padding: 4px;
  gap: -24px; /* overlap cards to save space */
  position: relative;
}

/* 覆盖 Card 组件尺寸，吃下的牌更小 */
:deep(.hanafuda-card) {
  width: 32px;
  height: 50px;
  margin-right: -16px; /* overlap */
}

:deep(.hanafuda-card:last-child) {
  margin-right: 2px;
}

/* FLIP Animations for Capture Groups */
.card-list-move,
.card-list-enter-active,
.card-list-leave-active {
  transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.card-list-enter-from,
.card-list-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(0.5);
}

.card-list-leave-active {
  position: absolute;
}

@media (min-height: 700px) {
  .capture-groups {
    max-height: 150px;
  }
  :deep(.hanafuda-card) {
    width: 36px;
    height: 57px;
    margin-right: -18px;
  }
}
</style>
