# Relatório de Audit de Dados Pessoais (PII)

**Data:** 2026-01-22  
**Projeto:** Anotô SaaS  
**Supabase Project ID:** wxiyjvtqgvbvcscbxxnq

---

## 📋 Resumo Executivo

Este documento lista todas as tabelas do banco de dados que contêm Dados Pessoais Identificáveis (PII) e as medidas de proteção implementadas.

---

## 🔴 Tabelas com PII Crítico

### 1. `customers`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `name` | Nome completo | RLS: apenas store owners |
| `phone` | Telefone | RLS: apenas store owners |
| `email` | Email | RLS: apenas store owners |
| `address` | Endereço | RLS: apenas store owners |

**Política RLS:** `Owners manage customers`

### 2. `orders`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `customer_name` | Nome | RLS: store owners + tracking |
| `customer_phone` | Telefone | RLS: store owners + tracking |
| `customer_email` | Email | RLS: store owners + tracking |
| `address` | Endereço de entrega | RLS: store owners + tracking |

**Política RLS:** `Restricted order access`

### 3. `customer_points`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `customer_phone` | Telefone | RLS: apenas store owners |
| `customer_cpf` | CPF (documento fiscal) | RLS: apenas store owners |
| `customer_name` | Nome | RLS: apenas store owners |

**Política RLS:** `Owners manage points`

### 4. `store_staff`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `name` | Nome do funcionário | RLS: store owners |
| `cpf` | CPF (documento) | RLS: store owners |
| `password_hash` | Hash de senha | RLS: store owners, hash bcrypt |

**Política RLS:** Existente (store owners only)

### 5. `profiles`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `email` | Email | RLS: próprio usuário ou super_admin |
| `full_name` | Nome | RLS: próprio usuário ou super_admin |
| `phone` | Telefone | RLS: próprio usuário ou super_admin |

**Política RLS:** `Users can view own profile`

---

## 🟡 Tabelas com PII Moderado

### 6. `reviews`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `customer_name` | Nome | View pública mascara nome |
| `customer_phone` | Telefone | **NÃO exposto** em views públicas |

**View Segura:** `v_public_reviews` (mascara nome, omite telefone)

### 7. `table_reservations`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `customer_name` | Nome | RLS: store owners |
| `customer_phone` | Telefone | RLS: store owners |

**Política RLS:** `Owners manage reservations`

### 8. `point_transactions`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `customer_phone` | Telefone | RLS: apenas store owners |
| `customer_cpf` | CPF | RLS: apenas store owners |

**Política RLS:** `Owners manage transactions`

### 9. `whatsapp_messages`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `customer_phone` | Telefone | RLS: store owners |
| `message_content` | Conteúdo privado | RLS: store owners |

**Política RLS:** `Owners manage whatsapp`

---

## 🟢 Tabelas com Dados de Infraestrutura

### 10. `audit_logs`
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `ip_address` | IP do usuário | RLS: store owners |
| `user_agent` | Navegador | RLS: store owners |

### 11. `pii_access_logs` (NOVA)
| Campo | Tipo de PII | Proteção |
|-------|-------------|----------|
| `ip_address` | IP do acesso | RLS: store owners |
| `user_agent` | Navegador | RLS: store owners |

---

## ✅ Medidas de Proteção Implementadas

### 1. Row Level Security (RLS)
- ✅ Todas as tabelas com PII têm RLS habilitado
- ✅ Políticas restritivas vinculadas a `is_store_owner()` ou `auth.uid()`
- ✅ Funções SECURITY DEFINER hardened com verificação de `auth.uid()`

### 2. Views Públicas Seguras
- ✅ `v_public_reviews` - Omite telefone, mascara nomes
- ✅ `v_public_stores` - Omite tokens e chaves API
- ✅ `v_public_products` - Omite dados de estoque interno
- ✅ `v_order_tracking` - Apenas status, sem dados pessoais

### 3. Funções de Proteção
- ✅ `get_public_reviews()` - Retorna reviews sem PII
- ✅ `get_safe_store_data()` - Oculta campos sensíveis para não-owners
- ✅ `log_pii_access()` - Registra acessos a dados sensíveis

### 4. Rate Limiting
- ✅ Tabela `rate_limits` para controle de requisições
- ✅ Função `check_rate_limit()` para Edge Functions
- ✅ Presets configurados (strict, standard, messaging)

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Total de tabelas com PII | 11 |
| Tabelas com RLS habilitado | 100% |
| Campos sensíveis identificados | ~25 |
| Views públicas seguras | 12 |

---

## 🔧 Recomendações Pendentes

1. **Ativar Leaked Password Protection** no Supabase Auth
2. **Implementar data retention** - Limpar logs antigos automaticamente
3. **Considerar criptografia at-rest** para CPFs (além do RLS)
4. **Implementar audit logging** quando CPFs são acessados

---

## 📝 Changelog

| Data | Ação |
|------|------|
| 2026-01-22 | Criação do relatório inicial |
| 2026-01-22 | Implementação das views públicas |
| 2026-01-22 | Hardening de políticas RLS |
| 2026-01-22 | Criação de rate limiting e PII access logs |
| 2026-01-22 | Remoção de políticas permissivas de customer_points e point_transactions |
| 2026-01-22 | Frontend atualizado para usar v_public_stores em vez de acesso direto |
| 2026-01-22 | BannerCarousel e ReviewsSection atualizados para usar v_public_* views |
