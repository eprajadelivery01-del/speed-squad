-- =====================================================================
-- DIAGNÓSTICO: "cadastro de entregadores sumiu"
-- Rode no SQL Editor do Supabase (projeto nptkxlrhrlssdsevpgqe).
-- Cada bloco é independente. Rode um por vez e leia o resultado.
-- =====================================================================

-- 1) VISÃO GERAL: quantos usuários x perfis x drivers x roles existem
SELECT
  (SELECT count(*) FROM auth.users)                                   AS auth_users,
  (SELECT count(*) FROM public.profiles)                              AS profiles,
  (SELECT count(*) FROM public.drivers)                               AS drivers,
  (SELECT count(*) FROM public.user_roles WHERE role::text = 'driver') AS roles_driver;


-- 2) USUÁRIOS SEM PERFIL (trigger handle_new_user falhou no cadastro)
SELECT u.id, u.email, u.created_at, u.raw_user_meta_data->>'role' AS meta_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;


-- 3) USUÁRIOS COM PERFIL DE ENTREGADOR MAS SEM REGISTRO EM drivers
--    (esses são os que "somem" da lista de entregadores)
SELECT p.id, p.email, p.full_name, p.created_at
FROM public.profiles p
LEFT JOIN public.drivers d ON d.user_id = p.id
WHERE d.id IS NULL
  AND (
    p.role::text = 'driver'
    OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role::text = 'driver')
  )
ORDER BY p.created_at DESC;


-- 4) ENTREGADORES SEM ROLE 'driver' em user_roles
--    (existem em drivers mas não aparecem por falta de permissão/role)
SELECT d.id AS driver_id, d.user_id, p.email, p.full_name, d.created_at
FROM public.drivers d
LEFT JOIN public.user_roles r ON r.user_id = d.user_id AND r.role::text = 'driver'
LEFT JOIN public.profiles p ON p.id = d.user_id
WHERE r.user_id IS NULL
ORDER BY d.created_at DESC;


-- 5) DRIVERS ÓRFÃOS: apontam para um user_id que não existe mais em auth.users
SELECT d.id AS driver_id, d.user_id, d.created_at
FROM public.drivers d
LEFT JOIN auth.users u ON u.id = d.user_id
WHERE u.id IS NULL;


-- 6) ENTREGADORES INATIVOS / NÃO APROVADOS
--    (não sumiram do banco — só estão filtrados na UI)
SELECT d.id, p.email, p.full_name,
       to_jsonb(d) - 'id' - 'user_id' AS driver_flags,
       d.created_at
FROM public.drivers d
LEFT JOIN public.profiles p ON p.id = d.user_id
WHERE COALESCE((to_jsonb(d)->>'is_active')::boolean, true) = false
   OR COALESCE((to_jsonb(d)->>'is_approved')::boolean, true) = false
   OR COALESCE(to_jsonb(d)->>'status', 'active') NOT IN ('active','approved','online','offline')
ORDER BY d.created_at DESC;


-- 7) CADASTROS RECENTES (últimos 30 dias) e o que existe de cada um
SELECT u.email,
       u.created_at,
       (p.id IS NOT NULL) AS tem_profile,
       (d.id IS NOT NULL) AS tem_driver,
       (r.user_id IS NOT NULL) AS tem_role_driver,
       u.email_confirmed_at IS NOT NULL AS email_confirmado,
       u.last_sign_in_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.drivers  d ON d.user_id = u.id
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role::text = 'driver'
WHERE u.created_at > now() - interval '30 days'
ORDER BY u.created_at DESC;


-- 8) CHECAR O USUÁRIO DO ERRO REPORTADO
SELECT u.id, u.email, u.created_at, u.last_sign_in_at,
       (p.id IS NOT NULL) AS tem_profile,
       (d.id IS NOT NULL) AS tem_driver,
       (r.user_id IS NOT NULL) AS tem_role_driver
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.drivers  d ON d.user_id = u.id
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role::text = 'driver'
WHERE u.id = 'eb6edb38-098c-4c05-9c18-bdcdc017fe85'
   OR u.email = 'af658005@gmail.com';


-- 9) O TRIGGER DE CRIAÇÃO DE USUÁRIO AINDA EXISTE E ESTÁ ATIVO?
SELECT t.tgname,
       CASE t.tgenabled WHEN 'O' THEN 'ativo' WHEN 'D' THEN 'DESABILITADO' ELSE t.tgenabled::text END AS estado,
       p.proname AS funcao
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal
  AND t.tgrelid = 'auth.users'::regclass;


-- 10) POLÍTICAS RLS DE drivers / profiles (linhas podem estar sendo ocultadas, não apagadas)
SELECT schemaname, tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('drivers','profiles','user_roles')
ORDER BY tablename, policyname;

-- =====================================================================
-- REPARO (só depois de conferir os resultados acima).
-- Descomente e rode para recriar os registros faltantes.
-- =====================================================================
-- -- 3-fix: cria drivers faltantes para profiles marcados como entregador
-- INSERT INTO public.drivers (user_id)
-- SELECT p.id
-- FROM public.profiles p
-- LEFT JOIN public.drivers d ON d.user_id = p.id
-- WHERE d.id IS NULL
--   AND (p.role::text = 'driver'
--        OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role::text = 'driver'))
-- ON CONFLICT DO NOTHING;
--
-- -- 4-fix: garante a role 'driver' para quem já tem registro em drivers
-- INSERT INTO public.user_roles (user_id, role)
-- SELECT d.user_id, 'driver'::public.app_role
-- FROM public.drivers d
-- ON CONFLICT (user_id, role) DO NOTHING;
