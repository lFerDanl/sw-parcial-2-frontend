// hooks/useDiagramSocket.ts (corregido)
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';

export const useDiagramSocket = (diagramId: number | null, shouldJoin: boolean = false) => {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  useEffect(() => {
    if (!diagramId || !session?.user?.token) return;

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:4000", {
      auth: { token: session.user.token },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    const handleConnect = () => {
      setIsConnected(true);
      if (shouldJoin && !hasJoined) {
        socket.emit("joinDiagram", { diagramId });
        setHasJoined(true);
      }
    };

    socket.on('connect', handleConnect);

    socket.on('disconnect', () => {
      setIsConnected(false);
      setHasJoined(false);
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.disconnect();
    };
  }, [diagramId, session?.user?.token, shouldJoin]);

  return { socket: socketRef.current, isConnected, hasJoined };
};