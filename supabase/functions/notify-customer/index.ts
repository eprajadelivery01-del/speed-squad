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
    title: '🚚 Saiu para entrega!',
    description: 'Seu pedido saiu para entrega e está a caminho.',
  },
  collecting: {
    title: '🚚 Saiu para entrega!',
    description: 'Seu pedido saiu para entrega e está a caminho.',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return new Response(JSON.stringify({ error: 'Missing Supabase vars' }), { status: 500 });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = await req.json();
    console.log("Customer Push Webhook payload received:", payload);

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

    // Se record não possui customer_id/user_id, buscar a order no banco
    let customerId = payload.customer_id || record.customer_id;
    let userId = payload.user_id || record.user_id;

    if (!customerId && !userId && targetOrderId) {
      const { data: orderData } = await adminClient
        .from('orders')
        .select('customer_id, user_id')
        .eq('id', targetOrderId)
        .maybeSingle();
      if (orderData) {
        customerId = orderData.customer_id;
        userId = orderData.user_id;
      }
    }

    // Find customer's fcm_token
    let customerQuery = adminClient
      .from('customers')
      .select('fcm_token');

    if (customerId) {
      customerQuery = customerQuery.or(`id.eq.${customerId},user_id.eq.${customerId}`);
    } else if (userId) {
      customerQuery = customerQuery.eq('user_id', userId);
    } else {
      return new Response(JSON.stringify({ message: 'No customer identifier found, ignoring' }), { status: 200 });
    }

    const { data: customerData, error } = await customerQuery;
    if (error) throw error;

    const customer = customerData && customerData.find(c => c.fcm_token);
    if (!customer || !customer.fcm_token) {
      console.log(`[notify-customer] Cliente ${customerId || userId} não possui token FCM cadastrado.`);
      return new Response(JSON.stringify({ message: 'Customer does not have an FCM token' }), { status: 200 });
    }

    const message = {
      data: {
        type: 'order_status',
        orderId: targetOrderId,
        status: newStatus,
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
          channelId: 'marketplace_orders'
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
      token: customer.fcm_token
    };

    console.log(`[notify-customer] ENVIANDO PUSH PARA O PEDIDO #${targetOrderId} | token: ${customer.fcm_token} | status: ${newStatus}`);
    const response = await admin.messaging().send(message);
    console.log("[notify-customer] PUSH ENTREGUE PELO FIREBASE:", response);

    return new Response(JSON.stringify({ success: true, response }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error("[notify-customer] Erro ao enviar push para o cliente:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
