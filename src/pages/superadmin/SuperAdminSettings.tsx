import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Database, Bell, Lock, RefreshCw } from "lucide-react";

export default function SuperAdminSettings() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configurações do Sistema
        </h1>
        <p className="text-gray-500 mt-1">
          Gerencie configurações globais do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              <CardTitle className="text-lg">Segurança</CardTitle>
            </div>
            <CardDescription>
              Configurações de segurança do sistema
            </CardDescription>
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
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Banco de Dados</CardTitle>
            </div>
            <CardDescription>
              Gerenciamento do banco de dados
            </CardDescription>
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
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-lg">Notificações</CardTitle>
            </div>
            <CardDescription>
              Configurações de alertas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" disabled>
              <Bell className="w-4 h-4 mr-2" />
              Alertas de Uso
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <p className="text-sm text-yellow-800">
            <strong>Nota:</strong> Algumas funcionalidades estão em desenvolvimento e serão habilitadas em breve.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
