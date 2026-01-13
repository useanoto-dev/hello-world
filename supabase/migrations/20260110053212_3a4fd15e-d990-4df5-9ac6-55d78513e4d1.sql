-- Clear old WhatsApp instance data so a new one can be created
UPDATE stores 
SET 
  uazapi_instance_name = NULL, 
  uazapi_instance_token = NULL, 
  whatsapp_status = 'disconnected'
WHERE id = 'd76c472f-b50d-4025-842f-1513a377d4f0';