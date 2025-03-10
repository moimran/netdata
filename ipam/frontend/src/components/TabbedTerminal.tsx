import { useEffect, forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Tabs, Box, Button, Group, Text, CloseButton } from '@mantine/core';
import { SSHTerminal } from './SSHTerminal';

interface DeviceSession {
  id: number;
  name: string;
  active: boolean;
}

interface TabbedTerminalProps {
  visible: boolean;
}

export interface TabbedTerminalRef {
  addSession: (deviceId: number, deviceName: string) => void;
}

export const TabbedTerminal = forwardRef<TabbedTerminalRef, TabbedTerminalProps>(
  ({ visible }, ref) => {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set the first session as active when sessions change
  useEffect(() => {
    if (sessions.length > 0 && !activeTab) {
      setActiveTab(`device-${sessions[0].id}`);
    } else if (sessions.length === 0) {
      setActiveTab(null);
    }
  }, [sessions, activeTab]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    addSession
  }));

  // Add a new device session
  const addSession = (deviceId: number, deviceName: string) => {
    // Check if session already exists
    if (sessions.some(session => session.id === deviceId)) {
      // If it exists, just activate it
      setActiveTab(`device-${deviceId}`);
      return;
    }

    // Add new session
    const newSession: DeviceSession = {
      id: deviceId,
      name: deviceName,
      active: true
    };

    setSessions(prev => [...prev, newSession]);
    setActiveTab(`device-${deviceId}`);
  };

  // Remove a device session
  const removeSession = (deviceId: number) => {
    setSessions(prev => prev.filter(session => session.id !== deviceId));
    
    // If we're removing the active tab, set the first remaining tab as active
    if (activeTab === `device-${deviceId}`) {
      const remainingSessions = sessions.filter(session => session.id !== deviceId);
      if (remainingSessions.length > 0) {
        setActiveTab(`device-${remainingSessions[0].id}`);
      } else {
        setActiveTab(null);
      }
    }
  };

  // Add keyboard event listeners to the container
  useEffect(() => {
    if (containerRef.current) {
      console.log("Adding keyboard event listeners to TabbedTerminal container");
      
      const handleKeyDown = (e: KeyboardEvent) => {
        console.log('TABBED TERMINAL - keydown:', e.key, e.keyCode);
      };
      
      const handleKeyPress = (e: KeyboardEvent) => {
        console.log('TABBED TERMINAL - keypress:', e.key, e.keyCode);
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
        console.log('TABBED TERMINAL - keyup:', e.key, e.keyCode);
      };
      
      containerRef.current.addEventListener('keydown', handleKeyDown);
      containerRef.current.addEventListener('keypress', handleKeyPress);
      containerRef.current.addEventListener('keyup', handleKeyUp);
      
      return () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('keydown', handleKeyDown);
          containerRef.current.removeEventListener('keypress', handleKeyPress);
          containerRef.current.removeEventListener('keyup', handleKeyUp);
        }
      };
    }
  }, []);

  // Handle tab change
  const handleTabChange = (value: string | null) => {
    setActiveTab(value);
  };

  if (!visible || sessions.length === 0) {
    return null;
  }

  return (
    <Box 
      mt="md" 
      ref={containerRef} 
      tabIndex={0} 
      style={{ 
        outline: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange}
        styles={(theme) => ({
          root: {
            backgroundColor: theme.colors.dark[7]
          },
          list: {
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #e9ecef',
            padding: '0 8px'
          },
          tab: {
            fontWeight: 500,
            padding: '12px 16px',
            color: '#495057',
            '&[data-active]': {
              color: '#0d9488',
              borderColor: '#0d9488'
            },
            '&:hover': {
              backgroundColor: 'rgba(13, 148, 136, 0.05)'
            }
          },
          panel: {
            padding: 0
          }
        })}
      >
        <Tabs.List>
          {sessions.map(session => (
            <Tabs.Tab 
              key={`device-${session.id}`} 
              value={`device-${session.id}`}
              rightSection={
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSession(session.id);
                  }}
                  style={{ 
                    cursor: 'pointer', 
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    color: '#666',
                    marginLeft: '8px'
                  }}
                >
                  ×
                </div>
              }
            >
              {session.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {sessions.map(session => (
          <Tabs.Panel key={`device-${session.id}`} value={`device-${session.id}`}>
            <SSHTerminal 
              deviceId={session.id} 
              deviceName={session.name}
              onError={(error) => console.error(`Error in session ${session.name}:`, error)}
            />
          </Tabs.Panel>
        ))}
      </Tabs>
    </Box>
  );
  }
);
