"use client";

import { useEffect, useState } from "react";
import { QUESTIONS, RESULT, scoreAnswers, INTRO } from "./diagnosis-data";

type Phase = "loading" | "intro" | "quiz" | "calculating" | "result";
type Result = ReturnType<typeof scoreAnswers>;

// --- パレット（デザイントンマナ） ---
const C = {
  base: "#F8F6F2",
  bg: "#FFFFFF",
  accent: "#D9C3A5",
  sub: "#E9DCCB",
  ink: "#3A332C",
  muted: "#7A7168",
};

export default function Page() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [userId, setUserId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [responses, setResponses] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  // --- LIFF 初期化 ---
  useEffect(() => {
    (async () => {
      try {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID as string });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        setUserId(p.userId);
        setDisplayName(p.displayName);
        setPhase("intro");
      } catch {
        // LINE外（PCプレビュー等）でも触れるようにフォールバック
        setUserId("dev-user");
        setDisplayName("ゲスト");
        setPhase("intro");
      }
    })();
  }, []);

  const start = () => {
    setResponses([]);
    setCurrent(0);
    setPhase("quiz");
  };

  const choose = (optIndex: number) => {
    const next = [...responses];
    next[current] = optIndex;
    setResponses(next);
    if (current + 1 < QUESTIONS.length) {
      setCurrent(current + 1);
    } else {
      finish(next);
    }
  };

  const back = () => current > 0 && setCurrent(current - 1);

  const finish = async (all: number[]) => {
    setPhase("calculating");
    const r = scoreAnswers(all);
    setResult(r);
    // Supabase 保存（失敗してもUXは止めない）
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL as string,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
      );
      await supabase.from("diagnoses").insert({
        line_user_id: userId,
        display_name: displayName,
        answers: { responses: all, scores: r.scores },
        result_type: r.result_type,
        tag: r.tag,
      });
    } catch {
      /* noop */
    }
    // 占いの“間”
    setTimeout(() => setPhase("result"), 1800);
  };

  const q = QUESTIONS[current];
  const r = result ? RESULT[result.result_type] : null;

  return (
    <main className="lr">
      <style>{css}</style>

      <div className="lr-wrap">
        {phase === "loading" && (
          <div className="lr-center lr-fade">
            <p className="lr-quiet serif">読み込んでいます…</p>
          </div>
        )}

        {phase === "intro" && (
          <section className="lr-center lr-fade">
            <h1 className="serif lr-title">{INTRO.title}</h1>
            <p className="lr-lead-sub">{INTRO.subtitle}</p>
            <button className="lr-btn-primary" onClick={start}>
              {INTRO.startLabel}
            </button>
            <p className="lr-note serif">{INTRO.note}</p>
          </section>
        )}

        {phase === "quiz" && (
          <section className="lr-quiz">
            <div className="lr-progress-head">
              <span className="lr-count">
                {current + 1} <span className="lr-count-total">/ {QUESTIONS.length}</span>
              </span>
            </div>
            <div className="lr-track">
              <div
                className="lr-fill"
                style={{ width: `${((current + 1) / QUESTIONS.length) * 100}%` }}
              />
            </div>

            <div key={q.id} className="lr-qblock lr-fade-up">
              <h2 className="serif lr-question">{q.text}</h2>
              <div className="lr-options">
                {q.options.map((o, i) => (
                  <button
                    key={i}
                    className={
                      "lr-option" + (responses[current] === i ? " lr-option-sel" : "")
                    }
                    onClick={() => choose(i)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {current > 0 && (
              <button className="lr-back" onClick={back}>
                ← ひとつ戻る
              </button>
            )}
          </section>
        )}

        {phase === "calculating" && (
          <div className="lr-center lr-fade">
            <div className="lr-pulse" />
            <p className="lr-quiet serif">{INTRO.loadingLabel}</p>
          </div>
        )}

        {phase === "result" && r && (
          <section className="lr-result">
            <p className="lr-eyebrow">今のあなたは</p>
            <h1 className="serif lr-typename">{r.name}</h1>
            <p className="lr-phase">― {r.phase} ―</p>

            <p className="serif lr-result-lead">{r.lead}</p>

            <div className="lr-body">
              {r.body.map((p, i) => (
                <p key={i} className="serif lr-paragraph">
                  {p}
                </p>
              ))}
            </div>

            <div className="lr-divider" />
            <p className="serif lr-result-q">{r.question}</p>

            {/* ▼ 将来：自己理解を深める“次の入り口”をここにそっと置く（今は空け） ▼ */}

            <button className="lr-restart" onClick={start}>
              もう一度、今の自分を映す
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

const css = `
.lr{
  --base:${C.base}; --bg:${C.bg}; --accent:${C.accent};
  --sub:${C.sub}; --ink:${C.ink}; --muted:${C.muted};
  min-height:100dvh; background:var(--bg); color:var(--ink);
  display:flex; justify-content:center;
  font-family:"Hiragino Sans","Yu Gothic","Noto Sans JP",system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.lr .serif{
  font-family:"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif;
  font-weight:400;
}
.lr-wrap{ width:100%; max-width:560px; padding:64px 28px 96px; box-sizing:border-box; }

/* ---- 共通レイアウト ---- */
.lr-center{ min-height:70dvh; display:flex; flex-direction:column;
  align-items:center; justify-content:center; text-align:center; gap:28px; }
.lr-quiet{ color:var(--muted); font-size:15px; letter-spacing:.04em; }

/* ---- intro ---- */
.lr-title{ font-size:27px; line-height:1.7; letter-spacing:.04em; margin:0; }
.lr-lead-sub{ color:var(--muted); font-size:14px; line-height:2; max-width:380px; margin:0; }
.lr-note{ color:var(--muted); font-size:12.5px; line-height:2; max-width:360px;
  margin:8px 0 0; opacity:.9; }
.lr-btn-primary{
  margin-top:4px; appearance:none; border:none; cursor:pointer;
  background:var(--accent); color:var(--ink);
  font-size:15px; letter-spacing:.08em; padding:16px 44px; border-radius:999px;
  transition:transform .2s ease, opacity .2s ease;
}
.lr-btn-primary:hover{ opacity:.9; transform:translateY(-1px); }
.lr-btn-primary:active{ transform:translateY(0); }

/* ---- quiz ---- */
.lr-progress-head{ display:flex; justify-content:flex-end; margin-bottom:10px; }
.lr-count{ font-size:13px; letter-spacing:.12em; color:var(--ink); }
.lr-count-total{ color:var(--muted); }
.lr-track{ height:4px; background:var(--sub); border-radius:999px; overflow:hidden; }
.lr-fill{ height:100%; background:var(--accent); border-radius:999px;
  transition:width .45s cubic-bezier(.22,.61,.36,1); }
.lr-qblock{ margin-top:56px; }
.lr-question{ font-size:21px; line-height:1.9; letter-spacing:.03em; margin:0 0 36px; }
.lr-options{ display:flex; flex-direction:column; gap:14px; }
.lr-option{
  appearance:none; cursor:pointer; text-align:left;
  background:var(--bg); color:var(--ink);
  border:1px solid var(--sub); border-radius:16px;
  padding:18px 20px; font-size:15px; line-height:1.7;
  font-family:inherit;
  transition:background .18s ease, border-color .18s ease, transform .12s ease;
}
.lr-option:hover{ background:var(--base); border-color:var(--accent); }
.lr-option:active{ transform:scale(.995); }
.lr-option-sel{ background:var(--sub); border-color:var(--accent); }
.lr-back{
  margin-top:34px; appearance:none; border:none; background:none; cursor:pointer;
  color:var(--muted); font-size:13px; letter-spacing:.04em; font-family:inherit; padding:6px;
}
.lr-back:hover{ color:var(--ink); }

/* ---- calculating ---- */
.lr-pulse{ width:10px; height:10px; border-radius:50%; background:var(--accent);
  animation:lrpulse 1.6s ease-in-out infinite; }
@keyframes lrpulse{ 0%,100%{ opacity:.25; transform:scale(.85);} 50%{ opacity:1; transform:scale(1.15);} }

/* ---- result ---- */
.lr-result{ padding-top:24px; animation:lrfade .9s ease both; }
.lr-eyebrow{ text-align:center; color:var(--muted); font-size:13px;
  letter-spacing:.22em; margin:0 0 14px; }
.lr-typename{ text-align:center; font-size:42px; letter-spacing:.1em; margin:0; }
.lr-phase{ text-align:center; color:var(--accent); font-size:14px;
  letter-spacing:.12em; margin:12px 0 0; }
.lr-result-lead{ font-size:18px; line-height:2.1; letter-spacing:.03em;
  text-align:center; margin:44px 0 0; }
.lr-body{ margin-top:36px; }
.lr-paragraph{ font-size:15.5px; line-height:2.15; letter-spacing:.02em; margin:0 0 22px; }
.lr-divider{ width:40px; height:1px; background:var(--accent); margin:40px auto; opacity:.7; }
.lr-result-q{ font-size:16px; line-height:2.1; letter-spacing:.03em;
  text-align:center; color:var(--ink); margin:0 auto; max-width:420px; }
.lr-restart{
  display:block; margin:72px auto 0; appearance:none; border:none; background:none;
  cursor:pointer; color:var(--muted); font-size:13px; letter-spacing:.08em;
  font-family:inherit; padding:8px 4px;
}
.lr-restart:hover{ color:var(--ink); }

/* ---- motion ---- */
.lr-fade{ animation:lrfade .9s ease both; }
.lr-fade-up{ animation:lrfadeup .6s cubic-bezier(.22,.61,.36,1) both; }
@keyframes lrfade{ from{ opacity:0;} to{ opacity:1;} }
@keyframes lrfadeup{ from{ opacity:0; transform:translateY(10px);} to{ opacity:1; transform:translateY(0);} }

button:focus-visible{ outline:2px solid var(--accent); outline-offset:3px; }
@media (prefers-reduced-motion: reduce){
  .lr-fade,.lr-fade-up,.lr-result,.lr-fill,.lr-pulse{ animation:none !important; transition:none !important; }
}
`;
