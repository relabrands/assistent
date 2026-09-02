import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Task } from '@/types/database';

export type PomodoroMode = 'pomodoro' | 'shortBreak' | 'longBreak';

interface PomodoroTimerProps {
  currentTask: Task | null;
  onTaskComplete?: (taskId: string) => void;
}

const MODE_TIMES = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

const MODE_LABELS = {
  pomodoro: 'Enfoque',
  shortBreak: 'Descanso Corto',
  longBreak: 'Descanso Largo',
};

export function PomodoroTimer({ currentTask, onTaskComplete }: PomodoroTimerProps) {
  const [mode, setMode] = useState<PomodoroMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(MODE_TIMES['pomodoro']);
  const [isRunning, setIsRunning] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create an audio element for notifications
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      
      // Auto-switch mode or ask user
      if (mode === 'pomodoro') {
        setMode('shortBreak');
        setTimeLeft(MODE_TIMES['shortBreak']);
      } else {
        setMode('pomodoro');
        setTimeLeft(MODE_TIMES['pomodoro']);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode]);

  const handleModeChange = (newMode: PomodoroMode) => {
    setMode(newMode);
    setTimeLeft(MODE_TIMES[newMode]);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODE_TIMES[mode]);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const totalSeconds = MODE_TIMES[mode];
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  return (
    <div className="flex flex-col items-center p-4 sm:p-8 bg-card rounded-3xl border shadow-sm w-full max-w-md mx-auto">
      {/* Mode Selector */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-full mb-8 w-full">
        {(Object.keys(MODE_TIMES) as PomodoroMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={cn(
              "flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all",
              mode === m 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Timer Circle */}
      <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center mb-6 sm:mb-8">
        <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 256 256">
          <circle
            cx="128"
            cy="128"
            r="120"
            className="stroke-muted fill-none"
            strokeWidth="8"
          />
          <circle
            cx="128"
            cy="128"
            r="120"
            className={cn(
              "fill-none transition-all duration-1000 ease-linear",
              mode === 'pomodoro' ? 'stroke-primary' : 'stroke-emerald-500'
            )}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 120}
            strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
          />
        </svg>
        <div className="text-4xl sm:text-6xl font-bold tracking-tighter tabular-nums text-foreground z-10">
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={toggleTimer}
          size="lg"
          className={cn(
            "w-24 h-14 rounded-2xl text-lg font-medium",
            isRunning ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </Button>
        <Button 
          onClick={resetTimer}
          variant="outline"
          size="icon"
          className="w-14 h-14 rounded-2xl"
        >
          <RotateCcw className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      {currentTask && (
        <div className="mt-8 p-4 bg-muted/30 rounded-2xl w-full text-center border">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Enfocado en</p>
          <p className="text-sm font-semibold truncate px-2">{currentTask.title}</p>
          {onTaskComplete && (
            <Button 
              variant="link" 
              size="sm" 
              className="mt-2 text-xs"
              onClick={() => onTaskComplete(currentTask.id)}
            >
              Marcar como completada
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
