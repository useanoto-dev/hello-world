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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gerenciar Usuários
        </h1>
        <p className="text-gray-500 mt-1">
          {users?.length || 0} usuários cadastrados no sistema
        </p>
      </div>

      {/* Search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead className="text-center">Tipo</TableHead>
                <TableHead className="text-center">Criado em</TableHead>
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
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="font-medium">
                          {user.full_name || "Sem nome"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.store_name ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Store className="w-3 h-3 text-gray-400" />
                          {user.store_name}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={user.is_owner ? "default" : "secondary"}
                        className={
                          user.is_owner
                            ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
                            : ""
                        }
                      >
                        {user.is_owner ? "Proprietário" : "Usuário"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
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
