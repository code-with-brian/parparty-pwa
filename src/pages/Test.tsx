import { useConvex } from 'convex/react';
import { useState, useEffect } from 'react';
import { GuestSessionManager } from '@/lib/GuestSessionManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Test() {
  const convex = useConvex();
  const [guestSessionManager] = useState(() => new GuestSessionManager(convex));
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [localStorageInfo, setLocalStorageInfo] = useState<any>({});

  useEffect(() => {
    checkGuestSession();
  }, []);

  const checkGuestSession = async () => {
    // Check localStorage
    const guestSessionRaw = localStorage.getItem('parparty_guest_session');
    const deviceId = localStorage.getItem('parparty_device_id');
    
    setLocalStorageInfo({
      guestSession: guestSessionRaw ? JSON.parse(guestSessionRaw) : null,
      deviceId: deviceId,
      allKeys: Object.keys(localStorage),
    });

    // Check using GuestSessionManager
    try {
      const session = await guestSessionManager.getCurrentSession();
      setSessionInfo(session);
    } catch (error) {
      console.error('Error getting session:', error);
      setSessionInfo({ error: error.message });
    }
  };

  const createNewSession = async () => {
    try {
      const session = await guestSessionManager.createSession('Test Player');
      setSessionInfo(session);
      checkGuestSession();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const setActiveGame = () => {
    const testGameId = 'test_game_123';
    guestSessionManager.setActiveGameId(testGameId as any);
    checkGuestSession();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Guest Session Debug Page</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>localStorage Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(localStorageInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GuestSessionManager Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(sessionInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button onClick={checkGuestSession}>Refresh Info</Button>
          <Button onClick={createNewSession} variant="secondary">Create New Session</Button>
          <Button onClick={setActiveGame} variant="outline">Set Test Active Game</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Continue Button Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p>To test continue functionality:</p>
            <ol className="list-decimal list-inside space-y-2 mt-2">
              <li>Go to a game URL like /game/js7cg7hash9xxkccx718x6y3s57mwht4</li>
              <li>The game should set activeGameId in the guest session</li>
              <li>Navigate back to / and check if Continue button appears</li>
              <li>Check this page to see the session state</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}