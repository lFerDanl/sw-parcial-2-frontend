import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await params;
    const res = await fetch(`${BACKEND_URL}/users/email/${email}`, {
      headers: {
        Authorization: `Bearer ${session.user.token}`,
        Accept: "application/json", // Asegura que se espera JSON
      },
    });

    // Verifica si la respuesta es JSON
    const contentType = res.headers.get("Content-Type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      console.error("Expected JSON, but received:", text);
      return NextResponse.json({ error: "Invalid response format" }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error fetching user by email:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
