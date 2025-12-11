'use client';

import { useEffect, useState, useCallback } from 'react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const MAZE = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,3,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,1,1,0,1,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,0,0,1,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,0,0,0,0,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export default function PacManGame() {
  const [pacman, setPacman] = useState<Position>({ x: 1, y: 1 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [nextDirection, setNextDirection] = useState<Direction>('RIGHT');
  const [dots, setDots] = useState<boolean[][]>(() => 
    MAZE.map(row => row.map(cell => cell === 2 || cell === 3))
  );
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const isValidMove = useCallback((pos: Position) => {
    if (pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE) return false;
    return MAZE[pos.y][pos.x] !== 1;
  }, []);

  const getNextPosition = useCallback((pos: Position, dir: Direction): Position => {
    const moves = {
      UP: { x: pos.x, y: pos.y - 1 },
      DOWN: { x: pos.x, y: pos.y + 1 },
      LEFT: { x: pos.x - 1, y: pos.y },
      RIGHT: { x: pos.x + 1, y: pos.y },
    };
    return moves[dir];
  }, []);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      const keyMap: { [key: string]: Direction } = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        s: 'DOWN',
        a: 'LEFT',
        d: 'RIGHT',
      };
      const newDir = keyMap[e.key];
      if (newDir) setNextDirection(newDir);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  useEffect(() => {
    if (gameOver || gameWon) return;

    const gameLoop = setInterval(() => {
      setPacman(prev => {
        let newPos = getNextPosition(prev, nextDirection);
        let currentDir = direction;

        if (isValidMove(newPos)) {
          currentDir = nextDirection;
        } else {
          newPos = getNextPosition(prev, direction);
          if (!isValidMove(newPos)) {
            return prev;
          }
        }

        setDirection(currentDir);

        if (dots[newPos.y][newPos.x]) {
          setDots(prevDots => {
            const newDots = prevDots.map(row => [...row]);
            newDots[newPos.y][newPos.x] = false;
            return newDots;
          });
          const points = MAZE[newPos.y][newPos.x] === 3 ? 50 : 10;
          setScore(prev => prev + points);
        }

        return newPos;
      });
    }, INITIAL_SPEED);

    return () => clearInterval(gameLoop);
  }, [direction, nextDirection, dots, gameOver, gameWon, isValidMove, getNextPosition]);

  useEffect(() => {
    const allDotsEaten = dots.every(row => row.every(dot => !dot));
    if (allDotsEaten && !gameWon) {
      setGameWon(true);
    }
  }, [dots, gameWon]);

  const resetGame = () => {
    setPacman({ x: 1, y: 1 });
    setDirection('RIGHT');
    setNextDirection('RIGHT');
    setDots(MAZE.map(row => row.map(cell => cell === 2 || cell === 3)));
    setScore(0);
    setGameOver(false);
    setGameWon(false);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center justify-between w-full max-w-[400px] px-4">
          <div className="text-2xl font-bold">Score: {score}</div>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Reset
          </button>
        </div>

        <div 
          className="relative border-4 border-blue-600 rounded-lg"
          style={{ 
            width: GRID_SIZE * CELL_SIZE, 
            height: GRID_SIZE * CELL_SIZE,
            backgroundColor: '#000'
          }}
        >
          {MAZE.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                style={{
                  position: 'absolute',
                  left: x * CELL_SIZE,
                  top: y * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: cell === 1 ? '#1e40af' : 'transparent',
                }}
              >
                {dots[y][x] && cell === 2 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '4px',
                      height: '4px',
                      backgroundColor: '#fbbf24',
                      borderRadius: '50%',
                    }}
                  />
                )}
                {dots[y][x] && cell === 3 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#fbbf24',
                      borderRadius: '50%',
                    }}
                  />
                )}
              </div>
            ))
          )}

          <div
            style={{
              position: 'absolute',
              left: pacman.x * CELL_SIZE,
              top: pacman.y * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: '#fbbf24',
              borderRadius: '50%',
              transition: 'all 0.1s linear',
            }}
          />
        </div>

        <div className="text-center text-sm text-gray-400">
          Use Arrow Keys or WASD to move
        </div>

        {gameWon && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="bg-gray-900 p-8 rounded-lg text-center">
              <h2 className="text-4xl font-bold mb-4 text-yellow-400">You Win!</h2>
              <p className="text-2xl mb-6">Final Score: {score}</p>
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

