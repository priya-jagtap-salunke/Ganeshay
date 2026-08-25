import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

type CreateVendorBody = {
  vendorId?: string;
  loginEmail: string;
  password: string;
  businessName?: string;
  phone?: string;
  address?: string;
  mapLink?: string;
  stallDescription?: string;
  bookingPrefix?: string;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: isAdmin, error: adminError } = await userClient.rpc(
      'is_super_admin'
    );

    if (adminError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as CreateVendorBody;
    const loginEmail = body.loginEmail?.trim().toLowerCase();
    const password = body.password?.trim();
    const existingVendorId = body.vendorId?.trim();

    if (!loginEmail || !password) {
      throw new Error('Login email and password are required');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const { data: createdUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email: loginEmail,
        password,
        email_confirm: true,
      });

    if (createUserError) {
      throw createUserError;
    }

    const userId = createdUser.user?.id;
    if (!userId) {
      throw new Error('Login user was not created');
    }

    let vendorId = existingVendorId;

    if (!vendorId) {
      const businessName = body.businessName?.trim();
      if (!businessName) {
        await adminClient.auth.admin.deleteUser(userId);
        throw new Error('Business name is required');
      }

      const phone = body.phone?.trim() ?? '';
      const address = body.address?.trim() ?? '';
      const mapLink = body.mapLink?.trim() ?? '';
      const stallDescription = body.stallDescription?.trim() ?? '';
      const bookingPrefix = (body.bookingPrefix?.trim() || 'ST').toUpperCase();

      const { data: createdVendorId, error: vendorError } = await userClient.rpc(
        'admin_create_vendor',
        {
          p_business_name: businessName,
          p_phone: phone,
          p_address: address,
          p_login_email: loginEmail,
          p_booking_prefix: bookingPrefix,
          p_map_link: mapLink,
          p_stall_description: stallDescription,
        }
      );

      if (vendorError) {
        await adminClient.auth.admin.deleteUser(userId);
        throw vendorError;
      }

      vendorId = createdVendorId;
    }

    const { error: linkError } = await userClient.rpc('admin_link_vendor_login', {
      p_vendor_id: vendorId,
      p_login_email: loginEmail,
    });

    if (linkError) {
      throw linkError;
    }

    return new Response(
      JSON.stringify({
        vendorId,
        loginEmail,
        message:
          'Vendor account created. Share login email and password with the stall owner.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
