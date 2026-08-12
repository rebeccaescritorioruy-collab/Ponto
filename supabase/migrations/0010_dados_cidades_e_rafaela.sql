-- Cria as sedes/cidades citadas e vincula cada funcionário já cadastrado à sua cidade.
-- Latitude/longitude ficam em branco por enquanto — defina em Sedes ("Usar minha localização
-- atual", estando fisicamente em cada endereço) quando quiser ativar o limitador de região
-- daquela cidade.

insert into sedes (cidade) values
  ('João Pessoa'),
  ('Recife'),
  ('São Paulo'),
  ('Bangu (RJ)'),
  ('Campo Grande (RJ)')
on conflict (cidade) do nothing;

-- Quem não foi listado explicitamente cai em João Pessoa (sede padrão da equipe).
update employees set cidade = 'João Pessoa' where cidade is null;

update employees set cidade = 'Bangu (RJ)' where cpf = '13128827788'; -- Denise Santos Godinho do Nascimento
update employees set cidade = 'Recife' where cpf = '70815091427'; -- Matheus Henrique Espindola da Silva
update employees set cidade = 'Campo Grande (RJ)' where cpf = '05984753707'; -- Monique Torres Vieira Tavares
update employees set cidade = 'Campo Grande (RJ)' where cpf = '19152463770'; -- Suzane Beatriz dos Santos Avelino
update employees set cidade = 'São Paulo' where cpf = '93774672253'; -- Roseane Novais Santos

-- Rafaela Rosario Rodrigues — nova estagiária, 6h/dia, endereço em São Paulo/SP.
-- Sem horário de entrada/saída definido ainda (só "6h" foi informado) e sem data de
-- admissão (não estava no trecho do documento) — preencha pela aba Funcionários quando tiver
-- esses dados. Senha inicial: 4 primeiros dígitos do CPF (4218), mesma convenção já usada.
insert into employees (cpf, nome, cargo, vinculo, cidade, horas_diarias, jornada_mensal_horas, ativo, password_hash)
values (
  '42181349878', 'RAFAELA ROSARIO RODRIGUES', 'Estagiária', 'estagiario', 'São Paulo',
  6, 150, true, '89c1baf80810ed35b8cc4ab4bb30da6136d5ad7d4c0442988ed519e0dd68fc5e'
)
on conflict (cpf) do nothing;
