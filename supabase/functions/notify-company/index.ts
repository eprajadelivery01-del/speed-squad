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
    console.log("Lojista Push Webhook payload received:", payload);

    const record = payload.record;
    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: 'No record found' }), { status: 400 });
    }

    // Only process INSERT or UPDATE to pending
    if (record.status !== 'pending') {
      return new Response(JSON.stringify({ message: 'Status is not pending, ignoring' }), { status: 200 });
    }

    if (!record.company_id) {
      return new Response(JSON.stringify({ message: 'No company_id found, ignoring' }), { status: 200 });
    }

    // Get company's fcm_token
    const { data: company, error } = await adminClient
      .from('companies')
      .select('fcm_token')
      .eq('id', record.company_id)
      .single();

    if (error) throw error;

    if (!company || !company.fcm_token) {
      return new Response(JSON.stringify({ message: 'Company does not have an FCM token' }), { status: 200 });
    }

    let targetToken = company.fcm_token;
    if (/^[0-9a-fA-F]{64}$/.test(String(targetToken).trim())) {
      console.log(`[notify-company] Token APNs bruto detectado (${targetToken.slice(0, 10)}...). Convertendo para FCM...`);
      try {
        const tokenObj = await (admin.app().options.credential as any)?.getAccessToken?.();
        const accessTok = tokenObj?.access_token;
        if (accessTok) {
          const candidateBundles = ["br.com.epraja.lojista", "br.com.epraja.appFma", "br.com.epraja.entregador"];
          for (const bId of candidateBundles) {
            for (const sandbox of [false, true]) {
              try {
                const res = await fetch("https://iid.googleapis.com/iid/v1:batchImport", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${accessTok}`,
                    "access_token_auth": "true",
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    application: bId,
                    sandbox: sandbox,
                    apns_tokens: [String(targetToken).trim()]
                  })
                });
                const data = await res.json();
                const mapped = data?.results?.[0];
                if (mapped?.status === "OK" && mapped.registration_token) {
                  console.log(`[notify-company] Token APNs convertido com sucesso para ${bId}:`, mapped.registration_token.slice(0, 15));
                  targetToken = mapped.registration_token;
                  break;
                }
              } catch (errConv) {
                console.warn(`[notify-company] Erro ao converter token APNs para ${bId}:`, errConv);
              }
            }
            if (targetToken !== company.fcm_token) break;
          }
        }
      } catch (errAuth) {
        console.warn("[notify-company] Erro ao obter access token para conversão APNs:", errAuth);
      }
    }

    const titleText = '📦 Novo pedido recebido!';
    const bodyText = `Pedido #${record.id.substring(0, 6).toUpperCase()} no valor de R$ ${record.total || '0,00'}`;

    const message = {
      data: {
        type: 'order',
        orderId: record.id,
        title: titleText,
        body: bodyText,
        app: 'lojista',
        bundleId: 'br.com.epraja.lojista'
      },
      notification: {
        title: titleText,
        body: bodyText
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'notification_sound',
          channelId: 'lojista_orders_v2'
        }
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert"
        },
        payload: {
          aps: {
            alert: {
              title: titleText,
              body: bodyText
            },
            sound: 'notification_sound.mp3',
            badge: 1,
            "mutable-content": 1
          }
        }
      },
      token: targetToken
    };

    console.log(`Sending push to company ${record.company_id} with token ${targetToken}`);
    const response = await admin.messaging().send(message);
    console.log("FCM Response:", response);

    return new Response(JSON.stringify({ success: true, response }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error("Error sending push to company:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
