"use client";
import { useState, useRef, useEffect, useCallback } from "react";

// ===================== GAME DATA =====================

const INITIAL_STATE = {
  rulerName: "유비",
  gold: 10000,
  food: 20000,
  totalTroops: 8000,
  popularity: 65,
  currentTurn: 1,
  currentSeason: "봄",
  cities: [
    { cityName: "신야", population: 50000, defense: 40, commerce: 55, agriculture: 60, garrison: 5000, governor: "제갈량" },
    { cityName: "하비", population: 35000, defense: 30, commerce: 45, agriculture: 70, garrison: 3000, governor: "미축" },
  ],
  generals: [
    { generalName: "제갈량", warfare: 35, intelligence: 100, leadership: 92, politics: 95, charm: 92, loyalty: 100, currentTask: "참모", location: "신야" },
    { generalName: "관우", warfare: 97, intelligence: 75, leadership: 90, politics: 62, charm: 80, loyalty: 100, currentTask: "순찰", location: "신야" },
    { generalName: "장비", warfare: 98, intelligence: 30, leadership: 55, politics: 20, charm: 45, loyalty: 100, currentTask: "훈련", location: "신야" },
    { generalName: "조운", warfare: 92, intelligence: 76, leadership: 88, politics: 70, charm: 82, loyalty: 95, currentTask: "대기", location: "하비" },
    { generalName: "미축", warfare: 25, intelligence: 35, leadership: 45, politics: 88, charm: 90, loyalty: 88, currentTask: "세금징수", location: "하비" },
  ],
  recentEvents: [],
  pendingTasks: [],
};

const SEASONS = ["봄", "여름", "가을", "겨울"];
const SEASON_ICON = { "봄": "🌸", "여름": "☀️", "가을": "🍂", "겨울": "❄️" };

const RANDOM_EVENTS = [
  { name: "조조 남침 경고", prompt: "첩보에 의하면 조조가 대군을 이끌고 남하할 준비를 하고 있습니다.", condition: (s) => s.currentTurn >= 3, prob: 0.3, priority: 5 },
  { name: "유랑민 유입", prompt: "전란을 피해 유랑민들이 우리 영토로 몰려오고 있습니다.", condition: (s) => s.popularity >= 50, prob: 0.35, priority: 3 },
  { name: "메뚜기떼 출현", prompt: "메뚜기떼가 농경지를 덮쳐 식량 피해가 우려됩니다.", condition: (s) => s.currentSeason === "여름", prob: 0.25, priority: 4 },
  { name: "상인 방문", prompt: "서역에서 온 상인단이 교역을 제안합니다.", condition: (s) => s.cities.some((c) => c.commerce >= 45), prob: 0.4, priority: 2 },
  { name: "장수 불만", prompt: "일부 장수들 사이에서 불만의 목소리가 들려옵니다.", condition: (s) => s.generals.some((g) => g.loyalty < 95), prob: 0.3, priority: 3 },
];

function buildSystemPrompt(gameState) {
  return `너는 삼국지 시대의 제갈량이다.
직책: 군사중랑장
성격: 신중하고 전략적이며, 항상 큰 그림을 보려 한다. 감정을 잘 드러내지 않지만 주공에 대한 충성심이 깊다. 적의 의도를 꿰뚫어보는 통찰력이 있으며, 위험을 미리 예측하여 대비책을 세운다.
말투: 공손하고 격식을 차린 존댓말을 사용한다. '주공'이라고 호칭한다. 비유와 고사를 들어 설명하는 것을 좋아한다. 중요한 조언을 할 때는 '소신의 생각으로는...'으로 시작한다.
전문 분야: 전략, 외교, 내정

현재 국가 상황:
${JSON.stringify(gameState, null, 2)}

=== 응답 규칙 ===
1. 반드시 아래 JSON 형식으로만 응답할 것. JSON 외의 텍스트를 절대 포함하지 마라.
2. dialogue에 캐릭터의 성격과 말투를 반영할 것. 300자 이내로 간결하게.
3. 플레이어가 조언을 구하거나, 보고 후 행동을 결정해야 할 때 choices 배열에 2~4개의 선택지를 제시할 것.
4. 일반 대화(인사, 질문 등)에는 choices를 null로 설정할 것.
5. 각 선택지에는 risk(위험도)와 preview(예상 결과)를 반드시 포함할 것.
6. 현재 게임 상태를 반영한 현실적인 조언을 할 것.

=== 응답 JSON 형식 ===
{
  "speaker": "제갈량",
  "dialogue": "대화 내용",
  "emotion": "calm | worried | excited | angry | thoughtful",
  "choices": null 또는 [{"id":"A","text":"설명","risk":"low|medium|high","preview":"예상결과"}],
  "state_changes": null
}`;
}

// ===================== COMPONENTS =====================

function StatusBar({ state, deltas }) {
  const stats = [
    { icon: "💰", label: "금", value: state.gold, delta: deltas.gold },
    { icon: "🌾", label: "식량", value: state.food, delta: deltas.food },
    { icon: "⚔️", label: "병력", value: state.totalTroops, delta: deltas.troops },
  ];

  return (
    <div style={{
      background: "linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)",
      borderBottom: "1px solid var(--border)",
      padding: "10px 16px 8px",
      position: "sticky",
      top: 0,
      zIndex: 10,
    }}>
      {/* Turn & Season */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "8px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: "16px",
            fontWeight: 900,
            color: "var(--gold)",
            letterSpacing: "2px",
          }}>
            第{state.currentTurn}턴
          </span>
          <span style={{ fontSize: "16px" }}>{SEASON_ICON[state.currentSeason]}</span>
          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{state.currentSeason}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>민심</span>
          <div style={{
            width: "80px",
            height: "6px",
            background: "rgba(255,255,255,0.06)",
            borderRadius: "3px",
            overflow: "hidden",
          }}>
            <div style={{
              width: `${state.popularity}%`,
              height: "100%",
              background: state.popularity > 60
                ? "var(--success)"
                : state.popularity > 30
                ? "var(--warning)"
                : "var(--danger)",
              borderRadius: "3px",
              transition: "width 0.6s ease",
            }} />
          </div>
          <span style={{
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--text-primary)",
            minWidth: "24px",
            textAlign: "right",
            position: "relative",
          }}>
            {state.popularity}
            {deltas.popularity !== 0 && (
              <span className="delta-anim" style={{ color: deltas.popularity > 0 ? "var(--success)" : "var(--danger)" }}>
                {deltas.popularity > 0 ? `+${deltas.popularity}` : deltas.popularity}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Resources */}
      <div style={{ display: "flex", gap: "6px" }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            position: "relative",
          }}>
            <span style={{ fontSize: "14px" }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", lineHeight: 1 }}>{s.label}</div>
              <div style={{ fontSize: "14px", fontWeight: 700, lineHeight: 1.3 }}>
                {s.value.toLocaleString()}
              </div>
            </div>
            {s.delta !== 0 && (
              <span className="delta-anim" style={{
                color: s.delta > 0 ? "var(--success)" : "var(--danger)",
                top: "2px",
                right: "6px",
              }}>
                {s.delta > 0 ? `+${s.delta.toLocaleString()}` : s.delta.toLocaleString()}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message, isTyping }) {
  const isPlayer = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <div style={{
        textAlign: "center",
        padding: "6px 16px",
        margin: "12px 0",
        animation: "fadeInUp 0.3s ease",
      }}>
        <span style={{
          background: "var(--gold-dim)",
          color: "var(--gold)",
          fontSize: "11px",
          padding: "4px 14px",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          letterSpacing: "0.5px",
        }}>
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: isPlayer ? "row-reverse" : "row",
      alignItems: "flex-end",
      gap: "8px",
      margin: "6px 14px",
      animation: "fadeInUp 0.3s ease",
    }}>
      {!isPlayer && (
        <div style={{
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1a1640, #2d1f4e)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          flexShrink: 0,
          border: "1.5px solid var(--gold-dim)",
        }}>
          🪶
        </div>
      )}
      <div style={{ maxWidth: "80%", minWidth: "40px" }}>
        {!isPlayer && (
          <div style={{
            fontSize: "10px",
            color: "var(--gold)",
            marginBottom: "3px",
            fontWeight: 500,
            letterSpacing: "1px",
          }}>
            제갈량
            {message.emotion && (
              <span style={{ marginLeft: "4px", opacity: 0.6 }}>
                {{ calm: "😌", worried: "😟", excited: "😄", angry: "😠", thoughtful: "🤔" }[message.emotion] || ""}
              </span>
            )}
          </div>
        )}
        <div style={{
          background: isPlayer
            ? "linear-gradient(135deg, var(--accent), #8b2020)"
            : "var(--bg-card)",
          color: "var(--text-primary)",
          padding: "10px 14px",
          borderRadius: isPlayer ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          fontSize: "13.5px",
          lineHeight: 1.65,
          border: isPlayer ? "none" : "1px solid var(--border)",
          wordBreak: "break-word",
        }}>
          {message.content}
          {isTyping && <span style={{ animation: "blink 1s infinite", color: "var(--gold)" }}>▊</span>}
        </div>
      </div>
    </div>
  );
}

function ChoicePanel({ choices, onSelect, disabled }) {
  if (!choices || choices.length === 0) return null;
  const riskStyle = {
    low: { bg: "rgba(74,140,92,0.15)", border: "var(--success)", color: "var(--success)", label: "안전" },
    medium: { bg: "var(--gold-dim)", border: "var(--gold)", color: "var(--gold)", label: "보통" },
    high: { bg: "rgba(212,68,62,0.15)", border: "var(--danger)", color: "var(--danger)", label: "위험" },
  };

  return (
    <div style={{
      padding: "12px 14px",
      background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-secondary) 100%)",
      borderTop: "1px solid var(--border)",
      animation: "fadeInUp 0.4s ease",
    }}>
      <div style={{
        fontSize: "11px",
        color: "var(--gold)",
        marginBottom: "8px",
        fontWeight: 700,
        letterSpacing: "1px",
      }}>
        ⚔ 진언 — 하나를 택하소서
      </div>
      {choices.map((choice, idx) => {
        const rs = riskStyle[choice.risk] || riskStyle.medium;
        return (
          <button
            key={choice.id}
            onClick={() => !disabled && onSelect(choice)}
            disabled={disabled}
            style={{
              width: "100%",
              textAlign: "left",
              background: disabled ? "rgba(255,255,255,0.02)" : rs.bg,
              border: `1px solid ${disabled ? "var(--border)" : rs.border}`,
              borderRadius: "10px",
              padding: "10px 12px",
              marginBottom: "6px",
              color: "var(--text-primary)",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.4 : 1,
              transition: "all 0.2s",
              animation: `slideIn 0.3s ease ${idx * 0.1}s both`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "13px" }}>
                <span style={{ color: rs.color, marginRight: "6px" }}>[{choice.id}]</span>
                {choice.text}
              </span>
              <span style={{
                fontSize: "10px",
                background: rs.bg,
                color: rs.color,
                padding: "2px 8px",
                borderRadius: "10px",
                fontWeight: 700,
                border: `1px solid ${rs.border}`,
                flexShrink: 0,
                marginLeft: "8px",
              }}>
                {rs.label}
              </span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px" }}>
              → {choice.preview}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TaskPanel({ tasks, show, onToggle }) {
  if (!show) return null;

  return (
    <div style={{
      position: "absolute",
      top: "90px",
      right: "12px",
      width: "240px",
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "12px",
      padding: "12px",
      zIndex: 20,
      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      animation: "fadeInUp 0.2s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "12px", letterSpacing: "1px" }}>📋 안건</span>
        <button onClick={onToggle} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "14px" }}>✕</button>
      </div>
      {tasks.length === 0 ? (
        <div style={{ color: "var(--text-dim)", fontSize: "12px", textAlign: "center", padding: "16px 0" }}>안건 없음</div>
      ) : tasks.map((task, i) => {
        const color = task.urgency >= 70 ? "var(--danger)" : task.urgency >= 40 ? "var(--warning)" : "var(--success)";
        return (
          <div key={i} style={{
            background: "rgba(255,255,255,0.03)",
            borderRadius: "6px",
            padding: "8px",
            marginBottom: "4px",
            borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ fontSize: "12px", fontWeight: 600 }}>{task.title}</div>
            {task.turnsRemaining > 0 && (
              <div style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>{task.turnsRemaining}턴 남음</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TitleScreen({ onStart }) {
  return (
    <div style={{
      height: "100dvh",
      background: `radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.08) 0%, transparent 60%),
                    linear-gradient(180deg, var(--bg-primary) 0%, #0d0d1a 50%, var(--bg-primary) 100%)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative border lines */}
      <div style={{
        position: "absolute",
        top: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "200px",
        height: "1px",
        background: "linear-gradient(90deg, transparent, var(--gold-dim), transparent)",
      }} />

      <div style={{
        fontSize: "11px",
        color: "var(--text-dim)",
        letterSpacing: "6px",
        marginBottom: "16px",
        animation: "fadeInUp 0.8s ease",
      }}>
        A I · 군 주 · 시 뮬 레 이 션
      </div>

      <h1 style={{
        fontFamily: "'Noto Serif KR', serif",
        fontSize: "clamp(36px, 10vw, 56px)",
        fontWeight: 900,
        color: "var(--gold)",
        textShadow: "0 0 40px rgba(201,168,76,0.3)",
        letterSpacing: "8px",
        marginBottom: "4px",
        animation: "fadeInUp 0.8s ease 0.1s both",
      }}>
        삼국지
      </h1>

      <div style={{
        width: "60px",
        height: "1px",
        background: "var(--gold)",
        margin: "12px 0 20px",
        animation: "fadeInUp 0.8s ease 0.2s both",
      }} />

      <div style={{
        background: "rgba(255,255,255,0.03)",
        borderRadius: "12px",
        padding: "20px 24px",
        maxWidth: "300px",
        border: "1px solid var(--border)",
        marginBottom: "32px",
        animation: "fadeInUp 0.8s ease 0.3s both",
      }}>
        <p style={{ fontSize: "13px", lineHeight: 2, color: "var(--text-secondary)", textAlign: "center" }}>
          당신은 <b style={{ color: "var(--gold)" }}>유비</b><br />
          참모 <b style={{ color: "var(--gold)" }}>제갈량</b>의 보고를 받고<br />
          국가의 운명을 결정하시오<br />
          <br />
          <span style={{ fontSize: "12px", color: "var(--text-dim)" }}>
            💰 자원을 관리하고 ⚔️ 장수를 지휘하여<br />
            천하통일을 이루십시오
          </span>
        </p>
      </div>

      <button
        onClick={onStart}
        style={{
          background: "transparent",
          color: "var(--gold)",
          border: "1px solid var(--gold)",
          padding: "14px 48px",
          borderRadius: "4px",
          fontSize: "15px",
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "4px",
          transition: "all 0.3s",
          animation: "fadeInUp 0.8s ease 0.5s both",
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "var(--gold)";
          e.target.style.color = "var(--bg-primary)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = "transparent";
          e.target.style.color = "var(--gold)";
        }}
      >
        출사표를 올리다
      </button>

      <div style={{
        position: "absolute",
        bottom: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "200px",
        height: "1px",
        background: "linear-gradient(90deg, transparent, var(--gold-dim), transparent)",
      }} />
    </div>
  );
}

// ===================== MAIN APP =====================

export default function ThreeKingdomsAI() {
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [messages, setMessages] = useState([]);
  const [convHistory, setConvHistory] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [currentChoices, setCurrentChoices] = useState(null);
  const [deltas, setDeltas] = useState({ gold: 0, food: 0, troops: 0, popularity: 0 });
  const [tasks, setTasks] = useState([]);
  const [showTasks, setShowTasks] = useState(false);
  const [started, setStarted] = useState(false);
  const [waitChoice, setWaitChoice] = useState(false);
  const scrollRef = useRef(null);
  const gameStateRef = useRef(gameState);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 50);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamingText, scrollToBottom]);

  useEffect(() => {
    if (deltas.gold || deltas.food || deltas.troops || deltas.popularity) {
      const t = setTimeout(() => setDeltas({ gold: 0, food: 0, troops: 0, popularity: 0 }), 2200);
      return () => clearTimeout(t);
    }
  }, [deltas]);

  // ---- API Call ----
  const callLLM = async (userMsg, overrideContent) => {
    const newHist = [...convHistory];
    newHist.push({ role: "user", content: overrideContent || userMsg });
    const trimmed = newHist.slice(-20);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: buildSystemPrompt(gameStateRef.current),
          messages: trimmed,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const raw = data.content?.[0]?.text || "";
      let parsed;
      try {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(m ? m[0] : raw);
      } catch {
        parsed = { speaker: "제갈량", dialogue: raw, emotion: "calm", choices: null, state_changes: null };
      }

      newHist.push({ role: "assistant", content: raw });
      setConvHistory(newHist.slice(-20));
      return parsed;
    } catch (err) {
      console.error("API error:", err);
      return {
        speaker: "제갈량",
        dialogue: "소신이 잠시 생각을 정리하고 있사옵니다... (연결 오류가 발생했습니다)",
        emotion: "thoughtful",
        choices: null,
        state_changes: null,
      };
    }
  };

  // ---- Type animation ----
  const typeText = async (text, onUpdate) => {
    let displayed = "";
    for (let i = 0; i < text.length; i++) {
      displayed += text[i];
      onUpdate(displayed);
      await new Promise((r) => setTimeout(r, 22 + Math.random() * 18));
    }
  };

  const addAdvisorMsg = async (parsed) => {
    setIsLoading(false);
    setStreamingText("");

    await typeText(parsed.dialogue, (partial) => {
      setStreamingText(partial);
      scrollToBottom();
    });

    setStreamingText("");
    setMessages((prev) => [...prev, { role: "assistant", content: parsed.dialogue, emotion: parsed.emotion }]);

    if (parsed.choices?.length > 0) {
      setCurrentChoices(parsed.choices);
      setWaitChoice(true);
    }
    if (parsed.state_changes) {
      applyStateChanges(parsed.state_changes);
    }
  };

  // ---- State changes ----
  const applyStateChanges = (changes) => {
    setGameState((prev) => {
      const next = { ...prev };
      const nd = { gold: 0, food: 0, troops: 0, popularity: 0 };
      if (changes.gold_delta) { next.gold = Math.max(0, next.gold + changes.gold_delta); nd.gold = changes.gold_delta; }
      if (changes.food_delta) { next.food = Math.max(0, next.food + changes.food_delta); nd.food = changes.food_delta; }
      if (changes.troops_delta) { next.totalTroops = Math.max(0, next.totalTroops + changes.troops_delta); nd.troops = changes.troops_delta; }
      if (changes.popularity_delta) { next.popularity = Math.max(0, Math.min(100, next.popularity + changes.popularity_delta)); nd.popularity = changes.popularity_delta; }
      if (changes.city_updates) {
        next.cities = next.cities.map((c) => {
          const u = changes.city_updates.find((x) => x.city === c.cityName);
          if (!u) return c;
          return {
            ...c,
            defense: u.defense_delta ? Math.max(0, Math.min(100, c.defense + u.defense_delta)) : c.defense,
            commerce: u.commerce_delta ? Math.max(0, Math.min(100, c.commerce + u.commerce_delta)) : c.commerce,
            agriculture: u.agriculture_delta ? Math.max(0, Math.min(100, c.agriculture + u.agriculture_delta)) : c.agriculture,
          };
        });
      }
      if (changes.general_updates) {
        next.generals = next.generals.map((g) => {
          const u = changes.general_updates.find((x) => x.name === g.generalName);
          if (!u) return g;
          return { ...g, currentTask: u.task || g.currentTask, loyalty: u.loyalty_delta ? Math.max(0, Math.min(100, g.loyalty + u.loyalty_delta)) : g.loyalty };
        });
      }
      if (changes.new_events) next.recentEvents = [...(next.recentEvents || []), ...changes.new_events].slice(-5);
      setDeltas(nd);
      return next;
    });
    if (changes.result_message) {
      setMessages((prev) => [...prev, { role: "system", content: `📜 ${changes.result_message}` }]);
    }
  };

  // ---- Turn system ----
  const calcResources = (st) => {
    const sm = { "봄": 1.5, "여름": 1, "가을": 1.5, "겨울": 0.5 };
    let gi = 0, fp = 0;
    st.cities.forEach((c) => {
      gi += Math.floor(c.commerce * c.population / 1000);
      fp += Math.floor(c.agriculture * c.population / 500 * (sm[st.currentSeason] || 1));
    });
    return { goldIncome: gi, foodProd: fp, foodCost: st.totalTroops * 2 };
  };

  const advanceTurn = () => {
    const st = gameStateRef.current;
    const r = calcResources(st);
    const si = SEASONS.indexOf(st.currentSeason);
    const ns = SEASONS[(si + 1) % 4];
    const netFood = r.foodProd - r.foodCost;

    setGameState((prev) => ({
      ...prev,
      currentTurn: prev.currentTurn + 1,
      currentSeason: ns,
      gold: Math.max(0, prev.gold + r.goldIncome),
      food: Math.max(0, prev.food + netFood),
    }));
    setDeltas({ gold: r.goldIncome, food: netFood, troops: 0, popularity: 0 });
    setTasks((prev) =>
      prev.map((t) => ({ ...t, urgency: Math.min(100, t.urgency + 10), turnsRemaining: t.turnsRemaining > 0 ? t.turnsRemaining - 1 : t.turnsRemaining }))
        .filter((t) => t.turnsRemaining !== 0)
    );
    setMessages((prev) => [
      ...prev,
      { role: "system", content: `🏯 第${st.currentTurn + 1}턴 — ${ns} ${SEASON_ICON[ns]} | 금 +${r.goldIncome.toLocaleString()} | 식량 ${netFood >= 0 ? "+" : ""}${netFood.toLocaleString()}` },
    ]);
  };

  const checkEvents = () => {
    const st = gameStateRef.current;
    const triggered = RANDOM_EVENTS.filter((e) => e.condition(st) && Math.random() < e.prob);
    if (triggered.length > 0) {
      const ev = triggered[Math.floor(Math.random() * triggered.length)];
      setGameState((prev) => ({ ...prev, recentEvents: [...(prev.recentEvents || []), ev.prompt].slice(-5) }));
      setTasks((prev) => [...prev, { title: ev.name, urgency: ev.priority * 15, turnsRemaining: ev.priority >= 4 ? 3 : 5 }]);
      return ev.prompt;
    }
    return null;
  };

  // ---- Actions ----
  const startGame = async () => {
    setStarted(true);
    setIsLoading(true);
    setMessages([{ role: "system", content: "🏯 삼국지 AI — 제갈량이 보고를 올립니다" }]);
    const ev = checkEvents();
    const prompt = ev
      ? `게임이 시작되었다. 첫 턴이다. 주공(유비)에게 현재 상황을 보고하고, 이벤트 "${ev}" 도 포함하여 조언하라. 2~3개 선택지를 제시하라.`
      : "게임이 시작되었다. 첫 턴이다. 주공(유비)에게 현재 국가 상황을 보고하고, 2~3개 선택지를 제시하라.";
    const parsed = await callLLM(null, prompt);
    await addAdvisorMsg(parsed);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsLoading(true);
    const parsed = await callLLM(text);
    await addAdvisorMsg(parsed);
  };

  const handleChoice = async (choice) => {
    setWaitChoice(false);
    setCurrentChoices(null);
    setMessages((prev) => [...prev, { role: "user", content: `[${choice.id}] ${choice.text}` }]);
    setIsLoading(true);

    const prompt = `플레이어가 [${choice.id}] "${choice.text}"을(를) 선택했다. 결과를 보고하라. 반드시 state_changes를 포함하여 수치 변화를 알려라. state_changes: {"gold_delta":숫자,"food_delta":숫자,"troops_delta":숫자,"popularity_delta":숫자,"city_updates":[{"city":"도시명","defense_delta":숫자}],"general_updates":[{"name":"장수명","task":"임무","loyalty_delta":숫자}],"new_events":["설명"],"result_message":"요약"}`;
    const parsed = await callLLM(null, prompt);
    await addAdvisorMsg(parsed);

    setTimeout(() => {
      advanceTurn();
      setTimeout(async () => {
        const ev = checkEvents();
        const np = ev
          ? `새 턴이 시작되었다. 이벤트: "${ev}". 보고하고 2~3개 선택지를 제시하라.`
          : "새 턴이 시작되었다. 상황을 보고하고 2~3개 선택지를 제시하라.";
        setIsLoading(true);
        const next = await callLLM(null, np);
        await addAdvisorMsg(next);
      }, 1200);
    }, 800);
  };

  const handleNextTurn = () => {
    advanceTurn();
    setTimeout(async () => {
      const ev = checkEvents();
      const np = ev
        ? `새 턴이다. 이벤트: "${ev}". 보고하고 2~3개 선택지를 제시하라.`
        : "새 턴이다. 보고하고 2~3개 선택지를 제시하라.";
      setIsLoading(true);
      const next = await callLLM(null, np);
      await addAdvisorMsg(next);
    }, 800);
  };

  // ===================== RENDER =====================

  if (!started) return <TitleScreen onStart={startGame} />;

  return (
    <div style={{
      height: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "var(--bg-primary)",
      position: "relative",
      overflow: "hidden",
    }}>
      <StatusBar state={gameState} deltas={deltas} />

      {/* Task toggle */}
      <button onClick={() => setShowTasks(!showTasks)} style={{
        position: "absolute", top: "12px", right: "12px", zIndex: 15,
        background: tasks.length > 0 ? "rgba(212,68,62,0.2)" : "rgba(255,255,255,0.05)",
        border: "1px solid var(--border)", borderRadius: "16px",
        padding: "3px 10px", color: "var(--text-secondary)",
        fontSize: "11px", cursor: "pointer",
      }}>
        📋 {tasks.length}
      </button>
      <TaskPanel tasks={tasks} show={showTasks} onToggle={() => setShowTasks(false)} />

      {/* Chat */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingTop: "6px", paddingBottom: "6px" }}>
        {messages.map((msg, i) => <ChatBubble key={i} message={msg} />)}
        {streamingText && (
          <ChatBubble message={{ role: "assistant", content: streamingText, emotion: "thoughtful" }} isTyping />
        )}
        {isLoading && !streamingText && (
          <div style={{ padding: "8px 56px", fontSize: "12px", color: "var(--text-dim)", animation: "pulse 1.5s infinite" }}>
            🪶 제갈량이 생각 중...
          </div>
        )}
      </div>

      {/* Choices */}
      {currentChoices && <ChoicePanel choices={currentChoices} onSelect={handleChoice} disabled={isLoading} />}

      {/* Input */}
      <div style={{
        display: "flex", gap: "8px", padding: "10px 14px",
        background: "var(--bg-secondary)", borderTop: "1px solid var(--border)",
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder={waitChoice ? "위 선택지를 골라주세요..." : "제갈량에게 명을 내리십시오..."}
          disabled={isLoading}
          style={{
            flex: 1, background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border)", borderRadius: "8px",
            padding: "10px 14px", color: "var(--text-primary)", fontSize: "13.5px",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            background: isLoading || !input.trim() ? "rgba(201,168,76,0.15)" : "var(--gold)",
            color: isLoading || !input.trim() ? "var(--text-dim)" : "var(--bg-primary)",
            border: "none", borderRadius: "8px", padding: "10px 16px",
            fontSize: "13px", cursor: isLoading ? "not-allowed" : "pointer", fontWeight: 700,
          }}
        >
          전송
        </button>
        {!waitChoice && !isLoading && messages.length > 2 && (
          <button onClick={handleNextTurn} style={{
            background: "rgba(255,255,255,0.05)", color: "var(--gold)",
            border: "1px solid var(--border)", borderRadius: "8px",
            padding: "10px 12px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600,
          }}>
            다음턴
          </button>
        )}
      </div>
    </div>
  );
}
