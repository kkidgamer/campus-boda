import { useEffect, useRef } from 'react';
import { getSocket } from '../socket';

/**
 * Subscribe to Socket.IO events for the life of the component.
 *
 * handlers: { eventName: (payload) => void, ... }
 * The latest handlers are always invoked, so the subscription effect only
 * needs to run once (deps default to []).
 */
export function useSocketEvents(handlers, deps = []) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = getSocket();
    const registered = {};
    for (const event of Object.keys(handlersRef.current)) {
      const handler = (payload) => handlersRef.current[event]?.(payload);
      registered[event] = handler;
      socket.on(event, handler);
    }
    return () => {
      for (const [event, handler] of Object.entries(registered)) {
        socket.off(event, handler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
