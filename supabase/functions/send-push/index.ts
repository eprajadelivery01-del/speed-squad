import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { JWT } from "npm:google-auth-library@9"

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record
    
    // Only process INSERT events for deliveries
    if (payload.type !== 'INSERT' || !record) {
      return new Response("Not an insert event", { status: 200 })
    }

    // Apenas envia notificação se estiver pendente ou broadcasted
    if (record.status !== 'pending' && record.status !== 'broadcasted') {
       return new Response("Not a pending delivery", { status: 200 })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let query = supabaseClient
      .from('delivery_drivers')
      .select('fcm_token')
      .not('fcm_token', 'is', null)
      .eq('is_online', true)

    if (record.driver_id) {
       query = query.eq('id', record.driver_id)
    }

    const { data: drivers, error } = await query

    if (error || !drivers || drivers.length === 0) {
      return new Response("No online drivers with push tokens found", { status: 200 })
    }

    const tokens = drivers.map(d => d.fcm_token).filter(Boolean)
    console.log(`Enviando push para ${tokens.length} dispositivos...`)

    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountStr) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable. Add it via supabase secrets set FIREBASE_SERVICE_ACCOUNT='{...}'")
    }
    
    const serviceAccount = JSON.parse(serviceAccountStr)
    
    // Autenticar com Google usando JWT
    const client = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    })
    
    const accessTokenObj = await client.getAccessToken()
    const accessToken = accessTokenObj.token

    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    // Firebase HTTP v1 API aceita apenas 1 mensagem por request
    const requests = tokens.map(token => {
      const message = {
        message: {
          token: token,
          data: {
            deliveryId: record.id,
            details: `Coleta: ${record.pickup_address || 'Veja no app'}`,
            title: "🛵 Nova corrida disponível!",
            body: `Coleta: ${record.pickup_address || 'Veja no app'}`
          },
          android: {
            priority: "high"
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: "🛵 Nova corrida disponível!",
                  body: `Coleta: ${record.pickup_address || 'Veja no app'}`
                },
                sound: "default",
                category: "DELIVERY_ACTION"
              }
            }
          }
        }
      }
      
      return fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(message)
      }).then(res => res.json())
    })

    const results = await Promise.all(requests)
    console.log("FCM Results:", results)

    return new Response(JSON.stringify({ success: true, count: tokens.length }), {
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
