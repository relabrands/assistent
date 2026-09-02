import { useState } from 'react';
import { PomodoroTimer } from './PomodoroTimer';
import { Task } from '@/types/database';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Timer } from 'lucide-react';

interface PomodoroViewProps {
  tasks: Task[];
  onTaskComplete?: (taskId: string) => void;
}

export function PomodoroView({ tasks, onTaskComplete }: PomodoroViewProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('none');

  // Filter tasks to only show incomplete tasks assigned to the user or in inbox/week
  const availableTasks = tasks.filter(t => t.status !== 'completed');
  
  const currentTask = availableTasks.find(t => t.id === selectedTaskId) || null;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <Timer className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Modo Enfoque</h2>
        <p className="text-muted-foreground max-w-md">
          Usa la técnica Pomodoro para mantener la concentración. Trabaja en intervalos de 25 minutos separados por breves descansos.
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-8 md:col-start-3">
          <PomodoroTimer 
            currentTask={currentTask} 
            onTaskComplete={(id) => {
              if (onTaskComplete) {
                onTaskComplete(id);
                setSelectedTaskId('none');
              }
            }} 
          />
        </div>

        <div className="md:col-span-8 md:col-start-3 mt-4">
          <div className="bg-card border rounded-2xl p-6 shadow-sm">
            <Label className="text-sm font-medium mb-3 block">
              ¿En qué tarea vas a enfocarte?
            </Label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Selecciona una tarea (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin tarea específica</SelectItem>
                {availableTasks.map(task => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
