import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ContentItem, 
  ContentStatus,
  CONTENT_STATUS_LABELS, 
  CONTENT_STATUS_COLORS, 
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  PLATFORM_LABELS,
  PLATFORM_COLORS 
} from '@/types/content';
import { Profile } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  Search, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  CheckCircle, 
  XCircle,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentListProps {
  contentItems: ContentItem[];
  profiles: Profile[];
  onEdit: (content: ContentItem) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => Promise<boolean>;
  onRequestChanges: (id: string) => Promise<boolean>;
  isClientView?: boolean;
}

export function ContentList({
  contentItems,
  profiles,
  onEdit,
  onDelete,
  onApprove,
  onRequestChanges,
  isClientView = false,
}: ContentListProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');

  const filteredContent = contentItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.copy?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getAssignee = (assignedTo: string | null) => {
    if (!assignedTo) return null;
    return profiles.find(p => p.id === assignedTo);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contenido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContentStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredContent.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {contentItems.length === 0 
              ? 'No hay contenidos aún' 
              : 'No se encontraron contenidos'}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Contenido</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                {!isClientView && <TableHead>Responsable</TableHead>}
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContent.map((content) => {
                const assignee = getAssignee(content.assigned_to);
                const canApprove = isClientView && (content.status === 'pending_review' || content.status === 'in_review');
                
                return (
                  <TableRow key={content.id}>
                    <TableCell>
                      <button
                        onClick={() => onEdit(content)}
                        className="text-left hover:text-primary transition-colors"
                      >
                        <div className="font-medium">{content.title}</div>
                        {content.copy && (
                          <div className="text-xs text-muted-foreground truncate max-w-[280px]">
                            {content.copy.slice(0, 60)}...
                          </div>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {CONTENT_TYPE_ICONS[content.content_type]} {CONTENT_TYPE_LABELS[content.content_type]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={cn(
                          'text-xs',
                          PLATFORM_COLORS[content.platform].bg,
                          PLATFORM_COLORS[content.platform].text
                        )}
                      >
                        {PLATFORM_LABELS[content.platform]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={cn(
                          'text-xs',
                          CONTENT_STATUS_COLORS[content.status].bg,
                          CONTENT_STATUS_COLORS[content.status].text
                        )}
                      >
                        {CONTENT_STATUS_LABELS[content.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {content.scheduled_date ? (
                        <span className="text-sm">
                          {format(new Date(content.scheduled_date), 'dd MMM yyyy', { locale: es })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin fecha</span>
                      )}
                    </TableCell>
                    {!isClientView && (
                      <TableCell>
                        {assignee ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={assignee.avatar_url || ''} />
                              <AvatarFallback className="text-xs">
                                {assignee.display_name?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{assignee.display_name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      {canApprove ? (
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => onApprove(content.id)}
                            title="Aprobar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            onClick={() => onRequestChanges(content.id)}
                            title="Solicitar cambios"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(content)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {isClientView ? 'Ver detalles' : 'Editar'}
                            </DropdownMenuItem>
                            {!isClientView && (
                              <DropdownMenuItem 
                                onClick={() => onDelete(content.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
