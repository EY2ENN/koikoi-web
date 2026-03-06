<template>
  <div 
    class="hanafuda-card" 
    :class="{ 
      matchable: isMatchable, 
      selected: isSelected, 
      disabled: isDisabled,
      facedown: isFaceDown 
    }"
    @click="$emit('click', card)"
  >
    <div class="card-inner">
      <div class="card-front" v-if="!isFaceDown">
        <img :src="imagePath" :alt="card?.label || 'Hanafuda Card'" @error="handleImageError" />
      </div>
      <div class="card-back" v-else>
        <!-- A simple pattern for the back of the card -->
        <div class="back-pattern"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: {
    type: Object,
    default: null
  },
  isMatchable: {
    type: Boolean,
    default: false
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isDisabled: {
    type: Boolean,
    default: false
  },
  isFaceDown: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const imagePath = computed(() => {
  if (!props.card || props.isFaceDown) return ''
  // 按照预先下载的ID映射
  return `/cards/${props.card.id}.svg`
})

function handleImageError(e) {
  // If image fails to load, fallback to a colored div with emoji
  e.target.style.display = 'none'
  e.target.parentElement.classList.add('fallback-bg')
  e.target.parentElement.innerHTML = `<div class="fallback-emoji">${props.card?.emoji || '🎴'}</div>`
}
</script>

<style scoped>
.hanafuda-card {
  width: 48px;
  height: 76px;
  border-radius: 4px;
  perspective: 1000px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: var(--shadow-card);
  position: relative;
  margin: 2px;
  flex-shrink: 0;
  transform-style: preserve-3d;
}

@media (min-width: 375px) {
  .hanafuda-card {
    width: 60px;
    height: 95px;
  }
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  background: #fdfbf7;
  overflow: hidden;
  border: 1px solid #333;
}

.card-front, .card-back {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-front img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2px;
}

.fallback-bg {
  background: #e8e6e1;
}

.fallback-emoji {
  font-size: 24px;
}

.card-back {
  background-color: #8b0000; /* Traditional red/black back */
  border: 3px solid #1a1a1a;
}

.back-pattern {
  width: 100%;
  height: 100%;
  background-color: #8b0000;
  background-image: radial-gradient(#6b0000 15%, transparent 16%), 
                    radial-gradient(#6b0000 15%, transparent 16%);
  background-size: 8px 8px;
  background-position: 0 0, 4px 4px;
}

/* 状态样式 (States based on 界面流程交互.md) */

/* 2. 待匹配状态 (Matchable) */
.hanafuda-card.matchable {
  transform: translateY(-8px) rotateX(10deg);
  box-shadow: var(--shadow-glow), 0 0 0 2px var(--color-gold);
  z-index: 10;
  filter: brightness(1.1);
  animation: pulse-glow 2s infinite ease-in-out;
}

/* 3. 选中态 (Selected) */
.hanafuda-card.selected {
  transform: translateY(-12px) scale(1.05) rotateX(5deg);
  box-shadow: var(--shadow-select), 0 0 0 3px var(--color-accent);
  z-index: 20;
}

/* 不可匹配的牌灰显 (Disabled/Grayed out) */
.hanafuda-card.disabled {
  filter: grayscale(100%) brightness(0.5);
  transform: translateY(0);
  box-shadow: none;
  pointer-events: none;
  opacity: 0.6;
}

@keyframes pulse-glow {
  0% { box-shadow: var(--shadow-glow), 0 0 0 2px var(--color-gold); filter: brightness(1.1); }
  50% { box-shadow: 0 4px 20px rgba(255, 215, 0, 0.8), 0 0 0 2px #fff; filter: brightness(1.3); }
  100% { box-shadow: var(--shadow-glow), 0 0 0 2px var(--color-gold); filter: brightness(1.1); }
}
</style>
