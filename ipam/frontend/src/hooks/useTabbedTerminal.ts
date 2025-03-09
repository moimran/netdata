import { useState } from 'react';
import { TabbedTerminalRef } from '../components/TabbedTerminal';

export const useTabbedTerminal = () => {
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [terminalRef, setTerminalRef] = useState<TabbedTerminalRef | null>(null);

  return {
    terminalVisible,
    setTerminalVisible,
    terminalRef,
    setTerminalRef,
    connectToDevice: (deviceId: number, deviceName: string) => {
      setTerminalVisible(true);
      if (terminalRef) {
        terminalRef.addSession(deviceId, deviceName);
      }
    }
  };
};
