"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";

const QUESTION = {
  id: "q1",
  text: "今、いちばん不安なことは？",
  options: ["お金・老後", "介護", "メンタル", "生き方・自己実現"],
};

export default function Home() {
  const [status, setStatus] = useState<"loading" | "ready" | "saved" | "error">("loading");
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<any>(null);
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
        setStatus("ready");
      } catch (e: any) { setError(e?.message ?? String(e)); setStatus("error"); }
    })();
  }, []);

  async function answer(option: string) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: insErr } = await supabase.from("diagnoses").insert({
        line_user_id: userId, answers: { q1: option }, result_type: "TBD", tag: "TBD",
      });
      if (insErr) throw insErr;
      const { data, error: selErr } = await supabase.from("diagnoses")
        .select("*").eq("line_user_id", userId)
        .order("created_at", { ascending: false }).limit(1);
      if (selErr) throw selErr;
      setSaved(data?.[0] ?? null); setStatus("saved");
    } catch (e: any) { setError(e?.message ?? String(e)); setStatus("error"); }
  }

  if (status === "loading") return <main style={s.main}>初期化中…</main>;
  if (status === "error") return <main style={s.main}><p style={{ color: "crimson" }}>エラー: {error}</p></main>;

  return (
    <main style={s.main}>
      <p style={s.muted}>ログイン中: {name}</p>
      <h1 style={s.h1}>{QUESTION.text}</h1>
      <div style={s.col}>
        {QUESTION.options.map((o) => (
          <button key={o} style={s.btn} onClick={() => answer(o)}>{o}</button>
        ))}
      </div>
      {status === "saved" && saved && (
        <div style={s.ok}>
          <p>✅ Supabase 往復OK</p>
          <pre style={s.pre}>{JSON.stringify(saved, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}

const s: Record<string, CSSProperties> = {
  main: { maxWidth: 480, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" },
  muted: { color: "#666", fontSize: 13 },
  h1: { fontSize: 20, margin: "16px 0" },
  col: { display: "flex", flexDirection: "column", gap: 8 },
  btn: { padding: "12px 16px", fontSize: 16, borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" },
  ok: { marginTop: 20, padding: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8 },
  pre: { fontSize: 12, overflowX: "auto" },
};
