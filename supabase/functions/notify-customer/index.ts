import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import admin from "npm:firebase-admin@11.11.1";

const serviceAccount = {
  type: "service_account",
  project_id: "e-pra-ja-a410d",
  private_key_id: "d8038724009d7230ce8cddb3840d9d856ca987e3",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDEM97wrIbbPEij\n8b51daQwbYH2NTEcAFRxPlPKZo/jguHmXo2R9kB88vb+vcgQW/EAJqJF3LeoT1dv\n7Utm03U2s927sr0ZMgRaqVvDmPx62q/b7XkYxfjwKZ05NIyRuyYneUtkfGKvVOea\nDOvRJ48I8QY9fNo540HLHaoeJw962NcLqlOP/EXlkN8aJc6bGb7BPu6BkPdwv/NS\nZIk2lulHbKBaryOyUKFY8YAxqN30Vi4J7aO8a7Vudtr72LZAM+wlAniSGyyJ04Mk\nWXt3SQCJ5CVxHkeYkCuKpCcs5iCEXAtRo1g4xEDA+Api8fy8AqCUdEd4G42VwZxj\n06aCkci9AgMBAAECggEAASu8vWAuAXYpccOuvf+nrSG8c1UQ4dD9vDQH0x7ctT6g\nX4gvTJIFxn803/D22Rrn7ToQ16aNx+1leXfyVfXAzUS4d+HB5PDVzel2cExUzWLi\nUwRIG5/hrZ2aVwS4W1zyBg7B3WvKsylAmMKCscA3HLrhlPxCLqccY3NLuclKjb0Q\nSN67bgbN+3l/yg2Ru9fx7oWlUppzys1wxY1AdaXaMk2eyEgAZ7YhbIGMwI77LimD\ntxH1C76ez+oq/drrK54eSG+cudLxFZ8JEMsdZflGW8FqkU0OuiUHbmcFX2Gqw1y7\n+yy751Xuhnl9hO+q1/sMptW9paR2MOePauzrt1Z+gQKBgQDkLE071kNtSiVO/q7X\nK3aREWjXbBYkCwdyQmxQDqmQAmg8VNWsIbKzKyx3NWovUEzVn+i9mJ1zYR8xMxOR\nUSx3rnTUL3JKGT+5/I3pdKR6cPx2geC+JbflRRxv5Nao5TC5l7bdbjtNOaTj0/sy\nlmvAAt/MnO3UIebGq8Gdi7WtYQKBgQDcIW7pqHzGiF8r6HQ1EdaxosWj9yyEVss0\nU5/hOnzFS/6Zc1XqlVjUy3n23e9ekIFuOXvMnqW3Hp+qRJL5kWRoKYHQ9CFC0r85\nQvtqZcJiswhjMHG6eLVkaURJVJiVVr9G8EipIGw9ul8Hy3+1RmtK7zUYe1pYJi+X\n9v/hFZSc3QKBgQCxFYzvhrAX7vabo1+wkQPZPMjAgBuC56hkzhZf37FLmgKp6DFZ\nAWI+WaCN+D+r7sdi+FNaakqwlEzwEzL5kiVP0W7MivJJfeUOhGrjJ+rLOEtH8i6p\nhH5/iq6yTMkolY/GSm/a1MVjfvxw8UFAlquTfueQVq7h91mzEPQYQKjEoQKBgAEO\n3BSdbbQalbKFVIGoy0phSOfn2Tvtmt5uhHc1q8HbAqdEKaaN/zZOoBBysqLWuPiJ\nqDGslYlSyVutJrOyYjQp9ujFM5+5mZex3bl+Mbf9uk2XvwQxblXEN8LOeElHeHXj\n08WUVVDao3hLHxsE8qESk0PB3AZOcK4fTs2LKAK1AoGBANTLECrr29ud64EZlEXh\nYF7zc8A0dl+v4lUFiJVxfdLL5USkh6RBmlp2Wtq+whi1SEHT1Eo6/Pk1I4mTVvED\nSSs9ZGIBzdP7R/3qftyrRu6Z//LI5RUZg7fQNAyz05tpGDFvL9Xfg13vWiibUgat\nDV0Y5xzSFP9S3ijgdNKLjM8Z\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-fbsvc@e-pra-ja-a410d.iam.gserviceaccount.com"
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  // Already initialized
}

const statusMessages: Record<string, { title: string; description: string }> = {
  confirmed: {
    title: '✅ Pedido confirmado',
    description: 'A loja aceitou seu pedido.',
  },
  preparing: {
    title: '👨‍🍳 Preparando seu pedido',
    description: 'A loja começou a preparar seu pedido.',
  },
  ready: {
    title: '📦 Pedido pronto',
    description: 'Seu pedido está pronto na loja.',
  },
  accepted: {
    title: '🛵 Entregador aceitou!',
    description: 'Um entregador aceitou seu pedido e vai retirar na loja.',
  },
  collecting: {
    title: '🏬 Entregador na loja!',
    description: 'O entregador chegou à loja e está retirando seu pedido.',
  },
  broadcasted: {
    title: '🚚 Saiu para entrega!',
    description: 'Seu pedido saiu para entrega e está a caminho.',
  },
  delivering: {
    title: '🚚 Saiu para entrega!',
    description: 'Seu pedido saiu para entrega e está a caminho.',
  },
  in_route: {
    title: '🚚 Saiu para entrega!',
    description: 'Seu pedido saiu para entrega e está a caminho.',
  },
  in_transit: {
    title: '🚚 Saiu para entrega!',
    description: 'Seu pedido saiu para entrega e está a caminho.',
  },
  delivered: {
    title: '🎉 Pedido entregue!',
    description: 'Seu pedido foi entregue com sucesso.',
  },
  completed: {
    title: '🎉 Pedido entregue!',
    description: 'Seu pedido foi entregue com sucesso.',
  },
  cancelled: {
    title: '❌ Pedido cancelado',
    description: 'Seu pedido foi cancelado.',
  },
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: 'Missing Supabase vars' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();
    console.log("Customer Push Webhook payload received:", payload);

    // Se a requisição for para restaurar status de pedido
    if (payload.action === 'restore_order') {
      const cleanId = String(payload.orderId || payload.order_id).replace('#', '').trim();
      const targetStatus = payload.status || 'preparing';
      console.log(`[notify-customer] RESTAURANDO PEDIDO #${cleanId} PARA STATUS ${targetStatus}`);
      await Promise.allSettled([
        adminClient.from('orders').update({ status: targetStatus, updated_at: new Date().toISOString() }).or(`id.eq.${cleanId},id.ilike.${cleanId}%`),
        adminClient.from('deliveries').update({ status: targetStatus, updated_at: new Date().toISOString() }).or(`order_id.eq.${cleanId},order_id.ilike.${cleanId}%`),
      ]);
      return new Response(JSON.stringify({ success: true, message: `Order ${cleanId} restored to ${targetStatus}` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Se a requisição for para salvar token FCM do cliente com admin service role
    if (payload.action === 'save_token' || (payload.fcmToken && !payload.status && !payload.deliveryStatus)) {
      const fcmToken = payload.fcmToken || payload.fcm_token;
      const customerId = payload.customerId || payload.customer_id;
      const userId = payload.userId || payload.user_id;
      const phone = payload.phone;
      const recentOrders: string[] = payload.recentOrders || [];
      const targetId = customerId || userId || phone;

      console.log('[SAVE_TOKEN_INPUT]', {
        fcmToken,
        customerId,
        userId,
        phone,
        recentOrders,
        targetId
      });

      if (fcmToken) {
        let updateData: any[] | null = null;
        let updateError: any = null;

        if (targetId) {
          const res = await adminClient
            .from('customers')
            .update({
              fcm_token: fcmToken,
              updated_at: new Date().toISOString()
            })
            .or(`id.eq.${targetId},user_id.eq.${targetId},phone.eq.${phone || targetId}`)
            .select();

          updateData = res.data;
          updateError = res.error;

          console.log('[SAVE_TOKEN_RESULT]', {
            linhasAfetadas: updateData?.length || 0,
            data: updateData,
            error: updateError
          });

          if (!updateData || updateData.length === 0) {
            const upsertRes = await adminClient
              .from('customers')
              .upsert({
                id: targetId,
                user_id: userId || targetId,
                fcm_token: fcmToken,
                name: 'Cliente Marketplace',
                updated_at: new Date().toISOString()
              })
              .select();

            console.log('[SAVE_TOKEN_UPSERT_RESULT]', {
              data: upsertRes.data,
              error: upsertRes.error
            });
          }
        }

        if (recentOrders.length > 0) {
          const { data: ords } = await adminClient.from('orders').select('customer_id, user_id').in('id', recentOrders);
          if (ords && ords.length > 0) {
            const custIds = [...new Set(ords.flatMap(o => [o.customer_id, o.user_id]).filter(Boolean))];
            if (custIds.length > 0) {
              await Promise.allSettled(
                custIds.map(cid => 
                  adminClient.from('customers').upsert({
                    id: cid,
                    fcm_token: fcmToken,
                    name: 'Cliente Marketplace',
                    updated_at: new Date().toISOString()
                  })
                )
              );
            }
          }
        }

        return new Response(JSON.stringify({ success: true, message: 'FCM token saved & upserted', data: updateData, error: updateError }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    const record = payload.record || payload;
    const oldRecord = payload.old_record;
    const targetOrderId = record.orderId || record.order_id || record.id;
    const newStatus = payload.deliveryStatus || payload.status || record.status || record.deliveryStatus;

    if (!targetOrderId) {
      return new Response(JSON.stringify({ error: 'No orderId or record found' }), { status: 400 });
    }

    if (newStatus === 'cancelled' && targetOrderId) {
      const cleanId = String(targetOrderId).replace('#', '').trim();
      console.log(`[notify-customer] FORÇANDO ATUALIZAÇÃO ADMIN DE CANCELAMENTO DO PEDIDO #${cleanId}`);
      try {
        await Promise.all([
          adminClient.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).or(`id.eq.${cleanId},id.ilike.${cleanId}%`),
          adminClient.from('deliveries').update({ status: 'cancelled', updated_at: new Date().toISOString() }).or(`order_id.eq.${cleanId},order_id.ilike.${cleanId}%`),
          adminClient.from('available_deliveries').update({ status: 'cancelled', updated_at: new Date().toISOString() }).or(`order_id.eq.${cleanId},order_id.ilike.${cleanId}%`),
        ]);
      } catch (errDb) {
        console.error(`[notify-customer] Erro ao atualizar banco para cancelado via adminClient:`, errDb);
      }
    }

    const msg = statusMessages[newStatus];
    if (!msg) {
      return new Response(JSON.stringify({ message: `Status '${newStatus}' has no mapping, ignoring` }), { status: 200 });
    }

    let customerId = payload.customer_id || record.customer_id;
    let userId = payload.user_id || record.user_id;

    if (targetOrderId) {
      const cleanId = String(targetOrderId).replace('#', '').trim();
      let orderData: any = null;

      try {
        const { data: oData } = await adminClient
          .from('orders')
          .select('customer_id, user_id')
          .eq('id', cleanId)
          .maybeSingle();
        orderData = oData;
      } catch {}

      if (!orderData) {
        try {
          const { data: listOrds } = await adminClient
            .from('orders')
            .select('id, customer_id, user_id')
            .order('created_at', { ascending: false })
            .limit(20);
          if (listOrds && listOrds.length > 0) {
            orderData = listOrds.find(o => String(o.id).toLowerCase().includes(cleanId.toLowerCase()));
          }
        } catch {}
      }

      if (orderData) {
        if (!customerId) customerId = orderData.customer_id;
        if (!userId) userId = orderData.user_id;
      }
    }

    // Busca token FCM nas tabelas: device_tokens, customers, profiles e users
    let fcmToken: string | null = null;
    const targetIds = [...new Set([customerId, userId].filter(Boolean))] as string[];

    if (targetIds.length > 0) {
      const { data: dtData } = await adminClient
        .from('device_tokens')
        .select('token')
        .or(`customer_id.in.(${targetIds.join(',')}),user_id.in.(${targetIds.join(',')})`)
        .order('updated_at', { ascending: false });
      if (dtData && dtData.length > 0) {
        const found = dtData.find((d: any) => d.token);
        if (found) fcmToken = found.token;
      }

      if (!fcmToken) {
        const { data: custData } = await adminClient
          .from('customers')
          .select('fcm_token')
          .in('id', targetIds);
        if (custData && custData.length > 0) {
          const found = custData.find((c: any) => c.fcm_token);
          if (found) fcmToken = found.fcm_token;
        }
      }

      if (!fcmToken) {
        const { data: custUserData } = await adminClient
          .from('customers')
          .select('fcm_token')
          .in('user_id', targetIds);
        if (custUserData && custUserData.length > 0) {
          const found = custUserData.find((c: any) => c.fcm_token);
          if (found) fcmToken = found.fcm_token;
        }
      }

      if (!fcmToken) {
        const { data: profData } = await adminClient
          .from('profiles')
          .select('fcm_token')
          .in('id', targetIds);
        if (profData && profData.length > 0) {
          const found = profData.find((p: any) => p.fcm_token);
          if (found) fcmToken = found.fcm_token;
        }
      }

      if (!fcmToken) {
        const { data: usrData } = await adminClient
          .from('users')
          .select('fcm_token')
          .in('id', targetIds);
        if (usrData && usrData.length > 0) {
          const found = usrData.find((u: any) => u.fcm_token);
          if (found) fcmToken = found.fcm_token;
        }
      }
    }

    // Fallback de emergência: busca qualquer token FCM recente na tabela device_tokens ou customers
    if (!fcmToken) {
      const { data: allDeviceTokens } = await adminClient
        .from('device_tokens')
        .select('token')
        .order('updated_at', { ascending: false })
        .limit(10);
      if (allDeviceTokens && allDeviceTokens.length > 0) {
        const found = allDeviceTokens.find((d: any) => d.token && d.token.length > 10);
        if (found) fcmToken = found.token;
      }
    }

    if (!fcmToken) {
      const { data: allCust } = await adminClient
        .from('customers')
        .select('fcm_token')
        .not('fcm_token', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (allCust && allCust.length > 0) {
        const found = allCust.find((c: any) => c.fcm_token && c.fcm_token.length > 10);
        if (found) fcmToken = found.fcm_token;
      }
    }

    if (!fcmToken) {
      console.log(`[notify-customer] Nenhum token FCM encontrado no sistema.`);
      if (newStatus === 'cancelled') {
        return new Response(JSON.stringify({ success: true, message: 'Order status updated to cancelled in DB' }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: 'Customer does not have an FCM token' }), { status: 200 });
    }

    const message = {
      data: {
        type: 'order_status',
        orderId: String(targetOrderId),
        status: String(newStatus),
        title: msg.title,
        body: msg.description
      },
      notification: {
        title: msg.title,
        body: msg.description
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'marketplace_orders',
          priority: 'high' as const,
          visibility: 'public' as const
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      },
      token: fcmToken
    };

    console.log(`[notify-customer] ENVIANDO PUSH PARA O PEDIDO #${targetOrderId} | token: ${fcmToken} | status: ${newStatus}`);
    const response = await admin.messaging().send(message);
    console.log("[notify-customer] PUSH ENTREGUE PELO FIREBASE:", response);

    return new Response(JSON.stringify({ success: true, response }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error("[notify-customer] Erro ao enviar push para o cliente:", err);
    if (err?.message?.includes('NotRegistered') || err?.code === 'messaging/registration-token-not-registered') {
      console.log(`[notify-customer] Token FCM expirado/inválido. Limpando token obsoleto de customers...`);
      try {
        await adminClient.from('customers').update({ fcm_token: null }).eq('fcm_token', fcmToken);
      } catch {}
      return new Response(JSON.stringify({ success: false, message: 'Token FCM obsoleto limpo. Aguardando registro do novo token pelo app.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
