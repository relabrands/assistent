import { Client } from '@/types/content';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  Instagram, 
  Linkedin, 
  Youtube,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ClientCardProps {
  client: Client;
  contentCount?: number;
  pendingApprovalCount?: number;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClientCard({
  client,
  contentCount = 0,
  pendingApprovalCount = 0,
  onClick,
  onEdit,
  onDelete,
}: ClientCardProps) {
  const initials = client.brand_name 
    ? client.brand_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : client.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Card 
      className="group hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={client.logo_url || ''} alt={client.name} />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-base">{client.name}</h3>
              {client.brand_name && (
                <p className="text-sm text-muted-foreground">{client.brand_name}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Contact Info */}
        {(client.contact_email || client.contact_phone || client.website) && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {client.contact_email && (
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {client.contact_email}
              </span>
            )}
            {client.contact_phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {client.contact_phone}
              </span>
            )}
            {client.website && (
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" />
                {client.website.replace(/^https?:\/\//, '').slice(0, 25)}...
              </span>
            )}
          </div>
        )}

        {/* Social Links */}
        {(client.social_instagram || client.social_facebook || client.social_tiktok || client.social_linkedin || client.social_youtube) && (
          <div className="flex gap-2">
            {client.social_instagram && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                <Instagram className="w-3 h-3 mr-1" />
                IG
              </Badge>
            )}
            {client.social_facebook && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                FB
              </Badge>
            )}
            {client.social_tiktok && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                TT
              </Badge>
            )}
            {client.social_linkedin && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                <Linkedin className="w-3 h-3 mr-1" />
                LI
              </Badge>
            )}
            {client.social_youtube && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                <Youtube className="w-3 h-3 mr-1" />
                YT
              </Badge>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-3">
            <span className="text-sm">
              <span className="font-medium">{contentCount}</span>
              <span className="text-muted-foreground ml-1">contenidos</span>
            </span>
            {pendingApprovalCount > 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {pendingApprovalCount} pendientes
              </Badge>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
