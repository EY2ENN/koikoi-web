// 游戏状态管理
import { ref, shallowRef, computed } from 'vue'
import { useWebSocket } from './useWebSocket'

export function useGame() {
  // 网络
  const phase = ref('lobby') // lobby | waiting | playing | roundResult | gameOver
  const roomCode = ref('')
  const myPlayerIndex = ref(0)
  const message = ref('')

  // 游戏状态（服务端权威）
  const field = shallowRef([])
  const myHand = shallowRef([])
  const oppHandCount = ref(0)
  const drawPileCount = ref(0)
  const myCaptures = shallowRef([])
  const oppCaptures = shallowRef([])
  const currentPlayer = ref(0)
  const gamePhase = ref('selectHandCard')
  const matchCandidates = shallowRef([])
  const drawnCard = shallowRef(null)
  const koiCalled = ref([false, false])
  const roundScores = ref([0, 0])
  const totalScores = ref([0, 0])
  const currentRound = ref(1)
  const totalRounds = ref(12)

  // UI 状态
  const selectedCard = shallowRef(null)
  const newYaku = ref([])
  const showYakuBanner = ref(false)
  const showRoundResult = ref(false)
  const showGameOver = ref(false)
  const roundWinner = ref('')
  const opponentLeft = ref(false)

  const isMyTurn = computed(() => currentPlayer.value === myPlayerIndex.value)

  // matchable：我的回合 & selectHandCard 阶段，手牌在场上有对应月份
  const matchableIds = computed(() => {
    if (!isMyTurn.value || gamePhase.value !== 'selectHandCard') return new Set()
    const fieldMonths = new Set(field.value.map(c => c.month))
    return new Set(myHand.value.filter(c => fieldMonths.has(c.month)).map(c => c.id))
  })

  function handleMsg(msg) {
    switch (msg.type) {
      case 'ROOM_CREATED':
        roomCode.value = msg.roomCode
        phase.value = 'waiting'
        message.value = `房间码：${msg.roomCode}，等待好友加入…`
        break

      case 'ROOM_JOINED':
        myPlayerIndex.value = msg.playerIndex ?? 0
        roomCode.value = msg.roomCode
        message.value = '已加入房间，等待游戏开始…'
        break

      case 'GAME_START':
        phase.value = 'playing'
        applyState(msg)
        break

      case 'GAME_STATE':
        applyState(msg)
        break

      case 'YAKU_FORMED':
        // Haptic feedback for major event
        if (navigator.vibrate) navigator.vibrate([100, 50, 100])
        newYaku.value = msg.newYaku ?? []
        showYakuBanner.value = true
        setTimeout(() => { showYakuBanner.value = false }, 2500)
        break

      case 'ROUND_RESULT': {
        const w = msg.winner ?? -1
        if (w === -1) roundWinner.value = '平局'
        else if (w === myPlayerIndex.value) {
          roundWinner.value = (msg.label === '手四' || msg.label === '食付')
            ? `你（${msg.label}）` : '你赢得本局！'
        } else {
          roundWinner.value = (msg.label === '手四' || msg.label === '食付')
            ? `对手（${msg.label}）` : '对手赢得本局'
        }
        roundScores.value = msg.roundScores ?? [0, 0]
        totalScores.value = msg.totalScores ?? [0, 0]
        showRoundResult.value = true
        break
      }

      case 'GAME_OVER': {
        const w = msg.winner ?? -1
        roundWinner.value = w === -1 ? '平局' : w === myPlayerIndex.value ? '你赢了！🎉' : '对手获胜'
        totalScores.value = msg.totalScores ?? totalScores.value
        showRoundResult.value = false
        showGameOver.value = true
        break
      }

      case 'OPPONENT_LEFT':
        opponentLeft.value = true
        message.value = '对手已离开'
        break

      case 'ERROR':
        message.value = msg.message ?? '未知错误'
        break
    }
  }

  function applyState(s) {
    const pi = s.playerIndex ?? myPlayerIndex.value
    field.value = s.field ?? []
    myHand.value = (s.hands?.[pi]?.cards) ?? []
    oppHandCount.value = s.hands?.[1 - pi]?.count ?? 0
    drawPileCount.value = s.drawPileCount ?? 0
    myCaptures.value = s.captures?.[pi] ?? []
    oppCaptures.value = s.captures?.[1 - pi] ?? []
    currentPlayer.value = s.currentPlayer ?? 0
    gamePhase.value = s.phase ?? 'selectHandCard'
    matchCandidates.value = s.matchCandidates ?? []
    drawnCard.value = s.drawnCard ?? null
    koiCalled.value = s.koiCalled ?? [false, false]
    roundScores.value = s.roundScores ?? [0, 0]
    totalScores.value = s.totalScores ?? [0, 0]
    currentRound.value = s.round ?? 1
    totalRounds.value = s.totalRounds ?? 12
    selectedCard.value = null

    if (gamePhase.value === 'koiKoiDecision' && isMyTurn.value) {
      message.value = '役成立！选择：来来继续 or 停止获分'
    } else {
      message.value = isMyTurn.value ? '你的回合 — 选择手牌出牌' : '对手回合…'
    }
  }

  const { status, connect, send, disconnect } = useWebSocket(handleMsg)

  function preloadAssets() {
    // Only run if in browser and not already preloaded
    if (typeof window === 'undefined' || window.__KOIKOI_PRELOADED) return
    window.__KOIKOI_PRELOADED = true

    requestIdleCallback(() => {
      // Preload all 48 cards
      for (let i = 0; i < 48; i++) {
        const img = new Image()
        img.src = `/cards/${i}.svg`
      }
    })
  }

  function createRoom() {
    connect()
    send({ type: 'CREATE_ROOM' })
    message.value = '正在创建房间…'
  }

  function joinRoom(code) {
    connect()
    send({ type: 'JOIN_ROOM', roomCode: code.toUpperCase() })
    message.value = `正在加入房间 ${code.toUpperCase()}…`
  }

  function playHandCard(card) {
    if (!isMyTurn.value || gamePhase.value !== 'selectHandCard') return
    if (navigator.vibrate) navigator.vibrate(15) // Light haptic tap
    selectedCard.value = card
    send({ type: 'PLAY_HAND_CARD', cardId: card.id })
  }

  function selectFieldCard(card) {
    if (!isMyTurn.value) return
    if (gamePhase.value !== 'selectFieldMatch' && gamePhase.value !== 'drawPhase') return
    if (navigator.vibrate) navigator.vibrate(25) // Slightly heavier tap for match confirmation
    send({ type: 'SELECT_FIELD_CARD', cardId: card.id })
    selectedCard.value = null
  }

  function chooseKoiKoi() {
    send({ type: 'KOI_KOI_DECISION', callKoi: true })
    showRoundResult.value = false
  }

  function chooseStop() {
    send({ type: 'KOI_KOI_DECISION', callKoi: false })
  }

  function backToLobby() {
    disconnect()
    phase.value = 'lobby'
    showGameOver.value = false
    showRoundResult.value = false
    opponentLeft.value = false
    selectedCard.value = null
  }

  return {
    // state
    status, phase, roomCode, myPlayerIndex, message,
    field, myHand, oppHandCount, drawPileCount,
    myCaptures, oppCaptures, currentPlayer, gamePhase,
    matchCandidates, drawnCard, koiCalled,
    roundScores, totalScores, currentRound, totalRounds,
    selectedCard, newYaku, showYakuBanner,
    showRoundResult, showGameOver, roundWinner, opponentLeft,
    // computed
    isMyTurn, matchableIds,
    // actions
    createRoom, joinRoom, playHandCard, selectFieldCard,
    chooseKoiKoi, chooseStop, backToLobby, preloadAssets
  }
}
