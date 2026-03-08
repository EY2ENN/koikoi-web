// 游戏状态管理 — 单例 store（Fix 13.3）
// Fix 13.2: ROOM_JOINED 后正确设置 phase = 'waiting'
// Fix 13.4: requestIdleCallback 降级
// Fix 13.6: 持久 yakuNames 累积
// Fix 13.7: koiCalled 通过 return 暴露给 UI
// Fix 13.8: phase 注释与实际逻辑对齐
// Fix 13.9: backToLobby 完整清空游戏数据
import { ref, shallowRef, computed } from 'vue'
import { useWebSocket } from './useWebSocket'

// ===== 单例缓存 =====
let _instance = null

export function useGame() {
  if (_instance) return _instance

  // 网络/大厅状态
  // phase 实际只用于控制根视图：lobby -> waiting -> playing
  // 结算和终局通过 showRoundResult / showGameOver overlay flag 控制
  const phase = ref('lobby') // lobby | waiting | playing
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

  // 13.6: 持久累积的已达成役名列表
  const activeYakuNames = ref([])

  const isMyTurn = computed(() => currentPlayer.value === myPlayerIndex.value)

  // matchable：我的回合 & selectHandCard 阶段，手牌在场上有对应月份
  const matchableIds = computed(() => {
    if (!isMyTurn.value || gamePhase.value !== 'selectHandCard') return new Set()
    const fieldMonths = new Set(field.value.map(c => c.month))
    return new Set(myHand.value.filter(c => fieldMonths.has(c.month)).map(c => c.id))
  })

  // 13.7: 我方是否已经叫过来来
  const myKoiCalled = computed(() => koiCalled.value[myPlayerIndex.value])
  const oppKoiCalled = computed(() => koiCalled.value[1 - myPlayerIndex.value])

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
        // 13.2: 加入房间后也切换到等待界面
        phase.value = 'waiting'
        message.value = '已加入房间，等待游戏开始…'
        break

      case 'GAME_START':
        phase.value = 'playing'
        activeYakuNames.value = [] // 新局清空
        applyState(msg)
        break

      case 'GAME_STATE':
        applyState(msg)
        break

      case 'YAKU_FORMED':
        if (navigator.vibrate) navigator.vibrate([100, 50, 100])
        newYaku.value = msg.newYaku ?? []
        showYakuBanner.value = true
        // 13.6: 累积已达成的役名
        for (const y of (msg.newYaku ?? [])) {
          if (y.name && !activeYakuNames.value.includes(y.name)) {
            activeYakuNames.value = [...activeYakuNames.value, y.name]
          }
        }
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
        activeYakuNames.value = [] // 局结束清空
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

  // 13.4: requestIdleCallback 兼容降级
  const scheduleIdle = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (cb) => setTimeout(cb, 1)

  function preloadAssets() {
    if (typeof window === 'undefined' || window.__KOIKOI_PRELOADED) return
    window.__KOIKOI_PRELOADED = true
    scheduleIdle(() => {
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
    if (navigator.vibrate) navigator.vibrate(15)
    selectedCard.value = card
    send({ type: 'PLAY_HAND_CARD', cardId: card.id })
  }

  function selectFieldCard(card) {
    if (!isMyTurn.value) return
    if (gamePhase.value !== 'selectFieldMatch' && gamePhase.value !== 'drawPhase') return
    if (navigator.vibrate) navigator.vibrate(25)
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

  // 13.9: 返回大厅时完全清空所有游戏数据
  function backToLobby() {
    disconnect()
    phase.value = 'lobby'
    roomCode.value = ''
    myPlayerIndex.value = 0
    message.value = ''
    field.value = []
    myHand.value = []
    oppHandCount.value = 0
    drawPileCount.value = 0
    myCaptures.value = []
    oppCaptures.value = []
    currentPlayer.value = 0
    gamePhase.value = 'selectHandCard'
    matchCandidates.value = []
    drawnCard.value = null
    koiCalled.value = [false, false]
    roundScores.value = [0, 0]
    totalScores.value = [0, 0]
    currentRound.value = 1
    totalRounds.value = 12
    selectedCard.value = null
    newYaku.value = []
    showYakuBanner.value = false
    showRoundResult.value = false
    showGameOver.value = false
    roundWinner.value = ''
    opponentLeft.value = false
    activeYakuNames.value = []
  }

  _instance = {
    // state
    status, phase, roomCode, myPlayerIndex, message,
    field, myHand, oppHandCount, drawPileCount,
    myCaptures, oppCaptures, currentPlayer, gamePhase,
    matchCandidates, drawnCard, koiCalled,
    roundScores, totalScores, currentRound, totalRounds,
    selectedCard, newYaku, showYakuBanner,
    showRoundResult, showGameOver, roundWinner, opponentLeft,
    activeYakuNames,
    // computed
    isMyTurn, matchableIds, myKoiCalled, oppKoiCalled,
    // actions
    createRoom, joinRoom, playHandCard, selectFieldCard,
    chooseKoiKoi, chooseStop, backToLobby, preloadAssets
  }
  return _instance
}
