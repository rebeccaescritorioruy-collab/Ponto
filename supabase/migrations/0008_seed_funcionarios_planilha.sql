-- Importação em lote dos funcionários/estagiários da planilha "DADOS DE FUNCIONÁRIOS".
-- Senha inicial de cada um: os 4 PRIMEIROS dígitos do próprio CPF (ex.: CPF 082.725.544-61
-- → senha 0827). Cada pessoa deve trocar a senha no primeiro login (botão "Trocar senha" na
-- tela de bater ponto), ou o admin pode usar "Redefinir senha" por funcionário na aba
-- Funcionários.
--
-- NÃO incluídos aqui (ver aviso completo na resposta do chat):
--   - SUELLTON GABRIEL BARBOSA DE SANTANA e GABRIEL GOMES DA SILVA: mesmo CPF na planilha
--     (106.853.504-01), CPF é chave única aqui — falta você confirmar o CPF certo de cada um.

-- ===================== CELETISTAS (empresa "clt") =====================

insert into employees
  (cpf, nome, cargo, admissao, vinculo, horas_diarias, jornada_mensal_horas,
   entrada_prevista, saida_prevista, intervalo_minutos, ativo, password_hash)
values
  ('08272554461', 'ANDREIA KERSIA COSTA DE SOUZA', 'ASSISTENTE FINANCEIRO', '2025-05-26', 'clt', 8, 200, '08:00', '17:00', 60, true, '286aee2ea4a5ba67539432dc5ea3865c3b204d3caaccb662995388d156a279cf'),
  ('11541375469', 'ARTHUR AUGUSTO NUNES VIEIRA', 'ASSISTENTE JURÍDICO', '2025-06-23', 'clt', 6, 150, '11:00', '17:00', 0, true, '06ec44ccee3b23b9e067e96afb796d3b8d75ac7701185f649c61e405c282bdf8'),
  ('07837238303', 'DANIELE BRASIL ALVES', 'ASSISTENTE JURÍDICO', '2025-09-03', 'clt', 8, 200, '08:00', '17:00', 60, true, 'd059592f9ec29fa8731bf26337387c59d35788cdc7a1bfab457e8c83c4e0cb5c'),
  ('13128827788', 'DENISE SANTOS GODINHO DO NASCIMENTO', 'ASSISTENTE COMERCIAL', '2026-03-09', 'clt', 8, 200, '07:00', '16:00', 60, true, '712dca40936b39ce670dc803736fe3735cf99311030a928de039a36f77926230'),
  ('70497963442', 'JULIA MARIA SILVA SANTOS', 'ASSISTENTE COMERCIAL', '2025-06-23', 'clt', 6, 150, '11:00', '17:00', 0, true, 'f9a78464d1428b03ed04bcef318491614d11582986fa18447f72ae40b8a29d4d'),
  ('30459580876', 'KELYONASSER LIMA DE FREITAS', 'AUXILIAR FINANCEIRO', '2025-09-10', 'clt', 6, 150, '08:00', '14:00', 0, true, '1d2db6db4635c05a0902d6f8cb10be58a924c34dee511ee6fa1b2d819eac3c02'),
  ('10943688493', 'MARIANA DE LIMA RODRIGUES', 'AUXILIAR ADMINISTRATIVO', '2026-06-01', 'clt', 8, 200, '08:00', '17:00', 60, true, 'f1250af9005fb93c6bc8ea65860a4079e4f90b38d8c258af498bf8cb5e9e84df'),
  ('70815091427', 'MATHEUS HENRIQUE ESPINDOLA DA SILVA', 'ASSISTENTE JURÍDICO', '2025-08-01', 'clt', 6, 150, '08:00', '14:00', 0, true, 'de7d5e6247fb643608b4f5ef96726ec0c478e1499bcf1f650fa4cf118063dad0'),
  ('05984753707', 'MONIQUE TORRES VIEIRA TAVARES', 'ASSISTENTE COMERCIAL', '2025-08-11', 'clt', 8, 200, '07:00', '16:00', 60, true, '9e2022b50b9ac99fdc3ad25a05940b843b18bfe6b00edae05586bc21beab0146'),
  ('70339558474', 'QUEREN HAPUQUE DOS SANTOS FELIPE', 'AUXILIAR FINANCEIRO', '2026-02-23', 'clt', 8, 200, '08:00', '17:00', 60, true, 'b5887bceb66fbcc3206859d9032efcb9e71df4e2d869654c23471c20f58f0b8f'),
  ('93774672253', 'ROSEANE NOVAIS SANTOS', 'ASSISTENTE COMERCIAL', '2026-03-02', 'clt', 8, 200, '08:00', '17:00', 60, true, 'd088c0dc1cd5a1f4b0ef870644a613c5cf1067021ae0c3794f56921f2c0ef2c1'),
  ('12151974626', 'VICTOR HENRIQUE BRAGA ROQUE', 'ASSISTENTE JURÍDICO', '2026-06-01', 'clt', 8, 200, '08:00', '17:00', 60, true, 'e7faa8b075ab5b412691a8b097ebfee4bb5fd87c448bfffc35ed519a449702ce')
on conflict (cpf) do nothing;

-- Sem linha na tabela de carga horária da planilha (confirmar horário/regime pela tela Funcionários):
insert into employees (cpf, nome, cargo, admissao, vinculo, ativo, password_hash)
values
  ('08758712402', 'RAPHAELA PEREIRA DE OLIVEIRA', 'ASSISTENTE COMERCIAL', '2026-03-25', 'clt', true, '02ff9a4302ba484aadf06cf115b5e98a1271151dfd9191a42fe188a2b13dae92'),
  ('15319991746', 'BIANCA ROBERTA ALVES DO PRADO', 'AUXILIAR DE AUDITORIA', '2024-02-19', 'clt', true, 'f1294f35f19846cd012506eadcc13ecda95eb7ddc6c661bc1b9402c4b00eb703')
on conflict (cpf) do nothing;

-- ===================== ESTAGIÁRIOS (empresa "estagiario") =====================
-- Cargo preenchido a partir da coluna CURSO da planilha (não existe coluna própria de cargo
-- pra estagiário no formulário atual).

insert into employees
  (cpf, nome, cargo, admissao, vinculo, horas_diarias, jornada_mensal_horas,
   entrada_prevista, saida_prevista, intervalo_minutos, ativo, password_hash)
values
  ('11106533445', 'ALINY MARIA AGOSTINHO DA SILVA', 'Estagiária de Direito', '2026-02-02', 'estagiario', 4, 100, '13:00', '17:00', 0, true, '055f78940c07630352676197ab7c3ed8d5bb204d406e5c6ff101f870bc9b7dd7'),
  ('71713074419', 'AMANNDA LIMA DOS SANTOS MARTINIANO', 'Estagiária de Direito', '2026-02-02', 'estagiario', 6, 150, '08:00', '14:00', 0, true, 'f757709ea42f2f0823bb63b83613f116c77b4215b565786ec8b19c2a662e6c93'),
  ('71008033499', 'GISELE GALDINO DA SILVA', 'Estagiária de Direito', '2026-03-09', 'estagiario', 5, 125, '12:00', '17:00', 0, true, 'e36deec09aa73922d53279f29380a56ac3c593dd591855dd7aca1161aa501890'),
  ('53045850898', 'JÚLIA SILVA SAMPAIO', 'Estagiária de Direito', '2026-03-10', 'estagiario', 6, 150, '08:00', '14:00', 0, true, '6739d7f3fdec51c4dde1605df9e89ac803d9192425dd69a77caf22accd824200'),
  ('10669239496', 'MARCELA DE SÁ QUEIROGA', 'Estagiária de Direito', '2026-04-22', 'estagiario', 5, 125, '12:00', '17:00', 0, true, 'eab8ff114cc63fd8ab3d9f42249e20b8ce5ecce463e8368e98747f03c50eeabb'),
  ('11409717437', 'MATHEUS WILLIAM DE OLIVEIRA SANTOS', 'Estagiário de Direito', '2026-03-23', 'estagiario', 5, 125, '09:00', '14:00', 0, true, 'bc10b57514d76124b4120a34db2224067fed660b09408ade0b14b582946ff2fc'),
  ('19152463770', 'SUZANE BEATRIZ DOS SANTOS AVELINO', 'Estagiária de Tec. Informática', '2026-01-12', 'estagiario', 6, 150, '08:00', '14:00', 0, true, '811af1590c16fc90322a05ab17f360939077f63f674a7e0550732a36050444ac')
on conflict (cpf) do nothing;

-- Vitória: contrato ainda "aguardando assinaturas" na planilha (nota da própria planilha) —
-- por isso sem data de admissão ainda. Ative/preencha admissão quando o contrato for assinado.
insert into employees
  (cpf, nome, cargo, vinculo, horas_diarias, jornada_mensal_horas,
   entrada_prevista, saida_prevista, intervalo_minutos, ativo, password_hash)
values
  ('01757870423', 'VITÓRIA PEREIRA DO NASCIMENTO', 'Estagiária de Direito', 'estagiario', 6, 150, '11:00', '17:00', 0, false, 'e662316614f2be35c76b297330fc580c1af68da9a1df1e8982e5716841c39797')
on conflict (cpf) do nothing;

-- Se você já rodou a versão anterior deste script (com senha compartilhada "Mudar@123"),
-- rode também o UPDATE abaixo pra corrigir a senha de quem já foi inserido pra senha
-- individual baseada no CPF:
update employees set password_hash = '286aee2ea4a5ba67539432dc5ea3865c3b204d3caaccb662995388d156a279cf' where cpf = '08272554461';
update employees set password_hash = '06ec44ccee3b23b9e067e96afb796d3b8d75ac7701185f649c61e405c282bdf8' where cpf = '11541375469';
update employees set password_hash = 'd059592f9ec29fa8731bf26337387c59d35788cdc7a1bfab457e8c83c4e0cb5c' where cpf = '07837238303';
update employees set password_hash = '712dca40936b39ce670dc803736fe3735cf99311030a928de039a36f77926230' where cpf = '13128827788';
update employees set password_hash = 'f9a78464d1428b03ed04bcef318491614d11582986fa18447f72ae40b8a29d4d' where cpf = '70497963442';
update employees set password_hash = '1d2db6db4635c05a0902d6f8cb10be58a924c34dee511ee6fa1b2d819eac3c02' where cpf = '30459580876';
update employees set password_hash = 'f1250af9005fb93c6bc8ea65860a4079e4f90b38d8c258af498bf8cb5e9e84df' where cpf = '10943688493';
update employees set password_hash = 'de7d5e6247fb643608b4f5ef96726ec0c478e1499bcf1f650fa4cf118063dad0' where cpf = '70815091427';
update employees set password_hash = '9e2022b50b9ac99fdc3ad25a05940b843b18bfe6b00edae05586bc21beab0146' where cpf = '05984753707';
update employees set password_hash = 'b5887bceb66fbcc3206859d9032efcb9e71df4e2d869654c23471c20f58f0b8f' where cpf = '70339558474';
update employees set password_hash = 'd088c0dc1cd5a1f4b0ef870644a613c5cf1067021ae0c3794f56921f2c0ef2c1' where cpf = '93774672253';
update employees set password_hash = 'e7faa8b075ab5b412691a8b097ebfee4bb5fd87c448bfffc35ed519a449702ce' where cpf = '12151974626';
update employees set password_hash = '02ff9a4302ba484aadf06cf115b5e98a1271151dfd9191a42fe188a2b13dae92' where cpf = '08758712402';
update employees set password_hash = 'f1294f35f19846cd012506eadcc13ecda95eb7ddc6c661bc1b9402c4b00eb703' where cpf = '15319991746';
update employees set password_hash = '055f78940c07630352676197ab7c3ed8d5bb204d406e5c6ff101f870bc9b7dd7' where cpf = '11106533445';
update employees set password_hash = 'f757709ea42f2f0823bb63b83613f116c77b4215b565786ec8b19c2a662e6c93' where cpf = '71713074419';
update employees set password_hash = 'e36deec09aa73922d53279f29380a56ac3c593dd591855dd7aca1161aa501890' where cpf = '71008033499';
update employees set password_hash = '6739d7f3fdec51c4dde1605df9e89ac803d9192425dd69a77caf22accd824200' where cpf = '53045850898';
update employees set password_hash = 'eab8ff114cc63fd8ab3d9f42249e20b8ce5ecce463e8368e98747f03c50eeabb' where cpf = '10669239496';
update employees set password_hash = 'bc10b57514d76124b4120a34db2224067fed660b09408ade0b14b582946ff2fc' where cpf = '11409717437';
update employees set password_hash = '811af1590c16fc90322a05ab17f360939077f63f674a7e0550732a36050444ac' where cpf = '19152463770';
update employees set password_hash = 'e662316614f2be35c76b297330fc580c1af68da9a1df1e8982e5716841c39797' where cpf = '01757870423';
