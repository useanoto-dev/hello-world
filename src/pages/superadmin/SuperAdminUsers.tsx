import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, User, Store, Mail, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserWithStore {
  id: string;
  email: string;
  full_name: string | null;
  store_id: string | null;
  store_name: string | null;
  is_owner: boolean;
  created_at: string;
}

export default function SuperAdminUsers() {
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["superadmin-users"],
    queryFn: async () => {
      const { data: profilesData, error } = await supabase
        .from("profiles")
        .select(`
          id,
          email,
          full_name,
          store_id,
          is_owner,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch store names
      const usersWithStores: UserWithStore[] = await Promise.all(
        (profilesData || []).map(async (profile) => {
          let storeName = null;
          if (profile.store_id) {
            const { data: storeData } = await supabase
              .from("stores")
              .select("name")
              .eq("id", profile.store_id)
              .maybeSingle();
            storeName = storeData?.name || null;
          }

          return {
            ...profile,
            store_name: storeName,
          };
        })
      );

      return usersWithStores;
    },
  });

  const filteredUsers = users?.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.store_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="admin-page-header">
        <h1 className="admin-page-title text-2xl">
          Gerenciar Usuários
        </h1>
        <p className="admin-page-description">
          {users?.length || 0} usuários cadastrados no sistema
        </p>
      </div>

      {/* Search */}
      <Card className="admin-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou loja..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="admin-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="admin-table-header">Usuário</TableHead>
                <TableHead className="admin-table-header">Email</TableHead>
                <TableHead className="admin-table-header">Loja</TableHead>
                <TableHead className="admin-table-header text-center">Tipo</TableHead>
                <TableHead className="admin-table-header text-center">Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                      Carregando...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredUsers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="admin-table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">
                          {user.full_name || "Sem nome"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="admin-table-cell">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell className="admin-table-cell">
                      {user.store_name ? (
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Store className="w-3 h-3 text-muted-foreground" />
                          {user.store_name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="admin-table-cell text-center">
                      <Badge
                        className={cn(
                          "text-xs",
                          user.is_owner
                            ? "bg-primary/20 text-primary hover:bg-primary/20"
                            : "bg-muted text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {user.is_owner ? "Proprietário" : "Usuário"}
                      </Badge>
                    </TableCell>
                    <TableCell className="admin-table-cell text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
