import { useAuth } from '@/hooks/useAuth';
import { useInviteHandler } from '@/hooks/useInviteHandler';
import { AuthForm } from '@/components/AuthForm';
import { Dashboard } from '@/components/Dashboard';
import { InvitationModal } from '@/components/InvitationModal';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { isAuthenticated, loading, profile } = useAuth();
  const { pendingInvite, loading: inviteLoading, acceptInvitation, declineInvitation } = useInviteHandler(profile);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthForm />;
  }

  return (
    <>
      <Dashboard />
      
      {pendingInvite && (
        <InvitationModal
          open={true}
          invitation={pendingInvite.invitation}
          workspace={pendingInvite.workspace}
          loading={inviteLoading}
          onAccept={acceptInvitation}
          onDecline={declineInvitation}
        />
      )}
    </>
  );
};

export default Index;
