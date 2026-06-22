import { NextResponse } from "next/server";
import { NotificationError } from "@/lib/notifications/errors";

export function jsonError(error: unknown, fallbackMessage = "Unexpected error.") {
  if (error instanceof NotificationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      { error: fallbackMessage, detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export function unauthorized(message = "Unauthorized.") {
  return NextResponse.json({ error: message }, { status: 401 });
}
