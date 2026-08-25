-- Permite marcar um dia específico como "home office" (Faltas e ajustes) — não muda o
-- cálculo de horas, só fica registrado no espelho/planilha, e libera o limitador de
-- localização (geofencing) só naquele dia, mesmo pra quem não é home office permanente.
alter table treatments drop constraint if exists treatments_kind_check;
alter table treatments add constraint treatments_kind_check check (kind in ('falta', 'inclusao', 'carga_reduzida', 'home_office'));
