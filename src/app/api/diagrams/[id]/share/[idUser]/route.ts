// app/api/diagrams/[id]/share/[idUser]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// POST /api/diagrams/[id]/share/[idUser]
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; idUser: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, idUser } = await params;
    const token = session.user.token;

    const res = await fetch(`${BACKEND_URL}/diagrams/${id}/share/${idUser}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      // Si el backend devuelve error, parseamos el JSON para pasarlo
      let errorBody;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { message: "Error desconocido al compartir" };
      }
      return NextResponse.json(errorBody, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error compartiendo diagrama:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
