-- P-07 (decisão: opção "a"). O schema prometia uma máquina de estados
-- assíncrona (status DEFAULT 'pending', error_message) que nunca existiu:
-- o motor MMM roda síncrono dentro da request e só persiste em sucesso —
-- a linha era inserida já com status='done' e error_message nunca foi
-- preenchido; nenhuma tela renderiza ou filtra por status.
--
-- Runs são síncronos: ou existem completos, ou não existem. O schema agora
-- diz isso. finished_at FICA — é gravado no insert e registra a conclusão.
--
-- Se um dia a execução virar background (datasets grandes / bootstrap
-- completo), reintroduzir o ciclo como feature: fila + polling + retry
-- (padrão pgmq + pg_cron já provado no repo do site), não só colunas.
ALTER TABLE public.runs DROP COLUMN IF EXISTS status;
ALTER TABLE public.runs DROP COLUMN IF EXISTS error_message;
