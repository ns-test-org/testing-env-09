'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const GHOST_SPEED = 200;
const POWER_UP_DURATION = 8000;
const FRIGHTENED_SPEED = 300;

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GhostMode = 'chase' | 'scatter' | 'frightened';

interface Ghost {
  id: string;
  position: Position;
  direction: Direction;
  color: string;
  mode: GhostMode;
  startPosition: Position;
}

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
  [1,1,1,1,2,1,0,1,1,4,4,1,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,4,4,4,4,1,0,0,2,0,0,0,0],
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

const INITIAL_GHOSTS: Ghost[] = [
  { id: 'blinky', position: { x: 9, y: 9 }, direction: 'UP', color: '#FF0000', mode: 'chase', startPosition: { x: 9, y: 9 } },
  { id: 'pinky', position: { x: 10, y: 9 }, direction: 'DOWN', color: '#FFB8FF', mode: 'scatter', startPosition: { x: 10, y: 9 } },
  { id: 'inky', position: { x: 9, y: 10 }, direction: 'UP', color: '#00FFFF', mode: 'scatter', startPosition: { x: 9, y: 10 } },
  { id: 'clyde', position: { x: 10, y: 10 }, direction: 'DOWN', color: '#FFB851', mode: 'scatter', startPosition: { x: 10, y: 10 } },
];

export default function PacManGame() {
  const [pacman, setPacman] = useState<Position>({ x: 1, y: 1 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [nextDirection, setNextDirection] = useState<Direction>('RIGHT');
  const [dots, setDots] = useState<boolean[][]>(() => 
    MAZE.map(row => row.map(cell => cell === 2 || cell === 3))
  );
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [ghosts, setGhosts] = useState<Ghost[]>(INITIAL_GHOSTS);
  const [powerUpActive, setPowerUpActive] = useState(false);
  const [level, setLevel] = useState(1);
  const [isLightTheme, setIsLightTheme] = useState(false);
  const powerUpTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isValidMove = useCallback((pos: Position) => {
    if (pos.x < 0 || pos.x >= GRID_SIZE || pos.y < 0 || pos.y >= GRID_SIZE) return false;
    const cell = MAZE[pos.y][pos.x];
    return cell !== 1;
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

  const getDistance = useCallback((pos1: Position, pos2: Position) => {
    return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
  }, []);

  const getValidDirections = useCallback((pos: Position): Direction[] => {
    const directions: Direction[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    return directions.filter(dir => {
      const nextPos = getNextPosition(pos, dir);
      return isValidMove(nextPos);
    });
  }, [getNextPosition, isValidMove]);

  const getGhostNextDirection = useCallback((ghost: Ghost, target: Position): Direction => {
    const validDirs = getValidDirections(ghost.position);
    if (validDirs.length === 0) return ghost.direction;

    if (ghost.mode === 'frightened') {
      return validDirs[Math.floor(Math.random() * validDirs.length)];
    }

    let bestDir = ghost.direction;
    let bestDistance = Infinity;

    for (const dir of validDirs) {
      const nextPos = getNextPosition(ghost.position, dir);
      const distance = getDistance(nextPos, target);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestDir = dir;
      }
    }

    return bestDir;
  }, [getValidDirections, getNextPosition, getDistance]);

  const checkCollision = useCallback((pacPos: Position, ghostPos: Position) => {
    return pacPos.x === ghostPos.x && pacPos.y === ghostPos.y;
  }, []);

  const handleGhostCollision = useCallback((ghost: Ghost) => {
    if (powerUpActive) {
      setScore(prev => prev + 200);
      setGhosts(prev => prev.map(g => 
        g.id === ghost.id 
          ? { ...g, position: g.startPosition, mode: 'scatter' as GhostMode }
          : g
      ));
    } else {
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameOver(true);
        }
        return newLives;
      });
      setPacman({ x: 1, y: 1 });
      setGhosts(INITIAL_GHOSTS);
    }
  }, [powerUpActive]);

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
          
          const isPowerPellet = MAZE[newPos.y][newPos.x] === 3;
          const points = isPowerPellet ? 50 : 10;
          setScore(prev => prev + points);

          if (isPowerPellet) {
            setPowerUpActive(true);
            setGhosts(prev => prev.map(g => ({ ...g, mode: 'frightened' as GhostMode })));
            
            if (powerUpTimerRef.current) {
              clearTimeout(powerUpTimerRef.current);
            }
            
            powerUpTimerRef.current = setTimeout(() => {
              setPowerUpActive(false);
              setGhosts(prev => prev.map(g => ({ ...g, mode: 'chase' as GhostMode })));
            }, POWER_UP_DURATION);
          }
        }

        ghosts.forEach(ghost => {
          if (checkCollision(newPos, ghost.position)) {
            handleGhostCollision(ghost);
          }
        });

        return newPos;
      });
    }, INITIAL_SPEED);

    return () => {
      clearInterval(gameLoop);
      if (powerUpTimerRef.current) {
        clearTimeout(powerUpTimerRef.current);
      }
    };
  }, [direction, nextDirection, dots, gameOver, gameWon, ghosts, isValidMove, getNextPosition, checkCollision, handleGhostCollision]);

  useEffect(() => {
    if (gameOver || gameWon) return;

    const ghostLoop = setInterval(() => {
      setGhosts(prevGhosts => 
        prevGhosts.map(ghost => {
          const target = ghost.mode === 'chase' ? pacman : { x: 1, y: 1 };
          const newDirection = getGhostNextDirection(ghost, target);
          const newPosition = getNextPosition(ghost.position, newDirection);

          if (isValidMove(newPosition)) {
            if (checkCollision(pacman, newPosition)) {
              handleGhostCollision(ghost);
            }
            return { ...ghost, position: newPosition, direction: newDirection };
          }
          
          return ghost;
        })
      );
    }, powerUpActive ? FRIGHTENED_SPEED : GHOST_SPEED);

    return () => clearInterval(ghostLoop);
  }, [gameOver, gameWon, pacman, powerUpActive, getGhostNextDirection, getNextPosition, isValidMove, checkCollision, handleGhostCollision]);

  useEffect(() => {
    const allDotsEaten = dots.every(row => row.every(dot => !dot));
    if (allDotsEaten && !gameWon) {
      setLevel(prev => prev + 1);
      setDots(MAZE.map(row => row.map(cell => cell === 2 || cell === 3)));
      setPacman({ x: 1, y: 1 });
      setGhosts(INITIAL_GHOSTS);
      setScore(prev => prev + 1000);
    }
  }, [dots, gameWon]);

  const resetGame = () => {
    setPacman({ x: 1, y: 1 });
    setDirection('RIGHT');
    setNextDirection('RIGHT');
    setDots(MAZE.map(row => row.map(cell => cell === 2 || cell === 3)));
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameOver(false);
    setGameWon(false);
    setGhosts(INITIAL_GHOSTS);
    setPowerUpActive(false);
    if (powerUpTimerRef.current) {
      clearTimeout(powerUpTimerRef.current);
    }
  };

  return (
    <div className={`relative h-[100dvh] w-full overflow-hidden flex items-center justify-center transition-colors ${
      isLightTheme ? 'bg-gray-100 text-gray-900' : 'bg-black text-white'
    }`}>
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center justify-between w-full max-w-[400px] px-4">
          <div className="flex gap-4 items-center">
            <div className="text-xl font-bold">Score: {score}</div>
            <div className="text-xl font-bold">Level: {level}</div>
            <div className="flex gap-1">
              {Array.from({ length: lives }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 bg-yellow-400 rounded-full"
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsLightTheme(!isLightTheme)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                isLightTheme 
                  ? 'bg-gray-800 hover:bg-gray-900 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
              }`}
            >
              {isLightTheme ? '🌙' : '☀️'}
            </button>
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <div 
          className={`relative border-4 rounded-lg transition-colors ${
            isLightTheme ? 'border-blue-400' : 'border-blue-600'
          }`}
          style={{ 
            width: GRID_SIZE * CELL_SIZE, 
            height: GRID_SIZE * CELL_SIZE,
            backgroundColor: isLightTheme ? '#f3f4f6' : '#000'
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
                  backgroundColor: cell === 1 
                    ? (isLightTheme ? '#60a5fa' : '#1e40af') 
                    : cell === 4 
                    ? (isLightTheme ? '#93c5fd' : '#2563eb') 
                    : 'transparent',
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
                    className={powerUpActive ? 'animate-pulse' : ''}
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

          {ghosts.map(ghost => (
            <div
              key={ghost.id}
              style={{
                position: 'absolute',
                left: ghost.position.x * CELL_SIZE,
                top: ghost.position.y * CELL_SIZE,
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: ghost.mode === 'frightened' ? '#0000FF' : ghost.color,
                borderRadius: '50% 50% 0 0',
                transition: 'all 0.15s linear',
              }}
            >
              <div className="absolute bottom-0 left-0 right-0 flex justify-around">
                <div style={{ width: '4px', height: '4px', backgroundColor: ghost.mode === 'frightened' ? '#0000FF' : ghost.color }} />
                <div style={{ width: '4px', height: '4px', backgroundColor: ghost.mode === 'frightened' ? '#0000FF' : ghost.color }} />
                <div style={{ width: '4px', height: '4px', backgroundColor: ghost.mode === 'frightened' ? '#0000FF' : ghost.color }} />
              </div>
              {ghost.mode !== 'frightened' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: '5px',
                      top: '6px',
                      width: '4px',
                      height: '4px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '5px',
                      top: '6px',
                      width: '4px',
                      height: '4px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                    }}
                  />
                </>
              )}
            </div>
          ))}

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

        <div className={`text-center text-sm ${
          isLightTheme ? 'text-gray-600' : 'text-gray-400'
        }`}>
          Use Arrow Keys or WASD to move • Eat power pellets to chase ghosts!
        </div>

        {gameOver && (
          <div className={`absolute inset-0 flex items-center justify-center ${
            isLightTheme ? 'bg-white/90' : 'bg-black/80'
          }`}>
            <div className={`p-8 rounded-lg text-center border-4 border-red-600 ${
              isLightTheme ? 'bg-white' : 'bg-gray-900'
            }`}>
              <h2 className="text-4xl font-bold mb-4 text-red-400">Game Over!</h2>
              <p className="text-2xl mb-2">Final Score: {score}</p>
              <p className={`text-xl mb-6 ${
                isLightTheme ? 'text-gray-600' : 'text-gray-400'
              }`}>Level Reached: {level}</p>
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
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








