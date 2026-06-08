# LIFF + Supabase Starter（疎通確認用 / フェーズ1の土台）

LIFF初期化・LINEログイン・Supabase接続・webhook雛形の4ピースだけ。
ゴール: **LIFFログイン成功 → 1問ハードコードの回答をSupabaseに書いて読み戻す往復**を1本通すこと。
全問実装はこの後。

## 構成
- `app/page.tsx` … LIFF init → login → 1問表示 → Supabase往復（書く/読む）
- `app/api/webhook/route.ts` … LINE Messaging API webhook 雛形（署名検証あり）
- `lib/supabaseClient.ts` … Supabaseブラウザクライアント
- `supabase/schema.sql` … `diagnostic_answers` テーブル + dev用RLS
- `.env.example` … 必要な環境変数

## セットアップ手順
1. **Supabase**: プロジェクト作成 → SQL Editor で `supabase/schema.sql` を実行 → Settings>API の URL と anon key を控える
2. **LINE Developers**:
   - Messaging APIチャネル作成（webhook/署名検証用に channel secret と access token を取得）
   - LIFFアプリを追加 → LIFF ID を取得 → Endpoint URL に **デプロイ後のURL** を設定（後述）
3. `cp .env.example .env.local` して値を埋める
4. `npm install`

## 疎通テスト
> ⚠ LIFFログインはHTTPSエンドポイントが必須。localhostだとログイン後リダイレクトで詰まりやすいので、**Vercel か ngrok 経由で確認**するのが確実。

- 推奨: `vercel` でデプロイ → そのURLを LIFF の Endpoint URL に設定 → LIFF URL (`https://liff.line.me/{LIFF_ID}`) を開く
- ローカルだけ試すなら: `npm run dev` → `ngrok http 3000` のHTTPS URLを Endpoint に設定
- 画面で選択肢を押して「✅ Supabase 往復OK」+ 行JSONが出れば成功

### webhook
- LINE Developers の Webhook URL に `https://<your-domain>/api/webhook` を設定 → Verify で 200 が返ればOK
- 返信処理は `route.ts` のコメント部を有効化すれば動く（疎通後に）

## 本番前TODO
- `diagnostic_answers` の dev用RLSポリシーを削除し、適切なRLSへ
- anonキー前提の書き込みをやめ、webhook経由 or サーバ側でservice role運用に
