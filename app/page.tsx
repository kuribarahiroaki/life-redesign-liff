"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";

type TypeKey = "T1" | "T2" | "T3" | "T4";

const QUESTIONS: { id: string; text: string; options: { label: string; scores: Partial<Record<TypeKey, number>> }[] }[] = [
  { id: "q1", text: "今、いちばん心に引っかかっていることは？", options: [
    { label: "お金や老後の見通し", scores: { T2: 2 } },
    { label: "親や家族の介護", scores: { T3: 2 } },
    { label: "気づくと自分を後回しにしている", scores: { T1: 2 } },
    { label: "これからどう生きたいか", scores: { T4: 2 } },
  ]},
  { id: "q2", text: "夜、ふと不安になるとしたら？", options: [
    { label: "収入・貯蓄・年金のこと", scores: { T2: 2 } },
    { label: "介護にかかる時間やお金", scores: { T3: 1, T2: 1 } },
    { label: "自分の心や体の疲れ", scores: { T1: 2 } },
    { label: "このままでいいのかという焦り", scores: { T4: 2 } },
  ]},
  { id: "q3", text: "最近、いちばん時間を奪われていると感じるのは？", options: [
    { label: "将来の計算や情報集め", scores: { T2: 1 } },
    { label: "家族の世話・付き添い", scores: { T3: 2 } },
    { label: "人の頼みを断れず対応すること", scores: { T1: 2 } },
    { label: "特にない／むしろ持て余している", scores: { T4: 1 } },
  ]},
  { id: "q4", text: "もし自由な時間が増えたら？", options: [
    { label: "家計や資産を見直したい", scores: { T2: 2 } },
    { label: "とにかく休みたい・眠りたい", scores: { T3: 1, T1: 1 } },
    { label: "自分の好きなことをしたい", scores: { T1: 1, T4: 1 } },
    { label: "新しい挑戦を始めたい", scores: { T4: 2 } },
  ]},
  { id: "q5", text: "お金について、今の気持ちに近いのは？", options: [
    { label: "足りるのか本気で不安", scores: { T2: 2 } },
    { label: "介護費用が読めず不安", scores: { T3: 1, T2: 1 } },
    { label: "考える余裕すらない", scores: { T1: 1 } },
    { label: "お金より生き方の方が気になる", scores: { T4: 2 } },
  ]},
  { id: "q6", text: "家族との関係で、近いのは？", options: [
    { label: "経済的に支える責任を感じる", scores: { T2: 1 } },
    { label: "介護や世話の負担が重い", scores: { T3: 2 } },
    { label: "自分が我慢して回している", scores: { T1: 2 } },
    { label: "もっと自分の人生を生きたい", scores: { T4: 1 } },
  ]},
  { id: "q7", text: "1年後、どうなっていたい？", options: [
    { label: "お金の不安が減っている", scores: { T2: 2 } },
    { label: "介護の負担が軽くなっている", scores: { T3: 2 } },
    { label: "心にゆとりがある", scores: { T1: 2 } },
    { label: "新しい生き方を歩んでいる", scores: { T4: 2 } },
  ]},
];

const RESULT: Record<"T2" | "T3", { name: string; tag: string; headline: string; body: string[]; nextStep: string }> = {
  T2: {
    name: "将来不安型",
    tag: "future_anxiety",
    headline: "お金と老後の見通しが、いちばんの重荷になっています",
    body: [
      "お金や老後の見通しが立たないと、頭の片隅でずっと小さな警報が鳴り続けているような状態になります。あなたの回答からは、その不安が日々の気分や判断にまで影を落としている様子が見えてきました。",
      "ただ、これは「性格」の問題ではなく「全体像がまだ見えていないだけ」のことが多いです。輪郭が一度つかめると、不安の大きさは想像以上に変わります。",
      "最初の一歩は、増やすことより『今の出入りを把握する』こと。固定費と毎月の収支をざっくり書き出すだけで、霧が晴れ始めます。",
    ],
    nextStep: "お金・老後の不安をほどく具体的な内容を、このあとLINEで順番にお届けします。",
  },
  T3: {
    name: "介護消耗型",
    tag: "caregiving",
    headline: "終わりの見えない負担を、一人で抱えていませんか",
    body: [
      "介護は、終わりが見えないまま心と時間を少しずつ削っていきます。あなたの回答からは、その負担をつい一人で抱え込みがちな様子がうかがえました。",
      "大事なのは「あなたの頑張りが足りない」のではない、ということ。仕組みや制度を使えば、抱える量は確実に減らせます。",
      "最初の一歩は、使える支援を1つ確認すること。地域包括支援センターやケアマネージャーへの一本の相談が、負担の重さを変えることがあります。",
    ],
    nextStep: "介護の負担を軽くする具体策を、このあとLINEで順番にお届けします。",
  },
};

function scoreAnswers(responses: Record<string, number>) {
  const totals: Record<TypeKey, number> = { T1: 0, T2: 0, T3: 0, T4: 0 };
  for (const q of QUESTIONS) {
    const idx = responses[q.id];
    if (idx == null) continue;
    const opt = q.options[idx];
    if (!opt) continue;
    for (const k in opt.scores) totals[k as TypeKey] += opt.scores[k as TypeKey] ?? 0;
  }
  let result: "T2" | "T3";
  if (totals.T2 > totals.T3) result = "T2";
  else if (totals.T3 > totals.T2) result = "T3";
  else result = responses["q1"] === 1 ? "T3" : "T2";
  return { totals, result };
}

type Phase = "loading" | "intro" | "quiz" | "result" | "error";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [result, setResult] = useState<"T2" | "T3" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) throw new Error("NEXT_PUBLIC_LIFF_ID is not set");
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) { liff.login(); return; }
        const p = await liff.getProfile();
        setUserId(p.userId); setName(p.displayName);
        setPhase("intro");
      } catch (e: any) { setError(e?.message ?? String(e)); setPhase("error"); }
    })();
  }, []);

  function choose(qid: string, optIndex: number) {
    const next = { ...responses, [qid]: optIndex };
    setResponses(next);
    if (step + 1 < QUESTIONS.length) setStep(step + 1);
    else finish(next);
  }

  async function finish(finalResponses: Record<string, number>) {
    const { totals, result: r } = scoreAnswers(finalResponses);
    setResult(r);
    setPhase("result");
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.from("diagnoses").insert({
        line_user_id: userId,
        answers: { responses: finalResponses, scores: totals },
        result_type: r,
        tag: RESULT[r].tag,
      });
    } catch (e: any) { console.error(e); }
  }

  if (phase === "loading") return <main style={s.main}>初期化中…</main>;
  if (phase === "error") return <main style={s.main}><p style={{ color: "crimson" }}>エラー: {error}</p></main>;

  if (phase === "intro")
    return (
      <main style={s.main}>
        <h1 style={s.h1}>人生再設計診断</h1>
        <p style={s.lead}>{name} さん、{QUESTIONS.length}問の質問に答えるだけ。あなたが今いちばん向き合うべきテーマを診断し、無料レポートとしてお返しします。</p>
        <button style={s.primary} onClick={() => setPhase("quiz")}>診断をはじめる</button>
      </main>
    );

  if (phase === "quiz") {
    const q = QUESTIONS[step];
    return (
      <main style={s.main}>
        <p style={s.muted}>{step + 1} / {QUESTIONS.length}</p>
        <div style={s.bar}><div style={{ ...s.barFill, width: `${((step + 1) / QUESTIONS.length) * 100}%` }} /></div>
        <h1 style={s.h1}>{q.text}</h1>
        <div style={s.col}>
          {q.options.map((o, i) => (<button key={i} style={s.btn} onClick={() => choose(q.id, i)}>{o.label}</button>))}
        </div>
      </main>
    );
  }

  const r = result ? RESULT[result] : null;
  return (
    <main style={s.main}>
      {r && (
        <>
          <p style={s.muted}>あなたのタイプ</p>
          <h1 style={s.h1}>{r.name}</h1>
          <p style={s.headline}>{r.headline}</p>
          {r.body.map((para, i) => (<p key={i} style={s.para}>{para}</p>))}
          <div style={s.cta}><p style={s.ctaText}>{r.nextStep}</p></div>
        </>
      )}
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  main: { maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.7 },
  h1: { fontSize: 22, margin: "12px 0" },
  lead: { color: "#333", margin: "12px 0 24px" },
  muted: { color: "#888", fontSize: 13, margin: "4px 0" },
  headline: { fontWeight: 600, margin: "8px 0 16px" },
  para: { color: "#333", margin: "0 0 14px" },
  col: { display: "flex", flexDirection: "column", gap: 10, marginTop: 8 },
  btn: { padding: "14px 16px", fontSize: 16, textAlign: "left", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" },
  primary: { padding: "14px 16px", fontSize: 16, borderRadius: 10, border: "none", background: "#06c755", color: "#fff", cursor: "pointer", width: "100%" },
  bar: { height: 6, background: "#eee", borderRadius: 99, overflow: "hidden", margin: "6px 0 16px" },
  barFill: { height: "100%", background: "#06c755" },
  cta: { marginTop: 20, padding: 16, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10 },
  ctaText: { margin: 0, fontWeight: 600 },
};
