import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Unauthorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify the caller's JWT
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await admin.auth.getUser(token)
  if (authError || !user) return json({ error: 'Invalid token' }, 401)

  const uid = user.id

  // Delete all user data from every table (profiles cascades from auth.users)
  await Promise.all([
    admin.from('salary_logs').delete().eq('user_id', uid),
    admin.from('loans').delete().eq('user_id', uid),
    admin.from('savings_goals').delete().eq('user_id', uid),
    admin.from('budgets').delete().eq('user_id', uid),
  ])

  // Delete the auth user — this also cascades to the profiles row
  const { error: deleteError } = await admin.auth.admin.deleteUser(uid)
  if (deleteError) return json({ error: deleteError.message }, 500)

  return json({ success: true })
})
