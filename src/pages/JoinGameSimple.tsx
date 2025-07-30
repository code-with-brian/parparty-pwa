import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function JoinGameSimple() {
  const { gameId } = useParams<{ gameId: string }>();

  return (
    <div className="min-h-screen gradient-golf-green flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-gradient">
            ⛳ Join Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-gray-700">Game ID: {gameId || 'None'}</p>
          </div>
          
          <Button className="w-full bg-green-600 hover:bg-green-700">
            Join Game
          </Button>
          
          <div className="text-center text-xs text-gray-500">
            This is a simplified version for testing
          </div>
        </CardContent>
      </Card>
    </div>
  );
}