-- =============================================================
-- 04_all_stores.sql  Talabat DS stores (90 total)
-- Safe to run multiple times (ON CONFLICT DO NOTHING)
-- =============================================================

INSERT INTO stores (name, code, city) VALUES
-- Ahmed Zaki (10 stores)
('Alexandria Moharam Bek DS 62','EG_Alexandria Moharam Bek_DS_62','Alexandria'),
('Alexandria El Montazah DS 68','EG_Alexandria_El Montazah_DS_68','Alexandria'),
('Alexandria El Seyouf DS 79','EG_Alexandria_El Seyouf_DS_79','Alexandria'),
('Assuit DS 35','EG_Assuit_DS_35','Assuit'),
('Alex Wingat DS 41','EG_Alex_Wingat_DS_41','Alexandria'),
('Hurgada DS 38','EG_Hurgada_DS_38','Hurgada'),
('Alexandria Smouha DS 60','EG_Alexandria Smouha_DS_60','Alexandria'),
('Alexandria Agamy DS 67','EG_Alexandria_Agamy_DS_67','Alexandria'),
('Alex East DS 26','EG_Alex East_DS_26','Alexandria'),
('Alex West DS 27','EG_Alex West_DS_27','Alexandria'),
-- Ehab Hamdy (17 stores)
('Shrouk 4 DS 90','EG_Shrouk (4)_DS_90','Shrouk'),
('Obour 3 DS 87','EG_Obour (3)_DS_87','Obour'),
('Nasrcity 10th DS 40','EG_Nasrcity 10th_DS_40','Cairo'),
('Tagamoa 1 Toya Mall DS 69','EG_Tagamoa 1_Toya Mall_DS_69','Cairo'),
('Nasr City 3 DS 59','EG_Nasr City (3)_DS_59','Cairo'),
('El Obour Industrial Area DS 57','EG_El Obour Industrial Area_DS_57','Obour'),
('Tagamoa El Banafseg DS 55','EG_Tagamoa_El Banafseg_DS_55','Cairo'),
('Cairo DS 8','EG_Cairo_DS_8','Cairo'),
('Cairo DS 17','EG_Cairo_DS_17','Cairo'),
('Obour DS 30','EG_Obour_DS_30','Obour'),
('Nasr City 6 DS 84','EG_Nasr City (6)_DS_84','Cairo'),
('Shrouk Mgawra 2 DS 51','EG_Shrouk_ Mgawra (2)_DS_51','Shrouk'),
('Nasr City 5 DS 72','EG_Nasr City (5)_DS_72','Cairo'),
('Nasr City 4 DS 63','EG_Nasr City (4)_DS_63','Cairo'),
('Shrouk DS 29','EG_Shrouk_DS_29','Shrouk'),
('Shrouk 3 DS 73','EG_Shrouk (3)_DS_73','Shrouk'),
('Cairo DS 37 Tagamoa Awal','EG_Cairo_DS_37_Tagamoa-Awal','Cairo'),
-- Mark Samir (13 stores)
('Cairo DS 5','EG_Cairo_DS_5','Cairo'),
('Cairo DS 7','EG_Cairo_DS_7','Cairo'),
('Cairo DS 1','EG_Cairo_DS_1','Cairo'),
('Tanta DS 24','EG_Tanta_DS_24','Tanta'),
('Imbaba DS 85','EG_Imbaba_DS_85','Cairo'),
('Tanta 2 DS 91','EG_Tanta (2)_DS_91','Tanta'),
('Maadi El Nadi DS 81','EG_Maadi_El Nadi_DS_81','Cairo'),
('Sheben El Kom DS 75','EG_Sheben El Kom_DS_75','Sheben El Kom'),
('Cairo DS 14','EG_Cairo_DS_14','Cairo'),
('Cairo DS 9','EG_Cairo_DS_9','Cairo'),
('Zahraa Maadi 2 DS 49','EG_Zahraa Maadi 2_DS_49','Cairo'),
('Cairo DS 2','EG_Cairo_DS_2','Cairo'),
('Cairo DS 4','EG_Cairo_DS_4','Cairo'),
-- Mina Aziz (11 stores)
('Cairo DS 13','EG_Cairo_DS_13','Cairo'),
('Cairo DS 31','EG_Cairo_DS_31','Cairo'),
('Shobra DS 28','EG_Shobra_DS_28','Cairo'),
('Cairo DS 15','EG_Cairo_DS_15','Cairo'),
('Cairo DS 16','EG_Cairo_DS_16','Cairo'),
('Cairo DS 6','EG_Cairo_DS_6','Cairo'),
('Cairo DS 21','EG_Cairo_DS_21','Cairo'),
('Mokattam 3 DS 71','EG_Mokattam (3)_DS_71','Cairo'),
('Mokatam Hadaba DS 46','EG_Mokatam hadaba_DS_46','Cairo'),
('Madinaty Craft DS 39','EG_Madinaty Craft_DS_39','Madinaty'),
('Madinaty DS 23','EG_Madinaty_DS_23','Madinaty'),
-- Mina Goubran (10 stores)
('Cairo DS 20','EG_Cairo_DS_20','Cairo'),
('Tagamoa 5 Spot Mall DS 64','EG_Tagamoa 5_Spot Mall_DS_64','Cairo'),
('Cairo DS 19','EG_Cairo_DS_19','Cairo'),
('Rehab Chillout DS 50','EG_Rehab_chillout_DS_50','Rehab'),
('Cairo DS 3','EG_Cairo_DS_3','Cairo'),
('Tagamoa Golden Sq DS 45','EG_Tagamoa Golden Sq_DS_45','Cairo'),
('Cairo DS 10','EG_Cairo_DS_10','Cairo'),
('Rock Vera Mall DS 56','EG_Rock Vera Mall_DS_56','Cairo'),
('Tagamoa 5 El Lotus DS 70','EG_Tagamoa 5_El Lotus_DS_70','Cairo'),
('Heliopolis Sheraton DS 52','EG_Heliopolis_Sheraton_DS_52','Cairo'),
-- Mohamed Elsayed (15 stores)
('El Sheikh Zayed El Hay 4 DS 77','EG_El Sheikh Zayed El Hay 4_DS_77','Sheikh Zayed'),
('Cairo DS 18','EG_Cairo_DS_18','Cairo'),
('Cairo DS 22','EG_Cairo_DS_22','Cairo'),
('October Festival City DS 58','EG_October Festival City_DS_58','6th October'),
('Tagamoa 5 Mahkama DS 43','EG_Tagamoa 5_Mahkama_DS_43','Cairo'),
('Sheikh Zayed 2 DS 53','EG_Sheikh zayed (2)_DS_53','Sheikh Zayed'),
('Hadayek El Ahram 2 DS 78','EG_Hadayek El Ahram 2_DS_78','Giza'),
('Palmhills DS 36','EG_Palmhills_DS_36','6th October'),
('Hadayek October DS 44','EG_Hadayek October_DS_44','6th October'),
('October West Somed DS 82','EG_October_West Somed_DS_82','6th October'),
('Cairo DS 12','EG_Cairo_DS_12','Cairo'),
('October Beta Gardens DS 76','EG_October Beta Gardens_DS_76','6th October'),
('October Industrial DS 47','EG_October industrial_DS_47','6th October'),
('October Mountain View DS 89','EG_October_Mountain View_DS_89','6th October'),
('Palm Hills 2 DS 66','EG_Palm Hills (2)_DS_66','6th October'),
-- Mostafa Kafoury (14 stores)
('Zakazik DS 33','EG_Zakazik_DS_33','Zakazik'),
('Faisal DS 42','EG_faisal_DS_42','Giza'),
('10th of Ramadan DS 74','EG_10th of Ramadan_DS_74','10th of Ramadan'),
('Haram 2 DS 86','EG_Haram (2)_DS_86','Giza'),
('Cairo DS 11','EG_Cairo_DS_11','Cairo'),
('Zakazik 2 DS 88','EG_Zakazik (2)_DS_88','Zakazik'),
('El Mahalla DS 80','EG_El Mahalla_DS_80','El Mahalla'),
('Ismailia DS 34','EG_Ismailia_DS_34','Ismailia'),
('Mansoura DS 25','EG_Mansoura_DS_25','Mansoura'),
('Portsaid DS 32','EG_Portsaid_DS_32','Port Said'),
('Mansoura Gomhoreya DS 48','EG_Mansoura gomhoreya_DS_48','Mansoura'),
('Suez DS 65','EG_Suez_DS_65','Suez'),
('Faisal Maryoteya 2 DS 54','EG_Faisal Maryoteya (2)_DS_54','Giza'),
('New Damietta DS 61','EG_New Damietta_DS_61','Damietta')
ON CONFLICT (code) DO NOTHING;

-- Create demo AM accounts in auth.users (do this via Supabase dashboard Auth UI
-- or via the Management API). After creating them, run the DO block below.
-- Demo emails: ahmed.zaki@talabat.com, ehab.hamdy@talabat.com,
--   mark.samir@talabat.com, mina.aziz@talabat.com, mina.goubran@talabat.com,
--   mohamed.elsayed@talabat.com, mostafa.kafoury@talabat.com
-- Then set their role to area_manager in profiles table.

DO $$
DECLARE v_am_id UUID;
BEGIN
  SELECT id INTO v_am_id FROM profiles WHERE email = 'ahmed.zaki@talabat.com';
  IF v_am_id IS NOT NULL THEN
    INSERT INTO manager_store_assignments (manager_id, store_id)
    SELECT v_am_id, s.id FROM stores s WHERE s.code IN (
      'EG_Alexandria Moharam Bek_DS_62','EG_Alexandria_El Montazah_DS_68',
      'EG_Alexandria_El Seyouf_DS_79','EG_Assuit_DS_35','EG_Alex_Wingat_DS_41',
      'EG_Hurgada_DS_38','EG_Alexandria Smouha_DS_60','EG_Alexandria_Agamy_DS_67',
      'EG_Alex East_DS_26','EG_Alex West_DS_27') ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_am_id FROM profiles WHERE email = 'ehab.hamdy@talabat.com';
  IF v_am_id IS NOT NULL THEN
    INSERT INTO manager_store_assignments (manager_id, store_id)
    SELECT v_am_id, s.id FROM stores s WHERE s.code IN (
      'EG_Shrouk (4)_DS_90','EG_Obour (3)_DS_87','EG_Nasrcity 10th_DS_40',
      'EG_Tagamoa 1_Toya Mall_DS_69','EG_Nasr City (3)_DS_59',
      'EG_El Obour Industrial Area_DS_57','EG_Tagamoa_El Banafseg_DS_55',
      'EG_Cairo_DS_8','EG_Cairo_DS_17','EG_Obour_DS_30','EG_Nasr City (6)_DS_84',
      'EG_Shrouk_ Mgawra (2)_DS_51','EG_Nasr City (5)_DS_72','EG_Nasr City (4)_DS_63',
      'EG_Shrouk_DS_29','EG_Shrouk (3)_DS_73','EG_Cairo_DS_37_Tagamoa-Awal') ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_am_id FROM profiles WHERE email = 'mark.samir@talabat.com';
  IF v_am_id IS NOT NULL THEN
    INSERT INTO manager_store_assignments (manager_id, store_id)
    SELECT v_am_id, s.id FROM stores s WHERE s.code IN (
      'EG_Cairo_DS_5','EG_Cairo_DS_7','EG_Cairo_DS_1','EG_Tanta_DS_24',
      'EG_Imbaba_DS_85','EG_Tanta (2)_DS_91','EG_Maadi_El Nadi_DS_81',
      'EG_Sheben El Kom_DS_75','EG_Cairo_DS_14','EG_Cairo_DS_9',
      'EG_Zahraa Maadi 2_DS_49','EG_Cairo_DS_2','EG_Cairo_DS_4') ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_am_id FROM profiles WHERE email = 'mina.aziz@talabat.com';
  IF v_am_id IS NOT NULL THEN
    INSERT INTO manager_store_assignments (manager_id, store_id)
    SELECT v_am_id, s.id FROM stores s WHERE s.code IN (
      'EG_Cairo_DS_13','EG_Cairo_DS_31','EG_Shobra_DS_28','EG_Cairo_DS_15',
      'EG_Cairo_DS_16','EG_Cairo_DS_6','EG_Cairo_DS_21','EG_Mokattam (3)_DS_71',
      'EG_Mokatam hadaba_DS_46','EG_Madinaty Craft_DS_39','EG_Madinaty_DS_23') ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_am_id FROM profiles WHERE email = 'mina.goubran@talabat.com';
  IF v_am_id IS NOT NULL THEN
    INSERT INTO manager_store_assignments (manager_id, store_id)
    SELECT v_am_id, s.id FROM stores s WHERE s.code IN (
      'EG_Cairo_DS_20','EG_Tagamoa 5_Spot Mall_DS_64','EG_Cairo_DS_19',
      'EG_Rehab_chillout_DS_50','EG_Cairo_DS_3','EG_Tagamoa Golden Sq_DS_45',
      'EG_Cairo_DS_10','EG_Rock Vera Mall_DS_56',
      'EG_Tagamoa 5_El Lotus_DS_70','EG_Heliopolis_Sheraton_DS_52') ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_am_id FROM profiles WHERE email = 'mohamed.elsayed@talabat.com';
  IF v_am_id IS NOT NULL THEN
    INSERT INTO manager_store_assignments (manager_id, store_id)
    SELECT v_am_id, s.id FROM stores s WHERE s.code IN (
      'EG_El Sheikh Zayed El Hay 4_DS_77','EG_Cairo_DS_18','EG_Cairo_DS_22',
      'EG_October Festival City_DS_58','EG_Tagamoa 5_Mahkama_DS_43',
      'EG_Sheikh zayed (2)_DS_53','EG_Hadayek El Ahram 2_DS_78',
      'EG_Palmhills_DS_36','EG_Hadayek October_DS_44','EG_October_West Somed_DS_82',
      'EG_Cairo_DS_12','EG_October Beta Gardens_DS_76','EG_October industrial_DS_47',
      'EG_October_Mountain View_DS_89','EG_Palm Hills (2)_DS_66') ON CONFLICT DO NOTHING;
  END IF;
  SELECT id INTO v_am_id FROM profiles WHERE email = 'mostafa.kafoury@talabat.com';
  IF v_am_id IS NOT NULL THEN
    INSERT INTO manager_store_assignments (manager_id, store_id)
    SELECT v_am_id, s.id FROM stores s WHERE s.code IN (
      'EG_Zakazik_DS_33','EG_faisal_DS_42','EG_10th of Ramadan_DS_74',
      'EG_Haram (2)_DS_86','EG_Cairo_DS_11','EG_Zakazik (2)_DS_88',
      'EG_El Mahalla_DS_80','EG_Ismailia_DS_34','EG_Mansoura_DS_25',
      'EG_Portsaid_DS_32','EG_Mansoura gomhoreya_DS_48','EG_Suez_DS_65',
      'EG_Faisal Maryoteya (2)_DS_54','EG_New Damietta_DS_61') ON CONFLICT DO NOTHING;
  END IF;
END $$;
