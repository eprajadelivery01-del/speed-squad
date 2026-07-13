-- ============================================================
-- FIX: Entregador novo não consegue logar
-- Causa raiz: o trigger `on_auth_user_created` (função
-- public.handle_new_user) estava falhando durante o signUp,
-- fazendo o Supabase Auth retornar 500 e reverter a criação do
-- usuário em auth.users. Como o usuário NÃO é criado, ao tentar
-- logar depois recebe "Invalid login credentials".
--
-- Correção: reescrever o trigger de forma DEFENSIVA
-- (nunca aborta o signup) e completar o cadastro do driver
-- diretamente aqui (profile + user_roles + delivery_drivers +
-- marca convite como accepted).
--
-- SEGURO PARA RODAR MULTIPLAS VEZES.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation_id uuid;
  v_role public.app_role;
  v_full_name text := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_phone     text := NEW.raw_user_meta_data->>'phone';
  v_document  text := NEW.raw_user_meta_data->>'document';
  v_vehicle   text := COALESCE(NEW.raw_user_meta_data->>'vehicle', 'motorcycle');
  v_plate     text := UPPER(COALESCE(NEW.raw_user_meta_data->>'license_plate', ''));
BEGIN
  -- 1) Cria/atualiza profile — NUNCA pode abortar o signup
  BEGIN
    INSERT INTO public.profiles (id, user_id, full_name, phone, document)
    VALUES (NEW.id, NEW.id, v_full_name, v_phone, v_document)
    ON CONFLICT (id) DO UPDATE SET
      user_id  = EXCLUDED.user_id,
      full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
      phone    = COALESCE(EXCLUDED.phone, public.profiles.phone),
      document = COALESCE(EXCLUDED.document, public.profiles.document);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] profile insert falhou: %', SQLERRM;
  END;

  -- 2) Se veio via convite, aplica role e cria delivery_driver
  BEGIN
    v_invitation_id := NULLIF(NEW.raw_user_meta_data->>'invitation_id', '')::uuid;

    IF v_invitation_id IS NOT NULL THEN
      SELECT role INTO v_role
      FROM public.invitations
      WHERE id = v_invitation_id
        AND status = 'pending';

      IF v_role IS NOT NULL THEN
        -- Marca convite como aceito
        UPDATE public.invitations
        SET status = 'accepted'
        WHERE id = v_invitation_id;

        -- Atribui role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, v_role)
        ON CONFLICT (user_id, role) DO NOTHING;

        -- Se driver, cria registro em delivery_drivers
        IF v_role = 'driver' THEN
          BEGIN
            INSERT INTO public.delivery_drivers
              (user_id, full_name, phone, document, vehicle, license_plate, vehicle_plate)
            VALUES
              (NEW.id, v_full_name, v_phone, v_document, v_vehicle,
               NULLIF(v_plate, ''), NULLIF(v_plate, ''))
            ON CONFLICT (user_id) DO NOTHING;
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[handle_new_user] delivery_drivers insert falhou: %', SQLERRM;
          END;
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] invitation flow falhou: %', SQLERRM;
  END;

  -- 3) SEMPRE retorna NEW para não abortar auth.users insert
  RETURN NEW;
END;
$$;

-- Recria trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Após rodar, teste criando um novo entregador via /invite/:token.
-- Se algum usuário anterior falhou no signup, ele NÃO existe em
-- auth.users — o entregador precisa refazer o cadastro pelo convite.
-- ============================================================
