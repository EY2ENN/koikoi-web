<template>
  <div class="field-container">
    <div class="field-grid">
      <!-- Top Row: first 4 cards -->
      <div class="field-row">
        <Card 
          v-for="card in topCards" 
          :key="card.id"
          :card="card"
          :isSelected="isMatchCandidate(card.id)"
          :isDisabled="isSelectionActive && !isMatchCandidate(card.id)"
          class="field-card"
          @click="$emit('selectField', card)"
        />
        <!-- Fill empty slots if less than 4 -->
        <div class="empty-slot" v-for="i in Math.max(0, 4 - topCards.length)" :key="'et'+i"></div>
      </div>
      
      <!-- Middle Row: Deck/Draw Pile -->
      <div class="field-center">
        <div class="deck-area">
          <div class="deck-count">{{ drawPileCount }}</div>
          <Card :isFaceDown="true" v-if="drawPileCount > 0" class="deck-card" />
        </div>
        <!-- Animation slot for drawn card -->
        <div class="drawn-area">
          <transition name="draw-anim">
            <Card 
              v-if="drawnCard" 
              :card="drawnCard" 
              class="drawn-card"
            />
          </transition>
        </div>
      </div>

      <!-- Bottom Row: next 4 cards (or more if they overflowed, but usually 8 field max until things pair) -->
      <div class="field-row">
        <Card 
          v-for="card in bottomCards" 
          :key="card.id"
          :card="card"
          :isSelected="isMatchCandidate(card.id)"
          :isDisabled="isSelectionActive && !isMatchCandidate(card.id)"
          class="field-card"
          @click="$emit('selectField', card)"
        />
        <!-- Fill empty slots if needed -->
        <div class="empty-slot" v-for="i in Math.max(0, 4 - bottomCards.length)" :key="'eb'+i"></div>
      </div>
      
      <!-- Extra rows if field somehow exceeds 8 cards (very rare but possible if NO matches happen repeatedly) -->
      <div class="field-row" v-if="extraCards.length > 0">
        <Card 
          v-for="card in extraCards" 
          :key="card.id"
          :card="card"
          :isSelected="isMatchCandidate(card.id)"
          :isDisabled="isSelectionActive && !isMatchCandidate(card.id)"
          class="field-card"
          @click="$emit('selectField', card)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Card from './Card.vue'

const props = defineProps({
  fieldCards: {
    type: Array,
    default: () => []
  },
  drawPileCount: {
    type: Number,
    default: 0
  },
  drawnCard: {
    type: Object,
    default: null
  },
  matchCandidates: {
    type: Array,
    default: () => []
  }
})

defineEmits(['selectField'])

const topCards = computed(() => props.fieldCards.slice(0, 4))
const bottomCards = computed(() => props.fieldCards.slice(4, 8))
const extraCards = computed(() => props.fieldCards.slice(8))

const isSelectionActive = computed(() => props.matchCandidates.length > 0)
const matchCandidateIds = computed(() => new Set(props.matchCandidates.map(c => c.id)))

function isMatchCandidate(id) {
  return matchCandidateIds.value.has(id)
}
</script>

<style scoped>
.field-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 10px;
  background: var(--color-baize); /* Dark green baize feel */
  backdrop-filter: var(--glass-blur);
  border-radius: 8px;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
}

.field-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 400px;
}

.field-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.field-center {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 32px;
  height: 100px;
}

.deck-area {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.deck-card {
  box-shadow: 2px 2px 0 #444, 4px 4px 0 #555, 6px 6px 0 #666;
}

.deck-count {
  position: absolute;
  top: -12px;
  right: -12px;
  background: rgba(0,0,0,0.8);
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  z-index: 10;
  border: 1px solid #666;
}

.drawn-area {
  width: 60px; /* same width as card to prevent layout shift */
  display: flex;
  justify-content: center;
}

.drawn-card {
  /* give it a special glow to show it just arrived */
  box-shadow: 0 0 15px 5px rgba(255, 255, 255, 0.5);
  animation: pulse-draw 1.5s infinite;
}

.empty-slot {
  width: 48px;
  height: 76px;
  border: 2px dashed rgba(255,255,255,0.2);
  border-radius: 4px;
}

@media (min-width: 375px) {
  .empty-slot {
    width: 60px;
    height: 95px;
  }
}

/* 动效展示抽牌过程 (Animation for Drawn Card) */
.draw-anim-enter-active {
  transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.draw-anim-leave-active {
  transition: all 0.3s ease-in;
}
.draw-anim-enter-from {
  opacity: 0;
  transform: translateX(-40px) scale(0.5) rotate(-15deg);
}
.draw-anim-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

@keyframes pulse-draw {
  0% { box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.4); }
  50% { box-shadow: 0 0 20px 8px rgba(255, 255, 255, 0.7); }
  100% { box-shadow: 0 0 10px 2px rgba(255, 255, 255, 0.4); }
}
</style>
