import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// GET /api/diagrams
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(`${BACKEND_URL}/diagrams`, {
      headers: {
        Authorization: `Bearer ${session.user.token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json(await res.json(), { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("Error fetching diagrams:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/diagrams
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/diagrams`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(await res.json(), { status: res.status });
    }

    return NextResponse.json(await res.json(), { status: 201 });
  } catch (err) {
    console.error("Error creating diagram:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/diagrams/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/api/diagrams/${params.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(await res.json(), { status: res.status });
    }

    return NextResponse.json(await res.json());
  } catch (err) {
    console.error("Error updating diagram:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
