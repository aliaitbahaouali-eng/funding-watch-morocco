import { Card, Alert } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth';

export default async function SettingsPage() {
  const session = await getCurrentUser();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Paramètres du compte</h1>
        <p className="mt-1 text-slate-500">Gérez votre compte utilisateur.</p>
      </div>

      <Card>
        <p className="text-xs font-bold uppercase text-slate-500">Email</p>
        <p className="mt-1 text-lg font-bold">{session?.user?.email}</p>
        <p className="mt-2 text-sm text-slate-500">Pour modifier votre email ou votre mot de passe, utilisez le lien « mot de passe oublié » à la connexion ou contactez-nous.</p>
      </Card>

      <Card>
        <p className="text-xs font-bold uppercase text-slate-500">Rôle</p>
        <p className="mt-1 text-lg font-bold capitalize">{session?.profile?.role}</p>
      </Card>

      <Alert type="warning">
        La suppression de compte est définitive. Pour supprimer votre compte, écrivez-nous à contact@fundingwatch.ma.
      </Alert>
    </div>
  );
}
