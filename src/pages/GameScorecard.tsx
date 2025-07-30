import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function GameScorecard() {
  const { gameId } = useParams<{ gameId: string }>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-green-800">
            Live Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-600">
            Game ID: {gameId}
          </div>
          <div className="mt-4 text-center text-gray-500">
            Scorecard interface coming soon...
          </div>
        </CardContent>
      </Card>
    </div>
  );
}