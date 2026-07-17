import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";

export async function POST(request: Request) {
  const secret = getServerEnv().PAYMENT_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Платёжный провайдер ещё не подключён" }, { status: 501 });
  if (request.headers.get("x-webhook-secret") !== secret) return NextResponse.json({ error: "Неверная подпись" }, { status: 401 });
  return NextResponse.json({ error: "Добавьте проверку подписи выбранного провайдера перед включением webhook" }, { status: 501 });
}
