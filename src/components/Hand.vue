<template>
  <div class="hand-container">
    <TransitionGroup name="card-list" tag="div" class="hand-row">
      <Card 
        v-for="card in cards" 
        :key="card.id"
        :card="card"
        :isMatchable="matchableIds.has(card.id)"
        :isSelected="selectedCard?.id === card.id"
        :isDisabled="isAnyCardSelected && selectedCard?.id !== card.id"
        @click="$emit('cardClick', card)"
      />
      <!-- If opponent's hand, render facedown cards instead based on count -->
      <template v-if="isOpponent">
        <Card 
          v-for="i in count" 
          :key="'opp-'+i" 
          :isFaceDown="true"
        />
      </template>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Card from './Card.vue'

const props = defineProps({
  cards: {
    type: Array,
    default: () => []
  },
  count: {
    type: Number,
    default: 0
  },
  isOpponent: {
    type: Boolean,
    default: false
  },
  matchableIds: {
    type: Set,
    default: () => new Set()
  },
  selectedCard: {
    type: Object,
    default: null
  }
})

defineEmits(['cardClick'])

const isAnyCardSelected = computed(() => props.selectedCard !== null)
</script>

<style scoped>
.hand-container {
  width: 100%;
  padding: 8px;
  overflow-x: auto;
  /* hide scrollbar but allow scroll */
  -ms-overflow-style: none;  
  scrollbar-width: none;  
}

.hand-container::-webkit-scrollbar { 
  display: none; 
}

.hand-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 4px;
  min-width: min-content;
  position: relative;
}

/* FLIP Animations */
.card-list-move, /* apply transition to moving elements */
.card-list-enter-active,
.card-list-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.card-list-enter-from,
.card-list-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.8);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.card-list-leave-active {
  position: absolute;
}
</style>
