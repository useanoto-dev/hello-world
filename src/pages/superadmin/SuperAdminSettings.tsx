import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Database, Bell, Lock, RefreshCw } from "lucide-react";

export default function SuperAdminSettings() {
  return (
    <div className="p-6 space-y-6">
      <div className="admin-page-header">
        <h1 className="admin-page-title text-2xl">
          Configurações do Sistema
        </h1>
        <p className="admin-page-description">
          Gerencie configurações globais do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Settings */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">Segurança</CardTitle>
                <CardDescription>
                  Configurações de segurança do sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" disabled>
              <Lock className="w-4 h-4 mr-2" />
              Políticas de RLS
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Shield className="w-4 h-4 mr-2" />
              Auditoria de Acessos
            </Button>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">Banco de Dados</CardTitle>
                <CardDescription>
                  Gerenciamento do banco de dados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" disabled>
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpar Cache
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              <Database className="w-4 h-4 mr-2" />
              Backup Manual
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="admin-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">Notificações</CardTitle>
                <CardDescription>
                  Configurações de alertas do sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" disabled>
              <Bell className="w-4 h-4 mr-2" />
              Alertas de Uso
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="admin-card bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <p className="text-sm text-foreground">
            <strong>Nota:</strong> Algumas funcionalidades estão em desenvolvimento e serão habilitadas em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
