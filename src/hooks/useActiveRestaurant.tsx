// Hook utilitário para obter o restaurante ativo no painel administrativo
// Fontes de dados (em ordem de prioridade):
// 1. Parâmetro de rota (/restaurantes/:id)
// 2. Sessão do usuário (profile.store_id)

import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ActiveRestaurantResult {
  restaurantId: string | null;
  isLoading: boolean;
  error: string | null;
  source: "route" | "session" | null;
}

/**
 * Hook para obter o restaurante ativo no painel administrativo
 * 
 * @returns {ActiveRestaurantResult} Objeto contendo:
 * - restaurantId: ID do restaurante ativo ou null
 * - isLoading: Se ainda está carregando dados do usuário
 * - error: Mensagem de erro se não encontrar restaurante
 * - source: De onde veio o ID ("route" | "session")
 * 
 * @example
 * const { restaurantId, isLoading, error } = useActiveRestaurant();
 * 
 * if (isLoading) return <Loading />;
 * if (error) return <Error message={error} />;
 * 
 * // Usar restaurantId com segurança
 */
export function useActiveRestaurant(): ActiveRestaurantResult {
  const params = useParams<{ id?: string }>();
  const { profile, loading: isAuthLoading } = useAuth();

  // Prioridade 1: Parâmetro de rota
  if (params.id) {
    return {
      restaurantId: params.id,
      isLoading: false,
      error: null,
      source: "route",
    };
  }

  // Prioridade 2: Sessão do usuário
  if (isAuthLoading) {
    return {
      restaurantId: null,
      isLoading: true,
      error: null,
      source: null,
    };
  }

  if (profile?.store_id) {
    return {
      restaurantId: profile.store_id,
      isLoading: false,
      error: null,
      source: "session",
    };
  }

  // Nenhuma fonte disponível
  return {
    restaurantId: null,
    isLoading: false,
    error: "Nenhum restaurante ativo encontrado. Faça login novamente.",
    source: null,
  };
}

/**
 * Função utilitária para obter restaurante_id de forma síncrona
 * Útil para funções que não podem usar hooks
 * 
 * @param profile - Objeto profile do usuário
 * @param routeId - ID vindo de parâmetros de rota (opcional)
 * @returns Objeto com restaurantId ou error
 */
export function getActiveRestaurantId(
  profile: { store_id?: string | null } | null,
  routeId?: string
): { restaurantId: string; error: null } | { restaurantId: null; error: string } {
  // Prioridade 1: Parâmetro de rota
  if (routeId) {
    return { restaurantId: routeId, error: null };
  }

  // Prioridade 2: Sessão do usuário
  if (profile?.store_id) {
    return { restaurantId: profile.store_id, error: null };
  }

  // Nenhuma fonte disponível
  return {
    restaurantId: null,
    error: "Nenhum restaurante ativo encontrado. Faça login novamente.",
  };
}

/**
 * Função que lança erro se não encontrar restaurante
 * Útil para garantir que o código só execute com restaurante válido
 * 
 * @param profile - Objeto profile do usuário
 * @param routeId - ID vindo de parâmetros de rota (opcional)
 * @returns restaurantId garantido (ou lança erro)
 * @throws Error se não encontrar restaurante
 */
export function requireActiveRestaurantId(
  profile: { store_id?: string | null } | null,
  routeId?: string
): string {
  const result = getActiveRestaurantId(profile, routeId);
  
  if (result.error) {
    throw new Error(result.error);
  }
  
  return result.restaurantId;
}
