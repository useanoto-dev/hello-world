import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  cpf: string;
  password: string;
}

interface CreateStaffRequest {
  store_id: string;
  name: string;
  cpf: string;
  role: string;
  password: string;
}

interface UpdatePasswordRequest {
  staff_id: string;
  password: string;
}

interface VerifyPasswordRequest {
  staff_id: string;
  password: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    

    if (action === 'login') {
      const { cpf, password } = await req.json() as LoginRequest;
      
      if (!cpf || !password) {
        return new Response(
          JSON.stringify({ error: 'CPF e senha são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cleanCpf = cpf.replace(/\D/g, '');
      
      // Fetch staff member
      const { data: staff, error: fetchError } = await supabase
        .from('store_staff')
        .select('id, name, role, is_active, password_hash, locked_until, failed_login_attempts, store_id, cpf')
        .eq('cpf', cleanCpf)
        .eq('is_deleted', false)
        .maybeSingle();

      if (fetchError) {
        console.error('Database error:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar funcionário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!staff) {
        return new Response(
          JSON.stringify({ error: 'CPF não encontrado', code: 'USER_NOT_FOUND' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!staff.is_active) {
        return new Response(
          JSON.stringify({ error: 'Usuário desativado. Contate o administrador.', code: 'USER_INACTIVE' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
        return new Response(
          JSON.stringify({ error: 'Conta bloqueada. Tente novamente mais tarde.', code: 'ACCOUNT_LOCKED' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify password - support both bcrypt hashed and legacy plaintext for migration
      let passwordValid = false;
      
      if (staff.password_hash) {
        // Check if it's a bcrypt hash (starts with $2)
        if (staff.password_hash.startsWith('$2')) {
          passwordValid = await bcrypt.compare(password, staff.password_hash);
        } else {
          // Legacy plaintext comparison - migrate to hash after successful login
          passwordValid = staff.password_hash === password;
          
          if (passwordValid) {
            // Migrate to bcrypt hash
            const hashedPassword = await bcrypt.hash(password);
            await supabase
              .from('store_staff')
              .update({ password_hash: hashedPassword })
              .eq('id', staff.id);
            console.log('Migrated password to bcrypt for staff:', staff.id);
          }
        }
      }

      if (!passwordValid) {
        const newAttempts = (staff.failed_login_attempts || 0) + 1;
        const updates: Record<string, unknown> = { failed_login_attempts: newAttempts };
        
        if (newAttempts >= 5) {
          updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }
        
        await supabase.from('store_staff').update(updates).eq('id', staff.id);
        
        // Log failed attempt
        await supabase.from('audit_logs').insert({
          store_id: staff.store_id,
          staff_id: staff.id,
          action: 'login_failed',
          module: 'auth',
          record_id: staff.id,
          details: { attempts: newAttempts },
        });

        const errorMsg = newAttempts >= 5 ? 'Conta bloqueada por 30 minutos' : 'Senha incorreta';
        return new Response(
          JSON.stringify({ error: errorMsg, code: 'INVALID_PASSWORD', attempts: newAttempts }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Success - reset attempts and update last login
      await supabase
        .from('store_staff')
        .update({ 
          failed_login_attempts: 0, 
          locked_until: null,
          last_login_at: new Date().toISOString()
        })
        .eq('id', staff.id);

      // Log successful login
      await supabase.from('audit_logs').insert({
        store_id: staff.store_id,
        staff_id: staff.id,
        action: 'login',
        module: 'auth',
        record_id: staff.id,
        details: { role: staff.role },
      });

      

      return new Response(
        JSON.stringify({ 
          success: true,
          staff: {
            id: staff.id,
            name: staff.name,
            role: staff.role,
            store_id: staff.store_id,
            cpf: cleanCpf
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create-staff') {
      const { store_id, name, cpf, role, password } = await req.json() as CreateStaffRequest;
      
      if (!store_id || !name || !cpf || !role || !password) {
        return new Response(
          JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Senha deve ter no mínimo 6 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cleanCpf = cpf.replace(/\D/g, '');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(password);
      
      // Create staff member
      const { data: newStaff, error: createError } = await supabase
        .from('store_staff')
        .insert({
          store_id,
          name,
          cpf: cleanCpf,
          role,
          password_hash: hashedPassword,
        })
        .select('id, name, role, cpf')
        .single();

      if (createError) {
        console.error('Create staff error:', createError);
        if (createError.message?.includes('duplicate')) {
          return new Response(
            JSON.stringify({ error: 'CPF já cadastrado para esta loja' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Erro ao criar usuário' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        store_id,
        action: 'CREATE_USER',
        module: 'staff',
        record_id: newStaff.id,
        details: { name, role },
      });

      console.log('Staff created:', newStaff.id);

      return new Response(
        JSON.stringify({ success: true, staff: newStaff }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update-password') {
      const { staff_id, password } = await req.json() as UpdatePasswordRequest;
      
      if (!staff_id || !password) {
        return new Response(
          JSON.stringify({ error: 'ID do funcionário e senha são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Senha deve ter no mínimo 6 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password);
      
      // Update password
      const { error: updateError } = await supabase
        .from('store_staff')
        .update({ password_hash: hashedPassword })
        .eq('id', staff_id);

      if (updateError) {
        console.error('Update password error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar senha' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get store_id for audit
      const { data: staff } = await supabase
        .from('store_staff')
        .select('store_id')
        .eq('id', staff_id)
        .single();

      if (staff) {
        await supabase.from('audit_logs').insert({
          store_id: staff.store_id,
          action: 'UPDATE_PASSWORD',
          module: 'staff',
          record_id: staff_id,
          details: { password_changed: true },
        });
      }

      console.log('Password updated for staff:', staff_id);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Staff auth error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
