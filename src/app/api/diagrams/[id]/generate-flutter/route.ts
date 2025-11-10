// app/api/diagrams/[id]/generate-flutter/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// POST /api/diagrams/[id]/generate-flutter
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
    const projectName = searchParams.get('projectName') || `diagram_${id}_flutter`;
    const basePackage = searchParams.get('basePackage') || 'com.example.app';

    // Normalizar nombre del proyecto (snake_case para Flutter)
    const normalizedProjectName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, ''); // Eliminar guiones bajos al inicio/final

    // Construir URL con query params
    const backendUrl = `${BACKEND_URL}/diagrams/${id}/generate-flutter?projectName=${encodeURIComponent(normalizedProjectName)}&basePackage=${encodeURIComponent(basePackage)}`;

    console.log('Requesting Flutter generation:', {
      diagramId: id,
      projectName: normalizedProjectName,
      basePackage,
      url: backendUrl
    });

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.user.token}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Backend error:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || "Error generating Flutter code" };
      }
      
      return NextResponse.json(errorData, { status: res.status });
    }

    // Retornar el ZIP directamente
    const zipBuffer = await res.arrayBuffer();
    
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${normalizedProjectName}.zip"`,
        'Content-Length': zipBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    console.error("Error generating Flutter code:", err);
    return NextResponse.json({ 
      error: "Internal server error", 
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}