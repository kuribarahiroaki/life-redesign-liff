import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const channelSecret = process.env.LINE_CHANNEL_SECRET || "";

// LINE署名検証（生のリクエストボディが必要）
function validateSignature(body: string, signature: string | null): boolean {
  if (!signature || !channelSecret) return false;
  const hash = crypto.createHmac("sha256", channelSecret).update(body).digest("base64");
  return hash === signature;
}

export async function POST(req: NextRequest) {
  const body = await req.text(); // 署名検証のため text() で生body
  const signature = req.headers.get("x-line-signature");

  if (!validateSignature(body, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  const { events } = JSON.parse(body) as { events: any[] };

  for (const event of events) {
    // 雛形: ここで follow / message / postback を分岐
    // 例) replyTokenでオウム返し（疎通後に有効化）:
    //   await fetch("https://api.line.me/v2/bot/message/reply", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    //     },
    //     body: JSON.stringify({
    //       replyToken: event.replyToken,
    //       messages: [{ type: "text", text: "received" }],
    //     }),
    //   });
    console.log("LINE event:", event.type);
  }

  return NextResponse.json({ ok: true });
}

// LINEの「Verify」用にGETも200を返しておく
export async function GET() {
  return NextResponse.json({ ok: true });
}
