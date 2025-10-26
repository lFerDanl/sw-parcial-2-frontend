// app/api/diagrams/[id]/generate-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// POST /api/diagrams/[id]/generate-code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Obtener query params
    const { searchParams } = new URL(request.url);
    const projectName = searchParams.get('projectName') || `diagram-${id}-springboot`;
    const basePackage = searchParams.get('basePackage') || 'com.example.demo';

    // Construir URL con query params
    const backendUrl = `${BACKEND_URL}/diagrams/${id}/generate-code?projectName=${encodeURIComponent(projectName)}&basePackage=${encodeURIComponent(basePackage)}`;

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.user.token}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Error generating code" }));
      return NextResponse.json(errorData, { status: res.status });
    }

    // Retornar el ZIP directamente
    const zipBuffer = await res.arrayBuffer();
    
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${projectName}.zip"`,
        'Content-Length': zipBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("Error generating Spring Boot code:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}