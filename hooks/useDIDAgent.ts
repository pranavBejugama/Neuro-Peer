"use client";
import { useRef, useState, useCallback, useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sdk: any = null;

export function useDIDAgent(agentId: string, clientKey: string) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentManagerRef = useRef<any>(null);
  const srcObjectRef = useRef<MediaStream | null>(null);

  const connect = useCallback(async () => {
    if (!agentId || !clientKey) {
      setError('Missing D-ID credentials');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      if (!sdk) {
        sdk = await import('@d-id/client-sdk');
      }

      const callbacks = {
        onSrcObjectReady: (value: MediaStream) => {
          srcObjectRef.current = value;
          if (videoRef.current) {
            videoRef.current.srcObject = value;
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onVideoStateChange: (state: any) => {
          if (state === 'STOP' && videoRef.current && agentManagerRef.current) {
            videoRef.current.srcObject = null;
            const idleVideo = agentManagerRef.current.agent?.presenter?.idle_video;
            if (idleVideo) videoRef.current.src = idleVideo;
          } else if (videoRef.current && srcObjectRef.current) {
            videoRef.current.src = '';
            videoRef.current.srcObject = srcObjectRef.current;
          }
        },
        onConnectionStateChange: (state: string) => {
          setConnectionState(state);
          if (state === 'connected') {
            setIsConnected(true);
            setIsLoading(false);
          } else if (state === 'disconnected' || state === 'closed' || state === 'fail') {
            setIsConnected(false);
            setIsLoading(false);
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onNewMessage: (messages: any[], type: string) => {
          console.log('D-ID message:', type, messages);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
          console.error('D-ID error:', err);
          setError(err?.message || 'D-ID error');
          setIsLoading(false);
        },
      };

      const agentManager = await sdk.createAgentManager(agentId, {
        auth: { type: 'key', clientKey },
        callbacks,
        streamOptions: { compatibilityMode: 'auto', streamWarmup: true },
      });

      agentManagerRef.current = agentManager;
      await agentManager.connect();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'Failed to connect');
      setIsLoading(false);
    }
  }, [agentId, clientKey]);

  const disconnect = useCallback(() => {
    agentManagerRef.current?.disconnect();
    agentManagerRef.current = null;
    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  const speak = useCallback((text: string) => {
    if (agentManagerRef.current && isConnected) {
      agentManagerRef.current.speak({ type: 'text', input: text });
    }
  }, [isConnected]);

  const chat = useCallback((message: string) => {
    if (agentManagerRef.current && isConnected) {
      agentManagerRef.current.chat(message);
    }
  }, [isConnected]);

  useEffect(() => {
    return () => { agentManagerRef.current?.disconnect(); };
  }, []);

  return { connect, disconnect, speak, chat, isConnected, isLoading, videoRef, error, connectionState };
}
